import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { UploadFolders } from 'src/common/types/upload-folders.type';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UploadService {
  private readonly s3Client: S3Client;

  constructor(private readonly configService: ConfigService) {
    if (this.configService.get('NODE_ENV') === 'production') {
      this.s3Client = new S3Client({
        region: this.configService.get('AWS_REGION'),
        credentials: {
          accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID')!,
          secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY')!,
        },
      });
    }
  }

  async generateS3UploadUrl(
    folder: UploadFolders,
    fileName: string,
    mimeType: string,
  ) {
    const key = `${folder}/${randomUUID()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: this.configService.get('AWS_S3_BUCKET_NAME')!,
      Key: key,
      ContentType: mimeType,
    });

    const url = await getSignedUrl(this.s3Client, command, {
      expiresIn: 60 * 5,
    });
    return {
      uploadUrl: url,
      fileUrl: `https://${this.configService.get('AWS_S3_BUCKET_NAME')}.s3.amazonaws.com/${key}`,
    };
  }
}
