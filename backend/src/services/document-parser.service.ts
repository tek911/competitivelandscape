import * as XLSX from 'xlsx';
import { parse } from 'csv-parse/sync';
import { DocumentParseResult } from '../types';
import { logger } from '../utils/logger';
import { BadRequestError } from '../utils/errors';

export class DocumentParserService {
  async parseExcel(buffer: Buffer): Promise<DocumentParseResult> {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new BadRequestError('No sheets found in Excel file');
      }

      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const data: any[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });

      return this.parseMatrix(data);
    } catch (error) {
      logger.error('Excel parsing error:', error);
      throw new BadRequestError(`Failed to parse Excel file: ${(error as Error).message}`);
    }
  }

  async parseCSV(buffer: Buffer): Promise<DocumentParseResult> {
    try {
      const csvContent = buffer.toString('utf-8');
      const data: any[][] = parse(csvContent, {
        skip_empty_lines: true,
        trim: true,
      });

      return this.parseMatrix(data);
    } catch (error) {
      logger.error('CSV parsing error:', error);
      throw new BadRequestError(`Failed to parse CSV file: ${(error as Error).message}`);
    }
  }

  private parseMatrix(data: any[][]): DocumentParseResult {
    if (!data || data.length < 2) {
      throw new BadRequestError('File must contain at least a header row and one data row');
    }

    const headers = data[0].map((h: any) => String(h || '').trim());

    if (headers.length < 2) {
      throw new BadRequestError('File must contain at least 2 columns');
    }

    const result: DocumentParseResult = {
      productSpace: {
        name: 'Imported Product Space',
        description: 'Imported from document',
      },
      capabilities: [],
      vendors: [],
      responses: [],
    };

    const vendorColumns = this.identifyVendorColumns(headers);
    const capabilityColumnIndex = this.identifyCapabilityColumn(headers);
    const categoryColumnIndex = this.identifyCategoryColumn(headers);
    const descriptionColumnIndex = this.identifyDescriptionColumn(headers);

    const vendorNames = vendorColumns.map((col) => headers[col]);
    result.vendors = vendorNames.map((name) => ({ name }));

    const capabilities = new Map<string, any>();

    for (let rowIndex = 1; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex];

      if (!row || row.length === 0) continue;

      const capabilityName = String(row[capabilityColumnIndex] || '').trim();

      if (!capabilityName) continue;

      const category =
        categoryColumnIndex >= 0
          ? String(row[categoryColumnIndex] || 'General').trim()
          : 'General';
      const description =
        descriptionColumnIndex >= 0 ? String(row[descriptionColumnIndex] || '').trim() : '';

      if (!capabilities.has(capabilityName)) {
        capabilities.set(capabilityName, {
          category,
          name: capabilityName,
          description: description || undefined,
        });
      }

      for (let i = 0; i < vendorColumns.length; i++) {
        const vendorColumnIndex = vendorColumns[i];
        const vendorName = vendorNames[i];
        const responseText = String(row[vendorColumnIndex] || '').trim();

        if (responseText) {
          result.responses.push({
            vendorName,
            capabilityName,
            responseText,
          });
        }
      }
    }

    result.capabilities = Array.from(capabilities.values());

    if (result.capabilities.length === 0) {
      throw new BadRequestError('No capabilities found in the document');
    }

    if (result.vendors.length === 0) {
      throw new BadRequestError('No vendors found in the document');
    }

    logger.info(
      `Parsed document: ${result.capabilities.length} capabilities, ${result.vendors.length} vendors, ${result.responses.length} responses`
    );

    return result;
  }

  private identifyVendorColumns(headers: string[]): number[] {
    const vendorKeywords = ['vendor', 'supplier', 'provider', 'company', 'product'];
    const excludeKeywords = [
      'capability',
      'requirement',
      'category',
      'description',
      'importance',
      'priority',
    ];

    const vendorColumns: number[] = [];

    for (let i = 0; i < headers.length; i++) {
      const header = headers[i].toLowerCase();

      const isExcluded = excludeKeywords.some((keyword) => header.includes(keyword));
      if (isExcluded) continue;

      const isVendor = vendorKeywords.some((keyword) => header.includes(keyword));

      if (isVendor || (i > 0 && !this.isMetadataColumn(header))) {
        vendorColumns.push(i);
      }
    }

    if (vendorColumns.length === 0 && headers.length > 1) {
      for (let i = 1; i < headers.length; i++) {
        if (!this.isMetadataColumn(headers[i].toLowerCase())) {
          vendorColumns.push(i);
        }
      }
    }

    return vendorColumns;
  }

  private identifyCapabilityColumn(headers: string[]): number {
    const capabilityKeywords = [
      'capability',
      'requirement',
      'feature',
      'function',
      'criteria',
      'name',
    ];

    for (let i = 0; i < headers.length; i++) {
      const header = headers[i].toLowerCase();
      if (capabilityKeywords.some((keyword) => header.includes(keyword))) {
        return i;
      }
    }

    return 0;
  }

  private identifyCategoryColumn(headers: string[]): number {
    const categoryKeywords = ['category', 'group', 'section', 'type', 'area'];

    for (let i = 0; i < headers.length; i++) {
      const header = headers[i].toLowerCase();
      if (categoryKeywords.some((keyword) => header.includes(keyword))) {
        return i;
      }
    }

    return -1;
  }

  private identifyDescriptionColumn(headers: string[]): number {
    const descriptionKeywords = ['description', 'details', 'notes', 'comment'];

    for (let i = 0; i < headers.length; i++) {
      const header = headers[i].toLowerCase();
      if (descriptionKeywords.some((keyword) => header.includes(keyword))) {
        return i;
      }
    }

    return -1;
  }

  private isMetadataColumn(header: string): boolean {
    const metadataKeywords = [
      'category',
      'description',
      'importance',
      'priority',
      'notes',
      'comments',
      'id',
      'index',
      'number',
    ];
    return metadataKeywords.some((keyword) => header.includes(keyword));
  }

  async parseDocument(file: Express.Multer.File): Promise<DocumentParseResult> {
    const extension = file.originalname.split('.').pop()?.toLowerCase();

    if (extension === 'csv') {
      return this.parseCSV(file.buffer);
    } else if (['xlsx', 'xls', 'ods'].includes(extension || '')) {
      return this.parseExcel(file.buffer);
    } else {
      throw new BadRequestError('Unsupported file format. Please upload Excel or CSV files.');
    }
  }
}

export const documentParserService = new DocumentParserService();
