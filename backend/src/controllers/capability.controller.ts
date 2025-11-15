import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import prisma from '../config/database';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { logger } from '../utils/logger';
import { ImportanceLevel } from '@prisma/client';

export class CapabilityController {
  async getAll(req: AuthenticatedRequest, res: Response) {
    const { productSpaceId, category } = req.query;

    const where: any = {};
    if (productSpaceId) where.productSpaceId = productSpaceId as string;
    if (category) where.category = category as string;

    const capabilities = await prisma.capability.findMany({
      where,
      include: {
        productSpace: {
          select: {
            id: true,
            name: true,
          },
        },
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

  async getById(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;

    const capability = await prisma.capability.findUnique({
      where: { id },
      include: {
        productSpace: true,
        vendorResponses: {
          include: {
            vendor: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!capability) {
      throw new NotFoundError('Capability not found');
    }

    res.json(capability);
  }

  async create(req: AuthenticatedRequest, res: Response) {
    const { productSpaceId, category, name, description, importanceLevel, metadata } = req.body;

    if (!productSpaceId || !category || !name) {
      throw new BadRequestError('productSpaceId, category, and name are required');
    }

    const productSpace = await prisma.productSpace.findUnique({
      where: { id: productSpaceId },
    });

    if (!productSpace) {
      throw new NotFoundError('Product space not found');
    }

    const capability = await prisma.capability.create({
      data: {
        productSpaceId,
        category,
        name,
        description,
        importanceLevel: importanceLevel || ImportanceLevel.MEDIUM,
        metadata,
      },
    });

    logger.info(`Capability created: ${capability.id}`);

    res.status(201).json(capability);
  }

  async update(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const { category, name, description, importanceLevel, metadata } = req.body;

    const capability = await prisma.capability.update({
      where: { id },
      data: {
        category,
        name,
        description,
        importanceLevel,
        metadata,
      },
    });

    logger.info(`Capability updated: ${capability.id}`);

    res.json(capability);
  }

  async delete(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;

    await prisma.capability.delete({
      where: { id },
    });

    logger.info(`Capability deleted: ${id}`);

    res.status(204).send();
  }

  async getResponses(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;

    const responses = await prisma.vendorResponse.findMany({
      where: { capabilityId: id },
      include: {
        vendor: true,
        capability: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(responses);
  }

  async bulkCreate(req: AuthenticatedRequest, res: Response) {
    const { productSpaceId, capabilities } = req.body;

    if (!productSpaceId || !Array.isArray(capabilities) || capabilities.length === 0) {
      throw new BadRequestError('productSpaceId and capabilities array are required');
    }

    const productSpace = await prisma.productSpace.findUnique({
      where: { id: productSpaceId },
    });

    if (!productSpace) {
      throw new NotFoundError('Product space not found');
    }

    const created = await prisma.capability.createMany({
      data: capabilities.map((cap) => ({
        productSpaceId,
        category: cap.category,
        name: cap.name,
        description: cap.description,
        importanceLevel: cap.importanceLevel || ImportanceLevel.MEDIUM,
        metadata: cap.metadata,
      })),
    });

    logger.info(`Bulk created ${created.count} capabilities`);

    res.status(201).json({ count: created.count });
  }

  async bulkUpdate(req: AuthenticatedRequest, res: Response) {
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      throw new BadRequestError('updates array is required');
    }

    const results = await Promise.all(
      updates.map(async (update) => {
        const { id, ...data } = update;
        return prisma.capability.update({
          where: { id },
          data,
        });
      })
    );

    logger.info(`Bulk updated ${results.length} capabilities`);

    res.json(results);
  }
}

export const capabilityController = new CapabilityController();
