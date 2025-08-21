import {
  Controller,
  Post,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RoleGuard } from 'src/common/guards/roles.guard';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { Roles } from 'src/common/decorators/roles.decorator';
import { EncryptStringDto } from './dto/encrypt-string.dto';
import { EncryptionResponseDto } from './dto/encryption-response.dto';
import { EncryptionService } from './encryption.service';
import { DecryptStringDto } from './dto/decrypt-string.dto';

@ApiTags('Encryption')
@ApiBearerAuth()
@Controller('encryption')
@UseGuards(JwtAuthGuard, RoleGuard)
export class EncryptionController {
  constructor(private readonly encryptionService: EncryptionService) {}

  @Post('encrypt')
  @Roles(RoleEnum.SUPER_ADMIN)
  @ApiOperation({ 
    summary: 'Encrypt a string manually',
    description: 'Encrypt any string using the same encryption algorithm used for emails. Super Admin only.'
  })
  @ApiBody({ type: EncryptStringDto })
  @ApiResponse({
    status: 200,
    description: 'String encrypted successfully',
    type: EncryptionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async encryptString(@Body() encryptDto: EncryptStringDto): Promise<EncryptionResponseDto> {
    if (!encryptDto.text || encryptDto.text.trim() === '') {
      throw new BadRequestException('Text to encrypt is required');
    }

    const encryptedText = this.encryptionService.encryptString(encryptDto.text);
    
    return {
      success: true,
      originalText: encryptDto.text,
      encryptedText,
      message: 'String encrypted successfully',
    };
  }

  @Post('decrypt')
  @Roles(RoleEnum.SUPER_ADMIN)
  @ApiOperation({ 
    summary: 'Decrypt an encrypted string manually',
    description: 'Decrypt a previously encrypted string. Super Admin only.'
  })
  @ApiBody({ type: DecryptStringDto })
  @ApiResponse({
    status: 200,
    description: 'String decrypted successfully',
    type: EncryptionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input or decryption failed' })
  async decryptString(@Body() decryptDto: DecryptStringDto): Promise<EncryptionResponseDto> {
    if (!decryptDto.encryptedText || decryptDto.encryptedText.trim() === '') {
      throw new BadRequestException('Encrypted text to decrypt is required');
    }

    try {
      const decryptedText = this.encryptionService.decryptString(decryptDto.encryptedText);
      
      return {
        success: true,
        originalText: decryptedText,
        encryptedText: decryptDto.encryptedText,
        message: 'String decrypted successfully',
      };
    } catch (error) {
      throw new BadRequestException('Failed to decrypt the string. The text may not be encrypted or the encryption key may be different.');
    }
  }

  @Post('check-encrypted')
  @Roles(RoleEnum.SUPER_ADMIN)
  @ApiOperation({ 
    summary: 'Check if a string is encrypted',
    description: 'Check whether a string appears to be encrypted using the current encryption algorithm. Super Admin only.'
  })
  @ApiBody({ type: DecryptStringDto })
  @ApiResponse({
    status: 200,
    description: 'Encryption status checked successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        isEncrypted: { type: 'boolean' },
        text: { type: 'string' },
        message: { type: 'string' },
      },
    },
  })
  async checkIfEncrypted(@Body() checkDto: DecryptStringDto): Promise<{
    success: boolean;
    isEncrypted: boolean;
    text: string;
    message: string;
  }> {
    if (!checkDto.encryptedText || checkDto.encryptedText.trim() === '') {
      throw new BadRequestException('Text to check is required');
    }

    const isEncrypted = this.encryptionService.isEncrypted(checkDto.encryptedText);
    
    return {
      success: true,
      isEncrypted,
      text: checkDto.encryptedText,
      message: isEncrypted 
        ? 'The text appears to be encrypted' 
        : 'The text does not appear to be encrypted',
    };
  }
}
