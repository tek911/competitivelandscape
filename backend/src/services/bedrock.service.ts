import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelCommandInput,
} from '@aws-sdk/client-bedrock-runtime';
import { SentimentAnalysisResult, CapabilityUpdateSuggestion } from '../types';
import { logger } from '../utils/logger';
import { CacheService } from '../config/redis';
import { encryptionService } from '../utils/encryption';
import prisma from '../config/database';

export class BedrockService {
  private client: BedrockRuntimeClient | null = null;
  private modelId: string;
  private cache: CacheService;

  constructor() {
    this.modelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0';
    this.cache = CacheService.getInstance();
    this.initializeClient();
  }

  private async initializeClient() {
    try {
      const config = await this.getBedrockConfig();
      if (config) {
        this.client = new BedrockRuntimeClient({
          region: config.region,
          credentials: {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
          },
        });
        logger.info('Bedrock client initialized successfully');
      }
    } catch (error) {
      logger.error('Failed to initialize Bedrock client:', error);
    }
  }

  private async getBedrockConfig() {
    try {
      const configs = await prisma.systemConfig.findMany({
        where: {
          key: {
            in: ['aws_region', 'aws_access_key_id', 'aws_secret_access_key', 'bedrock_model_id'],
          },
        },
      });

      const configMap = new Map(configs.map((c) => [c.key, c]));

      const region = configMap.get('aws_region');
      const accessKeyId = configMap.get('aws_access_key_id');
      const secretAccessKey = configMap.get('aws_secret_access_key');
      const modelId = configMap.get('bedrock_model_id');

      if (!region || !accessKeyId || !secretAccessKey) {
        return null;
      }

      return {
        region: region.value,
        accessKeyId: accessKeyId.encrypted
          ? encryptionService.decrypt(accessKeyId.value)
          : accessKeyId.value,
        secretAccessKey: secretAccessKey.encrypted
          ? encryptionService.decrypt(secretAccessKey.value)
          : secretAccessKey.value,
        modelId: modelId?.value || this.modelId,
      };
    } catch (error) {
      logger.error('Failed to get Bedrock config:', error);
      return null;
    }
  }

  private async invokeClaude(prompt: string, systemPrompt?: string): Promise<string> {
    if (!this.client) {
      await this.initializeClient();
      if (!this.client) {
        throw new Error('Bedrock client not initialized. Please configure AWS credentials.');
      }
    }

    const messages = [
      {
        role: 'user',
        content: prompt,
      },
    ];

    const payload = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 4000,
      messages,
      ...(systemPrompt && { system: systemPrompt }),
      temperature: 0.7,
    };

