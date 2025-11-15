import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import prisma from '../config/database';
import { documentParserService } from '../services/document-parser.service';
import { bedrockService } from '../services/bedrock.service';
import { vendorLogoService } from '../services/vendor-logo.service';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';
import { DocumentType, ImportanceLevel } from '@prisma/client';

export class DocumentController {
  async upload(req: AuthenticatedRequest, res: Response) {
    if (!req.file) {
      throw new BadRequestError('No file uploaded');
    }

    const { productSpaceId, autoAnalyze = 'true' } = req.body;

    logger.info(`Processing document upload: ${req.file.originalname}`);

    const parseResult = await documentParserService.parseDocument(req.file);

    let productSpace;

    if (productSpaceId) {
      productSpace = await prisma.productSpace.findUnique({
        where: { id: productSpaceId },
      });

      if (!productSpace) {
        throw new NotFoundError('Product space not found');
      }
    } else {
      productSpace = await prisma.productSpace.create({
        data: {
          name: parseResult.productSpace.name,
          description: parseResult.productSpace.description,
          industry: parseResult.productSpace.industry,
        },
      });

      logger.info(`Created new product space: ${productSpace.id}`);
    }

    const document = await prisma.document.create({
      data: {
        productSpaceId: productSpace.id,
        userId: req.user?.id,
        type: DocumentType.CAPABILITY_MATRIX,
        filename: `${Date.now()}-${req.file.originalname}`,
        originalName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        metadata: {
          capabilityCount: parseResult.capabilities.length,
          vendorCount: parseResult.vendors.length,
          responseCount: parseResult.responses.length,
        },
      },
    });

    const vendorMap = new Map<string, string>();
    for (const vendorData of parseResult.vendors) {
      let vendor = await prisma.vendor.findFirst({
        where: { name: { equals: vendorData.name, mode: 'insensitive' } },
      });

      if (!vendor) {
        vendor = await prisma.vendor.create({
          data: {
            name: vendorData.name,
            website: vendorData.website,
          },
        });

        if (vendorData.website) {
          try {
            const logoResult = await vendorLogoService.getVendorLogo(
              vendorData.name,
              vendorData.website
            );
            await prisma.vendor.update({
              where: { id: vendor.id },
              data: { logoUrl: logoResult.url },
            });
          } catch (error) {
            logger.warn(`Failed to fetch logo for ${vendorData.name}:`, error);
          }
        }
      }

      vendorMap.set(vendorData.name, vendor.id);
    }

    const capabilityMap = new Map<string, string>();
    for (const capData of parseResult.capabilities) {
      const importanceLevel =
        capData.importanceLevel &&
        Object.values(ImportanceLevel).includes(capData.importanceLevel as ImportanceLevel)
          ? (capData.importanceLevel as ImportanceLevel)
          : ImportanceLevel.MEDIUM;

      const capability = await prisma.capability.create({
        data: {
          productSpaceId: productSpace.id,
          category: capData.category,
          name: capData.name,
          description: capData.description,
          importanceLevel,
        },
      });

      capabilityMap.set(capData.name, capability.id);
    }

    let analyzedCount = 0;
    for (const responseData of parseResult.responses) {
      const vendorId = vendorMap.get(responseData.vendorName);
      const capabilityId = capabilityMap.get(responseData.capabilityName);

      if (!vendorId || !capabilityId) {
        logger.warn(
          `Skipping response - vendor or capability not found: ${responseData.vendorName} / ${responseData.capabilityName}`
        );
        continue;
      }

      const capability = parseResult.capabilities.find((c) => c.name === responseData.capabilityName);

      let sentimentData = null;

      if (autoAnalyze === 'true') {
        try {
          const sentiment = await bedrockService.analyzeSentiment(
            responseData.capabilityName,
            capability?.description || '',
            responseData.responseText,
            responseData.vendorName
          );

          sentimentData = {
            sentimentScore: sentiment.score,
            sentimentLabel: sentiment.label,
            sentimentAnalysis: sentiment.explanation,
            confidence: sentiment.confidence,
          };

          analyzedCount++;
        } catch (error) {
          logger.error('Sentiment analysis failed:', error);
        }
      }

      await prisma.vendorResponse.create({
        data: {
          vendorId,
          capabilityId,
          documentId: document.id,
          responseText: responseData.responseText,
          ...sentimentData,
        },
      });
    }

    logger.info(
      `Document processed: ${parseResult.capabilities.length} capabilities, ${parseResult.vendors.length} vendors, ${parseResult.responses.length} responses${
        autoAnalyze === 'true' ? `, ${analyzedCount} analyzed` : ''
      }`
    );

    res.status(201).json({
      document,
      productSpace,
      stats: {
        capabilities: parseResult.capabilities.length,
        vendors: parseResult.vendors.length,
        responses: parseResult.responses.length,
        analyzed: analyzedCount,
      },
    });
  }

  async getAll(req: AuthenticatedRequest, res: Response) {
    const { productSpaceId, type } = req.query;

    const where: any = {};
    if (productSpaceId) where.productSpaceId = productSpaceId as string;
    if (type) where.type = type as DocumentType;

    const documents = await prisma.document.findMany({
      where,
      include: {
        productSpace: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { uploadDate: 'desc' },
    });

    res.json(documents);
  }

  async getById(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        productSpace: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        responses: {
          include: {
            vendor: true,
            capability: true,
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    res.json(document);
  }

  async delete(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;

    await prisma.document.delete({
      where: { id },
    });

    logger.info(`Document deleted: ${id}`);

    res.status(204).send();
  }
}

export const documentController = new DocumentController();
