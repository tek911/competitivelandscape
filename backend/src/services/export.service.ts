import * as XLSX from 'xlsx';
import { ExportOptions } from '../types';
import { logger } from '../utils/logger';
import prisma from '../config/database';

export class ExportService {
  async exportToExcel(
    productSpaceId: string,
    options: ExportOptions = { format: 'excel' }
  ): Promise<Buffer> {
    try {
      const productSpace = await prisma.productSpace.findUnique({
        where: { id: productSpaceId },
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
        throw new Error('Product space not found');
      }

      const vendors = await prisma.vendor.findMany({
        where: {
          responses: {
            some: {
              capability: {
                productSpaceId,
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      });

      const filteredVendors = options.selectedVendors
        ? vendors.filter((v) => options.selectedVendors?.includes(v.id))
        : vendors;

      const filteredCapabilities = options.selectedCapabilities
        ? productSpace.capabilities.filter((c) => options.selectedCapabilities?.includes(c.id))
        : productSpace.capabilities;

      const headers = [
        'Category',
        'Capability',
        ...(options.includeMetadata ? ['Description', 'Importance'] : []),
        ...filteredVendors.map((v) => v.name),
      ];

      const data: any[][] = [headers];

      for (const capability of filteredCapabilities) {
        const row: any[] = [capability.category, capability.name];

        if (options.includeMetadata) {
          row.push(capability.description || '', capability.importanceLevel);
        }

        for (const vendor of filteredVendors) {
          const response = capability.vendorResponses.find((r) => r.vendorId === vendor.id);

          let cellValue = response?.responseText || '';

          if (options.includeSentiment && response?.sentimentLabel) {
            cellValue += ` [${response.sentimentLabel}]`;
          }

          row.push(cellValue);
        }

        data.push(row);
      }

      const worksheet = XLSX.utils.aoa_to_sheet(data);

      const columnWidths = headers.map((header, i) => {
        if (i === 0) return { wch: 20 }; // Category
        if (i === 1) return { wch: 30 }; // Capability
        if (options.includeMetadata && (i === 2 || i === 3)) return { wch: 40 }; // Description/Importance
        return { wch: 25 }; // Vendor columns
      });

      worksheet['!cols'] = columnWidths;

      const headerRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!worksheet[cellAddress]) continue;

        worksheet[cellAddress].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: '4472C4' } },
          alignment: { horizontal: 'center', vertical: 'center' },
        };
      }

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Capabilities Matrix');

      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      logger.info(`Exported Excel for product space: ${productSpace.name}`);

      return excelBuffer;
    } catch (error) {
      logger.error('Export to Excel failed:', error);
      throw error;
    }
  }

  async exportRFI(productSpaceId: string, selectedCapabilities: string[]): Promise<Buffer> {
    try {
      const productSpace = await prisma.productSpace.findUnique({
        where: { id: productSpaceId },
        include: {
          capabilities: {
            where: selectedCapabilities.length > 0 ? { id: { in: selectedCapabilities } } : {},
            orderBy: [{ category: 'asc' }, { name: 'asc' }],
          },
        },
      });

      if (!productSpace) {
        throw new Error('Product space not found');
      }

      const headers = ['#', 'Category', 'Capability', 'Description', 'Response'];
      const data: any[][] = [headers];

      productSpace.capabilities.forEach((capability, index) => {
        data.push([
          index + 1,
          capability.category,
          capability.name,
          capability.description || '',
          '',
        ]);
      });

      const worksheet = XLSX.utils.aoa_to_sheet(data);

      worksheet['!cols'] = [
        { wch: 5 },
        { wch: 20 },
        { wch: 35 },
        { wch: 50 },
        { wch: 40 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'RFI');

      const metadataSheet = XLSX.utils.aoa_to_sheet([
        ['Product Space', productSpace.name],
        ['Description', productSpace.description || ''],
        ['Industry', productSpace.industry || ''],
        ['Generated Date', new Date().toISOString()],
      ]);

      XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Information');

      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      logger.info(`Exported RFI for product space: ${productSpace.name}`);

      return excelBuffer;
    } catch (error) {
      logger.error('Export RFI failed:', error);
      throw error;
    }
  }

  async exportToCSV(productSpaceId: string, options: ExportOptions = { format: 'csv' }): Promise<string> {
    const buffer = await this.exportToExcel(productSpaceId, options);
    const workbook = XLSX.read(buffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_csv(worksheet);
  }
}

export const exportService = new ExportService();
