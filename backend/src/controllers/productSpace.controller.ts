import { Response } from 'express';
import { AuthenticatedRequest, PaginationParams } from '../types';
import prisma from '../config/database';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { logger } from '../utils/logger';
import { bedrockService } from '../services/bedrock.service';

export class ProductSpaceController {
  async getAll(req: AuthenticatedRequest, res: Response) {
    const { page = 1, limit = 20 }: PaginationParams = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const [productSpaces, total] = await Promise.all([
      prisma.productSpace.findMany({
        skip,
        take: Number(limit),
        include: {
          _count: {
            select: {
              capabilities: true,
              documents: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.productSpace.count(),
    ]);

    const productSpacesWithVendorCount = await Promise.all(
      productSpaces.map(async (ps) => {
        const vendorCount = await prisma.vendor.count({
          where: {
            responses: {
              some: {
                capability: {
                  productSpaceId: ps.id,
                },
              },
            },
          },
        });

        return {
          ...ps,
          vendorCount,
        };
      })
    );

    res.json({
      data: productSpacesWithVendorCount,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  }

  async getById(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;

    const productSpace = await prisma.productSpace.findUnique({
      where: { id },
      include: {
        capabilities: {
          include: {
            _count: {
              select: {
                vendorResponses: true,
              },
            },
          },
          orderBy: [{ category: 'asc' }, { name: 'asc' }],
        },
        documents: {
          orderBy: { uploadDate: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            capabilities: true,
            documents: true,
          },
        },
      },
    });

    if (!productSpace) {
      throw new NotFoundError('Product space not found');
    }

    const vendorCount = await prisma.vendor.count({
      where: {
        responses: {
          some: {
            capability: {
              productSpaceId: id,
            },
          },
        },
      },
    });

    res.json({
      ...productSpace,
      vendorCount,
    });
  }

  async create(req: AuthenticatedRequest, res: Response) {
    const { name, description, industry, metadata } = req.body;

    if (!name) {
      throw new BadRequestError('Name is required');
    }

    const productSpace = await prisma.productSpace.create({
      data: {
        name,
        description,
        industry,
        metadata,
      },
    });

    logger.info(`Product space created: ${productSpace.id}`);

    res.status(201).json(productSpace);
  }

  async update(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const { name, description, industry, metadata } = req.body;

    const productSpace = await prisma.productSpace.update({
      where: { id },
      data: {
        name,
        description,
        industry,
        metadata,
      },
    });

    logger.info(`Product space updated: ${productSpace.id}`);

    res.json(productSpace);
  }

  async delete(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;

    await prisma.productSpace.delete({
      where: { id },
    });

    logger.info(`Product space deleted: ${id}`);

    res.status(204).send();
  }

  async getCapabilities(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const { category } = req.query;

    const where: any = { productSpaceId: id };
    if (category) {
      where.category = category as string;
    }

    const capabilities = await prisma.capability.findMany({
      where,
      include: {
        _count: {
          select: {
            vendorResponses: true,
          },
        },
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    res.json(capabilities);
  }

  async updateCapabilities(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;

    const productSpace = await prisma.productSpace.findUnique({
      where: { id },
      include: {
        capabilities: true,
      },
    });

    if (!productSpace) {
      throw new NotFoundError('Product space not found');
    }

    const suggestions = await bedrockService.suggestCapabilityUpdates(
      productSpace.name,
      productSpace.capabilities,
      productSpace.industry || undefined
    );

    logger.info(`Generated ${suggestions.length} capability update suggestions for ${id}`);

    res.json({
      productSpaceId: id,
      suggestions,
    });
  }

  async getVendors(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;

    const vendors = await prisma.vendor.findMany({
      where: {
        responses: {
          some: {
            capability: {
              productSpaceId: id,
            },
          },
        },
      },
      include: {
        _count: {
          select: {
            responses: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json(vendors);
  }

  async getCompetitiveIntelligence(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;

    const productSpace = await prisma.productSpace.findUnique({
      where: { id },
      include: {
        capabilities: {
          include: {
            vendorResponses: {
              include: {
                vendor: true,
              },
            },
          },
          orderBy: [{ category: 'asc' }, { name: 'asc' }],
        },
      },
    });

    if (!productSpace) {
      throw new NotFoundError('Product space not found');
    }

    const vendors = await prisma.vendor.findMany({
      where: {
        responses: {
          some: {
            capability: {
              productSpaceId: id,
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const matrix = productSpace.capabilities.map((capability) => {
      const responses: Record<string, any> = {};

      vendors.forEach((vendor) => {
        const response = capability.vendorResponses.find((r) => r.vendorId === vendor.id);
        responses[vendor.id] = response
          ? {
              responseText: response.responseText,
              sentimentScore: response.sentimentScore,
              sentimentLabel: response.sentimentLabel,
              sentimentAnalysis: response.sentimentAnalysis,
            }
          : null;
      });

      return {
        capabilityId: capability.id,
        category: capability.category,
        name: capability.name,
        description: capability.description,
        importanceLevel: capability.importanceLevel,
        responses,
      };
    });

    res.json({
      productSpace: {
        id: productSpace.id,
        name: productSpace.name,
        description: productSpace.description,
      },
      vendors: vendors.map((v) => ({
        id: v.id,
        name: v.name,
        logoUrl: v.logoUrl,
        website: v.website,
      })),
      matrix,
    });
  }
}

export const productSpaceController = new ProductSpaceController();
