/**
 * Email validation utility functions
 */
export class EmailUtil {
  /**
   * Validates email format using regex
   * @param email - Email address to validate
   * @returns boolean - True if email is valid, false otherwise
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Normalizes email address (converts to lowercase and trims whitespace)
   * @param email - Email address to normalize
   * @returns string - Normalized email address
   */
  static normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  /**
   * Validates and normalizes email address
   * @param email - Email address to validate and normalize
   * @returns { isValid: boolean, normalizedEmail?: string } - Validation result and normalized email
   */
  static validateAndNormalizeEmail(email: string): {
    isValid: boolean;
    normalizedEmail?: string;
  } {
    if (!email || typeof email !== 'string') {
      return { isValid: false };
    }

    const normalizedEmail = this.normalizeEmail(email);

    if (!this.isValidEmail(normalizedEmail)) {
      return { isValid: false };
    }

    return { isValid: true, normalizedEmail };
  }
}