    const input: InvokeModelCommandInput = {
      modelId: this.modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload),
    };

    const command = new InvokeModelCommand(input);
    const response = await this.client.send(command);

    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    return responseBody.content[0].text;
  }

  async analyzeSentiment(
    capabilityName: string,
    capabilityDescription: string,
    vendorResponse: string,
    vendorName: string
  ): Promise<SentimentAnalysisResult> {
    const cacheKey = `sentiment:${encryptionService.hash(
      `${capabilityName}:${vendorResponse}:${vendorName}`
    )}`;

    const cached = await this.cache.get<SentimentAnalysisResult>(cacheKey);
    if (cached) {
      logger.debug('Returning cached sentiment analysis');
      return cached;
    }

    const systemPrompt = `You are an expert analyst evaluating vendor responses to capability requirements in enterprise software evaluations.
Your task is to analyze vendor responses and determine if they genuinely address the capability or are vague, misleading, or non-responsive.`;

    const prompt = `Analyze the following vendor response to a capability requirement:

Capability: ${capabilityName}
Description: ${capabilityDescription || 'Not provided'}
Vendor: ${vendorName}
Response: ${vendorResponse}

Evaluate this response and provide:
1. A sentiment score from -1.0 (very negative/misleading) to 1.0 (very positive/comprehensive)
2. A label: POSITIVE, NEUTRAL, NEGATIVE, MISLEADING, VAGUE, or MISSING
3. A brief explanation of your assessment
4. A confidence score from 0.0 to 1.0

Respond ONLY with valid JSON in this exact format:
{
  "score": <number between -1.0 and 1.0>,
  "label": "<one of: POSITIVE, NEUTRAL, NEGATIVE, MISLEADING, VAGUE, MISSING>",
  "explanation": "<your explanation>",
  "confidence": <number between 0.0 and 1.0>
}`;

    try {
      const responseText = await this.invokeClaude(prompt, systemPrompt);

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format from Claude');
      }

      const result: SentimentAnalysisResult = JSON.parse(jsonMatch[0]);

      await this.cache.set(cacheKey, result, 86400); // Cache for 24 hours

      return result;
    } catch (error) {
      logger.error('Sentiment analysis failed:', error);
      return {
        score: 0,
        label: 'NEUTRAL',
        explanation: 'Analysis failed - manual review required',
        confidence: 0,
      };
    }
  }

  async suggestCapabilityUpdates(
    productSpaceName: string,
    capabilities: Array<{ id: string; name: string; description: string | null; category: string }>,
    industry?: string
  ): Promise<CapabilityUpdateSuggestion[]> {
    const cacheKey = `capability-updates:${encryptionService.hash(
      `${productSpaceName}:${capabilities.map((c) => c.id).join(',')}`
    )}`;

    const cached = await this.cache.get<CapabilityUpdateSuggestion[]>(cacheKey);
    if (cached) {
      logger.debug('Returning cached capability update suggestions');
      return cached;
    }

    const systemPrompt = `You are an expert in enterprise software capabilities and industry trends.
Your task is to review capability definitions and suggest improvements based on current industry standards and best practices.`;

    const capabilitiesList = capabilities
      .map(
        (c, i) =>
          `${i + 1}. [ID: ${c.id}] ${c.name} (Category: ${c.category})
   Description: ${c.description || 'Not provided'}`
      )
      .join('\n\n');

    const prompt = `Review the following capabilities for a ${productSpaceName} product space${
      industry ? ` in the ${industry} industry` : ''
    }:

${capabilitiesList}

For each capability, determine if it needs updating based on:
- Current industry terminology and standards
- Clarity and specificity of the description
- Alignment with modern best practices
- Completeness of the capability definition

Respond ONLY with valid JSON array in this exact format:
[
  {
    "capabilityId": "<capability ID>",
    "suggestedName": "<new name if applicable, otherwise omit>",
    "suggestedDescription": "<improved description if applicable, otherwise omit>",
    "reasoning": "<explanation of suggested changes>",
    "confidence": <number between 0.0 and 1.0>
  }
]

Only include capabilities that need updates. If no updates are needed, return an empty array.`;

    try {
      const responseText = await this.invokeClaude(prompt, systemPrompt);

      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Invalid response format from Claude');
      }

      const suggestions: CapabilityUpdateSuggestion[] = JSON.parse(jsonMatch[0]);

      await this.cache.set(cacheKey, suggestions, 3600); // Cache for 1 hour

      return suggestions;
    } catch (error) {
      logger.error('Capability update suggestion failed:', error);
      return [];
    }
  }

  async batchAnalyzeSentiments(
    analyses: Array<{
      capabilityName: string;
      capabilityDescription: string;
      vendorResponse: string;
      vendorName: string;
    }>
  ): Promise<SentimentAnalysisResult[]> {
    const results: SentimentAnalysisResult[] = [];

    for (const analysis of analyses) {
      try {
        const result = await this.analyzeSentiment(
          analysis.capabilityName,
          analysis.capabilityDescription,
          analysis.vendorResponse,
          analysis.vendorName
        );
        results.push(result);

        // Rate limiting - add a small delay between requests
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        logger.error('Batch sentiment analysis error:', error);
        results.push({
          score: 0,
          label: 'NEUTRAL',
          explanation: 'Analysis failed',
          confidence: 0,
        });
      }
    }

    return results;
  }

  async updateConfig(
    region: string,
    accessKeyId: string,
    secretAccessKey: string,
    modelId?: string
  ) {
    await prisma.systemConfig.upsert({
      where: { key: 'aws_region' },
      create: { key: 'aws_region', value: region },
      update: { value: region },
    });

    await prisma.systemConfig.upsert({
      where: { key: 'aws_access_key_id' },
      create: {
        key: 'aws_access_key_id',
        value: encryptionService.encrypt(accessKeyId),
        encrypted: true,
      },
      update: {
        value: encryptionService.encrypt(accessKeyId),
        encrypted: true,
      },
    });

    await prisma.systemConfig.upsert({
      where: { key: 'aws_secret_access_key' },
      create: {
        key: 'aws_secret_access_key',
        value: encryptionService.encrypt(secretAccessKey),
        encrypted: true,
      },
      update: {
        value: encryptionService.encrypt(secretAccessKey),
        encrypted: true,
      },
    });

    if (modelId) {
      await prisma.systemConfig.upsert({
        where: { key: 'bedrock_model_id' },
        create: { key: 'bedrock_model_id', value: modelId },
        update: { value: modelId },
      });
      this.modelId = modelId;
    }

    await this.initializeClient();
  }
}

export const bedrockService = new BedrockService();
