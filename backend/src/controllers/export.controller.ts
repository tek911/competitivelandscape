import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { exportService } from '../services/export.service';
import { BadRequestError } from '../utils/errors';
import { logger } from '../utils/logger';

export class ExportController {
  async exportMatrix(req: AuthenticatedRequest, res: Response) {
    const { productSpaceId } = req.params;
    const {
      format = 'excel',
      includeMetadata = true,
      includeSentiment = true,
      selectedCapabilities,
      selectedVendors,
    } = req.body;

    if (!['excel', 'csv'].includes(format)) {
      throw new BadRequestError('Invalid format. Use "excel" or "csv"');
    }

    logger.info(`Exporting ${format} for product space: ${productSpaceId}`);

    if (format === 'excel') {
      const buffer = await exportService.exportToExcel(productSpaceId, {
        format: 'excel',
        includeMetadata,
        includeSentiment,
        selectedCapabilities,
        selectedVendors,
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=capabilities-matrix-${Date.now()}.xlsx`);
      res.send(buffer);
    } else {
      const csv = await exportService.exportToCSV(productSpaceId, {
        format: 'csv',
        includeMetadata,
        includeSentiment,
        selectedCapabilities,
        selectedVendors,
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=capabilities-matrix-${Date.now()}.csv`);
      res.send(csv);
    }
  }

  async exportRFI(req: AuthenticatedRequest, res: Response) {
    const { productSpaceId } = req.params;
    const { selectedCapabilities = [] } = req.body;

    logger.info(`Exporting RFI for product space: ${productSpaceId}`);

    const buffer = await exportService.exportRFI(productSpaceId, selectedCapabilities);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=rfi-${Date.now()}.xlsx`);
    res.send(buffer);
  }
}

export const exportController = new ExportController();
