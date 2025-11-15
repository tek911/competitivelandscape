import axios from 'axios';
import { VendorLogoResult } from '../types';
import { logger } from '../utils/logger';
import { CacheService } from '../config/redis';
import crypto from 'crypto';

export class VendorLogoService {
  private cache: CacheService;
  private clearbitApiKey: string | null;
  private googleApiKey: string | null;
  private googleSearchEngineId: string | null;

  constructor() {
    this.cache = CacheService.getInstance();
    this.clearbitApiKey = process.env.CLEARBIT_API_KEY || null;
    this.googleApiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY || null;
    this.googleSearchEngineId = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID || null;
  }

  async getVendorLogo(vendorName: string, website?: string): Promise<VendorLogoResult> {
    const cacheKey = `vendor-logo:${crypto
      .createHash('md5')
      .update(vendorName.toLowerCase())
      .digest('hex')}`;

    const cached = await this.cache.get<VendorLogoResult>(cacheKey);
    if (cached) {
      logger.debug(`Returning cached logo for ${vendorName}`);
      return { ...cached, cached: true };
    }

    let result: VendorLogoResult;

    try {
      if (website) {
        result = await this.fetchFromClearbit(website);
      } else {
        result = await this.fetchFromGoogle(vendorName);
      }
    } catch (error) {
      logger.warn(`Failed to fetch logo for ${vendorName}:`, error);
      result = this.getPlaceholderLogo(vendorName);
    }

    await this.cache.set(cacheKey, result, 2592000); // Cache for 30 days

    return { ...result, cached: false };
  }

  private async fetchFromClearbit(website: string): Promise<VendorLogoResult> {
    try {
      const domain = this.extractDomain(website);
      const url = `https://logo.clearbit.com/${domain}`;

      const response = await axios.head(url, {
        timeout: 5000,
        validateStatus: (status) => status === 200,
      });

      if (response.status === 200) {
        logger.info(`Found logo via Clearbit: ${url}`);
        return {
          url,
          source: 'clearbit',
          cached: false,
        };
      }

      throw new Error('Logo not found');
    } catch (error) {
      logger.debug('Clearbit logo fetch failed, trying Google');
      throw error;
    }
  }

  private async fetchFromGoogle(vendorName: string): Promise<VendorLogoResult> {
    if (!this.googleApiKey || !this.googleSearchEngineId) {
      throw new Error('Google API credentials not configured');
    }

    try {
      const query = `${vendorName} logo`;
      const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(
        query
      )}&cx=${this.googleSearchEngineId}&searchType=image&key=${this.googleApiKey}&num=1`;

      const response = await axios.get(url, { timeout: 10000 });

      if (response.data.items && response.data.items.length > 0) {
        const logoUrl = response.data.items[0].link;
        logger.info(`Found logo via Google: ${logoUrl}`);
        return {
          url: logoUrl,
          source: 'google',
          cached: false,
        };
      }

      throw new Error('No results from Google');
    } catch (error) {
      logger.debug('Google logo fetch failed');
      throw error;
    }
  }

  private extractDomain(website: string): string {
    try {
      const url = website.startsWith('http') ? website : `https://${website}`;
      const domain = new URL(url).hostname;
      return domain.replace('www.', '');
    } catch {
      return website.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    }
  }

  private getPlaceholderLogo(vendorName: string): VendorLogoResult {
    const initial = vendorName.charAt(0).toUpperCase();
    const color = this.getColorFromString(vendorName);

    const url = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      initial
    )}&background=${color}&color=fff&size=200&bold=true`;

    return {
      url,
      source: 'placeholder',
      cached: false,
    };
  }

  private getColorFromString(str: string): string {
    const colors = [
      '1abc9c',
      '2ecc71',
      '3498db',
      '9b59b6',
      '34495e',
      'f39c12',
      'e74c3c',
      'e67e22',
      '16a085',
      '27ae60',
    ];

    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  }

  async batchFetchLogos(
    vendors: Array<{ name: string; website?: string }>
  ): Promise<Map<string, VendorLogoResult>> {
    const results = new Map<string, VendorLogoResult>();

    for (const vendor of vendors) {
      try {
        const result = await this.getVendorLogo(vendor.name, vendor.website);
        results.set(vendor.name, result);

        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        logger.error(`Failed to fetch logo for ${vendor.name}:`, error);
        results.set(vendor.name, this.getPlaceholderLogo(vendor.name));
      }
    }

    return results;
  }
}

export const vendorLogoService = new VendorLogoService();
