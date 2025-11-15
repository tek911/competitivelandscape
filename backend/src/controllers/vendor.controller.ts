import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import prisma from '../config/database';
import { vendorLogoService } from '../services/vendor-logo.service';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { logger } from '../utils/logger';

export class VendorController {
  async getAll(req: AuthenticatedRequest, res: Response) {
    const vendors = await prisma.vendor.findMany({
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

  async getById(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;

    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        responses: {
          include: {
            capability: {
              include: {
                productSpace: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            responses: true,
          },
        },
      },
    });

    if (!vendor) {
      throw new NotFoundError('Vendor not found');
    }

    res.json(vendor);
  }

  async create(req: AuthenticatedRequest, res: Response) {
    const { name, website, description, metadata } = req.body;

    if (!name) {
      throw new BadRequestError('Name is required');
    }

    const existing = await prisma.vendor.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });

    if (existing) {
      throw new BadRequestError('Vendor with this name already exists');
    }

    let logoUrl: string | undefined;

    if (website) {
      try {
        const logoResult = await vendorLogoService.getVendorLogo(name, website);
        logoUrl = logoResult.url;
      } catch (error) {
        logger.warn(`Failed to fetch logo for ${name}:`, error);
      }
    }

    const vendor = await prisma.vendor.create({
      data: {
        name,
        website,
        logoUrl,
        description,
        metadata,
      },
    });

    logger.info(`Vendor created: ${vendor.id}`);

    res.status(201).json(vendor);
  }

  async update(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const { name, website, logoUrl, description, metadata } = req.body;

    const vendor = await prisma.vendor.update({
      where: { id },
      data: {
        name,
        website,
        logoUrl,
        description,
        metadata,
      },
    });

    logger.info(`Vendor updated: ${vendor.id}`);

    res.json(vendor);
  }

  async delete(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;

    await prisma.vendor.delete({
      where: { id },
    });

    logger.info(`Vendor deleted: ${id}`);

    res.status(204).send();
  }

  async refreshLogo(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;

    const vendor = await prisma.vendor.findUnique({
      where: { id },
    });

    if (!vendor) {
      throw new NotFoundError('Vendor not found');
    }

    const logoResult = await vendorLogoService.getVendorLogo(vendor.name, vendor.website || undefined);

    const updatedVendor = await prisma.vendor.update({
      where: { id },
      data: { logoUrl: logoResult.url },
    });

    logger.info(`Logo refreshed for vendor: ${vendor.name}`);

    res.json({
      vendor: updatedVendor,
      logoSource: logoResult.source,
    });
  }

  async uploadLogo(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;

    if (!req.file) {
      throw new BadRequestError('No logo file uploaded');
    }

    const logoUrl = `/uploads/logos/${req.file.filename}`;

    const vendor = await prisma.vendor.update({
      where: { id },
      data: { logoUrl },
    });

    logger.info(`Logo uploaded for vendor: ${vendor.name}`);

    res.json(vendor);
  }
}

export const vendorController = new VendorController();
