import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

export class EncryptionService {
  private key: Buffer;

  constructor(secretKey?: string) {
    const key = secretKey || process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
    this.key = crypto.scryptSync(key, 'salt', KEY_LENGTH);
  }

  encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = crypto.pbkdf2Sync(this.key, salt, ITERATIONS, KEY_LENGTH, 'sha512');

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    return [
      salt.toString('hex'),
      iv.toString('hex'),
      tag.toString('hex'),
      encrypted,
    ].join(':');
  }

  decrypt(encryptedData: string): string {
    const parts = encryptedData.split(':');

    if (parts.length !== 4) {
      throw new Error('Invalid encrypted data format');
    }

    const [saltHex, ivHex, tagHex, encrypted] = parts;

    const salt = Buffer.from(saltHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');

    const key = crypto.pbkdf2Sync(this.key, salt, ITERATIONS, KEY_LENGTH, 'sha512');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  hash(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  compareHash(text: string, hash: string): boolean {
    const textHash = this.hash(text);
    return crypto.timingSafeEqual(Buffer.from(textHash), Buffer.from(hash));
  }
}

export const encryptionService = new EncryptionService();
