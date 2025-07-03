import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

export interface HashOptions {
  saltRounds?: number;
}

@Injectable()
export class BcryptUtil {
  private readonly DEFAULT_SALT_ROUNDS = 12;

  /**
   * Hash a password
   */
  async hashPassword(password: string, options?: HashOptions): Promise<string> {
    try {
      const saltRounds = options?.saltRounds || this.DEFAULT_SALT_ROUNDS;
      return await bcrypt.hash(password, saltRounds);
    } catch (error: any) {
      throw new Error(`Error hashing password: ${error.message}`);
    }
  }

  /**
   * Compare password with hash
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error: any) {
      throw new Error(`Error comparing password: ${error.message}`);
    }
  }

  /**
   * Generate a random password
   */
  generateRandomPassword(length: number = 12): string {
    const charset =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }
}
