import { Injectable } from '@nestjs/common';
import { EmailEncryptionUtil } from '../utils/email-encryption.util';

@Injectable()
export class EmailEncryptionService {
  constructor(private readonly emailEncryptionUtil: EmailEncryptionUtil) {}

  /**
   * Encrypt email fields in a document before saving to database
   */
  encryptEmailFields<T extends Record<string, any>>(document: T, emailFields: string[]): T {
    const encryptedDoc = { ...document } as T;
    
    for (const field of emailFields) {
      if (encryptedDoc[field] && typeof encryptedDoc[field] === 'string') {
        (encryptedDoc as any)[field] = this.emailEncryptionUtil.encryptIfNotEncrypted(encryptedDoc[field] as string);
      }
    }
    
    return encryptedDoc;
  }

  /**
   * Decrypt email fields in a document after retrieving from database
   */
  decryptEmailFields<T extends Record<string, any>>(document: T, emailFields: string[]): T {
    const decryptedDoc = { ...document } as T;
    
    for (const field of emailFields) {
      if (decryptedDoc[field] && typeof decryptedDoc[field] === 'string') {
        (decryptedDoc as any)[field] = this.emailEncryptionUtil.decryptIfEncrypted(decryptedDoc[field] as string);
      }
    }
    
    return decryptedDoc;
  }

  /**
   * Decrypt email fields in an array of documents
   */
  decryptEmailFieldsArray<T extends Record<string, any>>(documents: T[], emailFields: string[]): T[] {
    return documents.map(doc => this.decryptEmailFields(doc, emailFields));
  }

  /**
   * Encrypt email in a query filter for finding documents by email
   */
  encryptEmailInQuery(query: Record<string, any>, emailFields: string[]): Record<string, any> {
    const encryptedQuery = { ...query };
    
    for (const field of emailFields) {
      if (encryptedQuery[field] && typeof encryptedQuery[field] === 'string') {
        encryptedQuery[field] = this.emailEncryptionUtil.encryptIfNotEncrypted(encryptedQuery[field]);
      }
    }
    
    return encryptedQuery;
  }

  /**
   * Encrypt email fields in an update operation
   */
  encryptEmailInUpdate(update: Record<string, any>, emailFields: string[]): Record<string, any> {
    const encryptedUpdate = { ...update };
    
    // Handle $set operations
    if (encryptedUpdate.$set) {
      for (const field of emailFields) {
        if (encryptedUpdate.$set[field] && typeof encryptedUpdate.$set[field] === 'string') {
          encryptedUpdate.$set[field] = this.emailEncryptionUtil.encryptIfNotEncrypted(encryptedUpdate.$set[field]);
        }
      }
    }
    
    // Handle direct field updates
    for (const field of emailFields) {
      if (encryptedUpdate[field] && typeof encryptedUpdate[field] === 'string') {
        encryptedUpdate[field] = this.emailEncryptionUtil.encryptIfNotEncrypted(encryptedUpdate[field]);
      }
    }
    
    return encryptedUpdate;
  }

  /**
   * Check if a string is encrypted
   */
  isEncrypted(value: string): boolean {
    return this.emailEncryptionUtil.isEncrypted(value);
  }

  /**
   * Encrypt a single email
   */
  encryptEmail(email: string): string {
    return this.emailEncryptionUtil.encryptEmail(email);
  }

  /**
   * Decrypt a single email
   */
  decryptEmail(email: string): string {
    return this.emailEncryptionUtil.decryptEmail(email);
  }
}
