import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EmailEncryptionUtil {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly tagLength = 16; // 128 bits
  private readonly secretKey: Buffer;

  constructor(private readonly configService: ConfigService) {
    const encryptionKey = this.configService.get<string>('EMAIL_ENCRYPTION_KEY');
    if (!encryptionKey) {
      throw new Error('EMAIL_ENCRYPTION_KEY environment variable is required');
    }
    
    // Derive a consistent key from the provided secret
    this.secretKey = crypto.scryptSync(encryptionKey, 'email-salt', this.keyLength);
  }

  /**
   * Encrypt an email address
   * @param email - The raw email address to encrypt
   * @returns The encrypted email as a base64 string
   */
  encryptEmail(email: string): string {
    if (!email || typeof email !== 'string') {
      return email;
    }

    try {
      // Generate a deterministic IV based on the email
      const emailHash = crypto.createHash('sha256').update(email).digest();
      const iv = emailHash.subarray(0, this.ivLength);
      
      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.secretKey, iv);
      cipher.setAAD(Buffer.from('email-encryption', 'utf8'));
      
      // Encrypt the email
      let encrypted = cipher.update(email, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Get the authentication tag
      const tag = cipher.getAuthTag();
      
      // Combine IV, encrypted data, and tag
      const combined = Buffer.concat([iv, Buffer.from(encrypted, 'hex'), tag]);
      
      // Return as base64
      return combined.toString('base64');
    } catch (error) {
      console.error('Error encrypting email:', error);
      return email; // Return original email if encryption fails
    }
  }

  /**
   * Decrypt an email address
   * @param encryptedEmail - The encrypted email as a base64 string
   * @returns The decrypted email address
   */
  decryptEmail(encryptedEmail: string): string {
    if (!encryptedEmail || typeof encryptedEmail !== 'string') {
      return encryptedEmail;
    }

    try {
      // Convert from base64
      const combined = Buffer.from(encryptedEmail, 'base64');
      
      // Extract IV, encrypted data, and tag
      const iv = combined.subarray(0, this.ivLength);
      const tag = combined.subarray(combined.length - this.tagLength);
      const encrypted = combined.subarray(this.ivLength, combined.length - this.tagLength);
      
      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.secretKey, iv);
      decipher.setAAD(Buffer.from('email-encryption', 'utf8'));
      decipher.setAuthTag(tag);
      
      // Decrypt the email
      let decrypted = decipher.update(encrypted, undefined, 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Error decrypting email:', error);
      return encryptedEmail; // Return original if decryption fails
    }
  }

  /**
   * Check if a string is encrypted
   * @param value - The string to check
   * @returns True if the string appears to be encrypted
   */
  isEncrypted(value: string): boolean {
    if (!value || typeof value !== 'string') {
      return false;
    }

    try {
      // Try to decode as base64 and check if it has the expected structure
      const combined = Buffer.from(value, 'base64');
      return combined.length >= this.ivLength + this.tagLength;
    } catch {
      return false;
    }
  }

  /**
   * Encrypt email if it's not already encrypted
   * @param email - The email to conditionally encrypt
   * @returns The encrypted email
   */
  encryptIfNotEncrypted(email: string): string {
    if (!email || typeof email !== 'string') {
      return email;
    }

    if (this.isEncrypted(email)) {
      return email; // Already encrypted
    }

    return this.encryptEmail(email);
  }

  /**
   * Decrypt email if it's encrypted, otherwise return as-is
   * @param email - The email to conditionally decrypt
   * @returns The decrypted email
   */
  decryptIfEncrypted(email: string): string {
    if (!email || typeof email !== 'string') {
      return email;
    }

    if (this.isEncrypted(email)) {
      return this.decryptEmail(email);
    }

    return email; // Not encrypted, return as-is
  }
}
