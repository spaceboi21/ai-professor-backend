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
  generateStrongPassword(length: number = 12): string {
    const upperCase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowerCase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()-_=+[]{}|;:,.<>?';

    // Ensure password includes at least one of each type
    const getRandom = (str: string) =>
      str[Math.floor(Math.random() * str.length)];

    if (length < 8) {
      throw new Error(
        'Password length should be at least 8 characters for strength',
      );
    }

    let password = [
      getRandom(upperCase),
      getRandom(lowerCase),
      getRandom(numbers),
      getRandom(symbols),
    ];

    const allChars = upperCase + lowerCase + numbers + symbols;

    for (let i = password.length; i < length; i++) {
      password.push(getRandom(allChars));
    }

    // Shuffle the password to avoid predictable order
    password = password.sort(() => Math.random() - 0.5);

    return password.join('');
  }
}
