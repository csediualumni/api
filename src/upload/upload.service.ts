import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly endpointUrl: string;

  constructor(private readonly config: ConfigService) {
    this.endpointUrl = this.config.get<string>('AWS_ENDPOINT_URL')!;
    this.bucket = this.config.get<string>('AWS_S3_BUCKET_NAME')!;

    this.s3 = new S3Client({
      region: this.config.get<string>('AWS_DEFAULT_REGION') ?? 'auto',
      endpoint: this.endpointUrl,
      forcePathStyle: false,
      credentials: {
        accessKeyId: this.config.get<string>('AWS_ACCESS_KEY_ID')!,
        secretAccessKey: this.config.get<string>('AWS_SECRET_ACCESS_KEY')!,
      },
    });
  }

  /**
   * Uploads a file buffer to S3-compatible storage and returns its public URL.
   * @param buffer   Raw file bytes
   * @param mimetype MIME type (e.g. "image/jpeg")
   * @param ext      File extension without leading dot (e.g. "jpg")
   * @param prefix   Key prefix / folder (default: "uploads")
   */
  async uploadFile(
    buffer: Buffer,
    mimetype: string,
    ext: string,
    prefix = 'uploads',
  ): Promise<string> {
    const key = `${prefix}/${uuidv4()}.${ext}`;

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: mimetype,
          ACL: 'public-read',
        }),
      );
    } catch (err) {
      console.error('S3 upload error:', err);
      throw new InternalServerErrorException(
        'Failed to upload file to storage',
      );
    }

    // Tigris virtual-hosted URL: https://<bucket>.<host>/<key>
    const endpointHost = new URL(this.endpointUrl).host;
    return `https://${this.bucket}.${endpointHost}/${key}`;
  }
}
