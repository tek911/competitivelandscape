import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { bedrockService } from '../services/bedrock.service';
import prisma from '../config/database';
import { encryptionService } from '../utils/encryption';
import { BadRequestError } from '../utils/errors';
import { logger } from '../utils/logger';

export class SettingsController {
  async getBedrockConfig(req: AuthenticatedRequest, res: Response) {
    const configs = await prisma.systemConfig.findMany({
      where: {
        key: {
          in: ['aws_region', 'bedrock_model_id'],
        },
      },
    });

    const configMap: Record<string, string> = {};
    configs.forEach((config) => {
      configMap[config.key] = config.value;
    });

    const hasCredentials = await prisma.systemConfig.findFirst({
      where: {
        key: 'aws_access_key_id',
      },
    });

    res.json({
      region: configMap.aws_region || '',
      modelId: configMap.bedrock_model_id || 'anthropic.claude-3-sonnet-20240229-v1:0',
      configured: !!hasCredentials,
    });
  }

  async updateBedrockConfig(req: AuthenticatedRequest, res: Response) {
    const { region, accessKeyId, secretAccessKey, modelId } = req.body;

    if (!region || !accessKeyId || !secretAccessKey) {
      throw new BadRequestError('region, accessKeyId, and secretAccessKey are required');
    }

    await bedrockService.updateConfig(region, accessKeyId, secretAccessKey, modelId);

    logger.info('Bedrock configuration updated');

    res.json({
      message: 'Bedrock configuration updated successfully',
      region,
      modelId: modelId || 'anthropic.claude-3-sonnet-20240229-v1:0',
    });
  }

  async testBedrockConnection(req: AuthenticatedRequest, res: Response) {
    try {
      const result = await bedrockService.analyzeSentiment(
        'Test Capability',
        'This is a test capability',
        'Yes, we support this feature',
        'Test Vendor'
      );

      res.json({
        success: true,
        message: 'Bedrock connection successful',
        testResult: result,
      });
    } catch (error) {
      logger.error('Bedrock connection test failed:', error);
      res.status(500).json({
        success: false,
        message: 'Bedrock connection failed',
        error: (error as Error).message,
      });
    }
  }

  async getAllSettings(req: AuthenticatedRequest, res: Response) {
    const settings = await prisma.systemConfig.findMany({
      select: {
        id: true,
        key: true,
        value: true,
        encrypted: true,
        description: true,
        updatedAt: true,
      },
    });

    const sanitizedSettings = settings.map((setting) => ({
      ...setting,
      value: setting.encrypted ? '********' : setting.value,
    }));

    res.json(sanitizedSettings);
  }

  async updateSetting(req: AuthenticatedRequest, res: Response) {
    const { key, value, encrypted = false, description } = req.body;

    if (!key || !value) {
      throw new BadRequestError('key and value are required');
    }

    const finalValue = encrypted ? encryptionService.encrypt(value) : value;

    const setting = await prisma.systemConfig.upsert({
      where: { key },
      create: {
        key,
        value: finalValue,
        encrypted,
        description,
      },
      update: {
        value: finalValue,
        encrypted,
        description,
      },
    });

    logger.info(`Setting updated: ${key}`);

    res.json({
      ...setting,
      value: encrypted ? '********' : setting.value,
    });
  }

  async deleteSetting(req: AuthenticatedRequest, res: Response) {
    const { key } = req.params;

    await prisma.systemConfig.delete({
      where: { key },
    });

    logger.info(`Setting deleted: ${key}`);

    res.status(204).send();
  }
}

export const settingsController = new SettingsController();
