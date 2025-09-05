import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import { execSync } from 'child_process';

@Injectable()
export class LibreOfficeDetectorService {
  private readonly logger = new Logger(LibreOfficeDetectorService.name);
  private cachedPath: string | null = null;

  constructor(private configService: ConfigService) {}

  async findLibreOffice(): Promise<string | null> {
    // Return cached path if available
    if (this.cachedPath) {
      return this.cachedPath;
    }

    // Check environment override
    const envPath = this.configService.get<string>('conversion.libreOfficePath');
    if (envPath && fs.existsSync(envPath)) {
      this.logger.log(`Using LibreOffice from environment: ${envPath}`);
      this.cachedPath = envPath;
      return envPath;
    }

    // Platform-specific detection
    const platform = process.platform;
    let possiblePaths: string[] = [];

    switch (platform) {
      case 'win32':
        possiblePaths = [
          'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
          'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
          'C:\\ProgramData\\chocolatey\\lib\\libreoffice-fresh\\tools\\LibreOffice\\program\\soffice.exe',
        ];
        break;

      case 'darwin':
        possiblePaths = [
          '/Applications/LibreOffice.app/Contents/MacOS/soffice',
          '/usr/local/bin/soffice',
          '/opt/homebrew/bin/soffice',
        ];
        break;

      case 'linux':
        possiblePaths = [
          '/usr/bin/soffice',
          '/usr/bin/libreoffice',
          '/usr/local/bin/soffice',
          '/opt/libreoffice/program/soffice',
          '/snap/bin/libreoffice',
          '/flatpak/exports/bin/org.libreoffice.LibreOffice',
        ];
        break;
    }

    // Check each possible path
    for (const path of possiblePaths) {
      if (fs.existsSync(path)) {
        this.logger.log(`Found LibreOffice at: ${path}`);
        this.cachedPath = path;
        return path;
      }
    }

    // Try to find in PATH
    try {
      const command = platform === 'win32' ? 'where soffice' : 'which soffice';
      const stdout = execSync(command, { encoding: 'utf8' });
      const pathFromPATH = stdout.trim().split('\n')[0];

      if (pathFromPATH && fs.existsSync(pathFromPATH)) {
        this.logger.log(`Found LibreOffice in PATH: ${pathFromPATH}`);
        this.cachedPath = pathFromPATH;
        return pathFromPATH;
      }
    } catch (error) {
      // Command not found in PATH
    }

    this.logger.error('LibreOffice not found on this system');
    return null;
  }

  async validateLibreOffice(): Promise<boolean> {
    const path = await this.findLibreOffice();
    if (!path) return false;

    try {
      execSync(`"${path}" --version`, { timeout: 5000, stdio: 'pipe' });
      return true;
    } catch (error) {
      this.logger.error('LibreOffice validation failed:', error.message);
      return false;
    }
  }

  /**
   * Validates LibreOffice is available and throws error if not found
   * Used for startup validation
   */
  async validateLibreOfficeOrThrow(): Promise<string> {
    const path = await this.findLibreOffice();
    if (!path) {
      throw new Error(
        'LibreOffice not found on this system. Please install LibreOffice to enable PPT to PDF conversion. ' +
        'Visit https://www.libreoffice.org/download/ for installation instructions.'
      );
    }

    const isValid = await this.validateLibreOffice();
    if (!isValid) {
      throw new Error(
        'LibreOffice is installed but not working properly. This might be due to a timeout or permission issue. ' +
        'You can skip this validation by setting REQUIRE_LIBREOFFICE=false in your environment variables.'
      );
    }

    this.logger.log(`✅ LibreOffice validated successfully at: ${path}`);
    return path;
  }
}
