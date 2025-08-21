import { Injectable } from '@nestjs/common';
import { EmailEncryptionService } from 'src/common/services/email-encryption.service';

@Injectable()
export class EncryptionService {
  constructor(private readonly emailEncryptionService: EmailEncryptionService) {}

  /**
   * Encrypt a string using the same algorithm as email encryption
   * @param text - The text to encrypt
   * @returns Encrypted string
   */
  encryptString(text: string): string {
    if (!text) {
      return text;
    }
    return this.emailEncryptionService.encryptEmail(text);
  }

  /**
   * Decrypt a string using the same algorithm as email decryption
   * @param encryptedText - The encrypted text to decrypt
   * @returns Decrypted string
   */
  decryptString(encryptedText: string): string {
    if (!encryptedText) {
      return encryptedText;
    }
    return this.emailEncryptionService.decryptEmail(encryptedText);
  }

  /**
   * Check if a string appears to be encrypted
   * @param text - The text to check
   * @returns True if the text appears to be encrypted
   */
  isEncrypted(text: string): boolean {
    if (!text) {
      return false;
    }
    return this.emailEncryptionService.isEncrypted(text);
  }

  /**
   * Safely encrypt a string (only if not already encrypted)
   * @param text - The text to encrypt
   * @returns Encrypted string (or original if already encrypted)
   */
  safeEncryptString(text: string): string {
    if (!text) {
      return text;
    }
    return this.emailEncryptionService.encryptEmail(text);
  }

  /**
   * Safely decrypt a string (only if encrypted)
   * @param text - The text to decrypt
   * @returns Decrypted string (or original if not encrypted)
   */
  safeDecryptString(text: string): string {
    if (!text) {
      return text;
    }
    return this.emailEncryptionService.decryptEmail(text);
  }
}
