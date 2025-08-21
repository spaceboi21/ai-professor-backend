import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { EmailEncryptionUtil } from '../src/common/utils/email-encryption.util';
import { EmailEncryptionService } from '../src/common/services/email-encryption.service';

describe('Email Encryption', () => {
  let emailEncryptionUtil: EmailEncryptionUtil;
  let emailEncryptionService: EmailEncryptionService;

  beforeAll(async () => {
    // Set up test environment
    process.env.EMAIL_ENCRYPTION_KEY = 'test-encryption-key-for-testing-purposes-only';

    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot()],
      providers: [EmailEncryptionUtil, EmailEncryptionService],
    }).compile();

    emailEncryptionUtil = module.get<EmailEncryptionUtil>(EmailEncryptionUtil);
    emailEncryptionService = module.get<EmailEncryptionService>(EmailEncryptionService);
  });

  describe('EmailEncryptionUtil', () => {
    it('should encrypt and decrypt email correctly', () => {
      const testEmail = 'test@example.com';
      
      // Encrypt the email
      const encryptedEmail = emailEncryptionUtil.encryptEmail(testEmail);
      
      // Verify it's encrypted
      expect(encryptedEmail).not.toBe(testEmail);
      expect(emailEncryptionUtil.isEncrypted(encryptedEmail)).toBe(true);
      
      // Decrypt the email
      const decryptedEmail = emailEncryptionUtil.decryptEmail(encryptedEmail);
      
      // Verify it matches the original
      expect(decryptedEmail).toBe(testEmail);
    });

    it('should handle conditional encryption correctly', () => {
      const testEmail = 'test@example.com';
      
      // Test encryptIfNotEncrypted with unencrypted email
      const encrypted1 = emailEncryptionUtil.encryptIfNotEncrypted(testEmail);
      expect(encrypted1).not.toBe(testEmail);
      expect(emailEncryptionUtil.isEncrypted(encrypted1)).toBe(true);
      
      // Test encryptIfNotEncrypted with already encrypted email
      const encrypted2 = emailEncryptionUtil.encryptIfNotEncrypted(encrypted1);
      expect(encrypted2).toBe(encrypted1);
      
      // Test decryptIfEncrypted with encrypted email
      const decrypted1 = emailEncryptionUtil.decryptIfEncrypted(encrypted1);
      expect(decrypted1).toBe(testEmail);
      
      // Test decryptIfEncrypted with unencrypted email
      const decrypted2 = emailEncryptionUtil.decryptIfEncrypted(testEmail);
      expect(decrypted2).toBe(testEmail);
    });

    it('should handle edge cases', () => {
      // Test with null/undefined
      expect(emailEncryptionUtil.encryptEmail(null as any)).toBe(null);
      expect(emailEncryptionUtil.encryptEmail(undefined as any)).toBe(undefined);
      expect(emailEncryptionUtil.decryptEmail(null as any)).toBe(null);
      expect(emailEncryptionUtil.decryptEmail(undefined as any)).toBe(undefined);
      
      // Test with empty string
      expect(emailEncryptionUtil.encryptEmail('')).toBe('');
      expect(emailEncryptionUtil.decryptEmail('')).toBe('');
      
      // Test isEncrypted with invalid input
      expect(emailEncryptionUtil.isEncrypted(null as any)).toBe(false);
      expect(emailEncryptionUtil.isEncrypted(undefined as any)).toBe(false);
      expect(emailEncryptionUtil.isEncrypted('')).toBe(false);
      expect(emailEncryptionUtil.isEncrypted('not-base64')).toBe(false);
    });
  });

  describe('EmailEncryptionService', () => {
    it('should encrypt email fields in documents', () => {
      const testDoc = {
        name: 'Test User',
        email: 'test@example.com',
        otherField: 'value'
      };
      
      const encryptedDoc = emailEncryptionService.encryptEmailFields(testDoc, ['email']);
      
      expect(encryptedDoc.email).not.toBe(testDoc.email);
      expect(emailEncryptionUtil.isEncrypted(encryptedDoc.email)).toBe(true);
      expect(encryptedDoc.name).toBe(testDoc.name);
      expect(encryptedDoc.otherField).toBe(testDoc.otherField);
    });

    it('should decrypt email fields in documents', () => {
      const testEmail = 'test@example.com';
      const encryptedEmail = emailEncryptionUtil.encryptEmail(testEmail);
      
      const testDoc = {
        name: 'Test User',
        email: encryptedEmail,
        otherField: 'value'
      };
      
      const decryptedDoc = emailEncryptionService.decryptEmailFields(testDoc, ['email']);
      
      expect(decryptedDoc.email).toBe(testEmail);
      expect(decryptedDoc.name).toBe(testDoc.name);
      expect(decryptedDoc.otherField).toBe(testDoc.otherField);
    });

    it('should encrypt emails in queries', () => {
      const testQuery = {
        email: 'test@example.com',
        status: 'active'
      };
      
      const encryptedQuery = emailEncryptionService.encryptEmailInQuery(testQuery, ['email']);
      
      expect(encryptedQuery.email).not.toBe(testQuery.email);
      expect(emailEncryptionUtil.isEncrypted(encryptedQuery.email)).toBe(true);
      expect(encryptedQuery.status).toBe(testQuery.status);
    });

    it('should encrypt emails in update operations', () => {
      const testUpdate = {
        $set: {
          email: 'new@example.com',
          status: 'updated'
        }
      };
      
      const encryptedUpdate = emailEncryptionService.encryptEmailInUpdate(testUpdate, ['email']);
      
      expect(encryptedUpdate.$set.email).not.toBe(testUpdate.$set.email);
      expect(emailEncryptionUtil.isEncrypted(encryptedUpdate.$set.email)).toBe(true);
      expect(encryptedUpdate.$set.status).toBe(testUpdate.$set.status);
    });
  });
});
