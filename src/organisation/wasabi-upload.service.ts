import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';
import { S3 } from 'aws-sdk';
import * as sharp from 'sharp';

@Injectable()
export class WasabiUploadService {
  private readonly logger = new Logger(WasabiUploadService.name);
  private s3Client: S3;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    // Initialize Wasabi S3 client using ConfigService (same as onboarding.service.ts)
    const wasabiEndpoint = this.configService.get<string>('WASABI_ENDPOINT');
    const wasabiAccessKey = this.configService.get<string>('WASABI_ACCESS_KEY_ID');
    const wasabiSecretKey = this.configService.get<string>('WASABI_SECRET_ACCESS_KEY');
    const wasabiRegion = this.configService.get<string>('WASABI_REGION') || 'us-east-1';
    this.bucketName = this.configService.get<string>('WASABI_BUCKET_NAME');

    this.logger.log('🔑 Wasabi Config Check:');
    this.logger.log(`  - Endpoint: ${wasabiEndpoint}`);
    this.logger.log(`  - Access Key: ${wasabiAccessKey ? '***' + wasabiAccessKey.slice(-4) : 'NOT FOUND'}`);
    this.logger.log(`  - Bucket: ${this.bucketName}`);
    this.logger.log(`  - Region: ${wasabiRegion}`);

    if (!wasabiAccessKey || !wasabiSecretKey || !this.bucketName) {
      this.logger.error('❌ Wasabi credentials not found in environment variables');
      throw new Error('Wasabi credentials not configured. Please check WASABI_ACCESS_KEY_ID, WASABI_SECRET_ACCESS_KEY, and WASABI_BUCKET_NAME in .env');
    }

    // Use same S3 initialization as onboarding.service.ts
    this.s3Client = new S3({
      endpoint: wasabiEndpoint,
      accessKeyId: wasabiAccessKey,
      secretAccessKey: wasabiSecretKey,
      region: wasabiRegion,
    });

    this.logger.log('✅ Wasabi S3 client initialized successfully');
  }

  /**
   * Upload organization logo to Wasabi with WebP optimization
   * @param file - The file to upload
   * @param organizationId - The organization ID
   * @returns Object with original and WebP URLs
   */
  async uploadOrganizationLogo(file: Express.Multer.File, organizationId: string): Promise<{originalUrl: string, webpUrl: string, objectKey: string}> {
    try {
      this.logger.log(`📤 Uploading organization logo for org: ${organizationId}`);
      
      const timestamp = Date.now();
      const fileExtension = file.originalname.split('.').pop();
      const objectKey = `organizationLogo/${organizationId}-${timestamp}.${fileExtension}`;
      const webpObjectKey = `organizationLogo/${organizationId}-${timestamp}.webp`;

      // Upload original file
      const uploadParams: AWS.S3.PutObjectRequest = {
        Bucket: this.bucketName,
        Key: objectKey,
        Body: file.buffer,
        ContentType: file.mimetype,
        CacheControl: 'public, max-age=31536000', // 1 year cache
        ACL: 'public-read', // Make it publicly accessible
      };

      await this.s3Client.putObject(uploadParams).promise();

      // Convert to WebP and upload
      const webpBuffer = await this.convertToWebP(file.buffer, file.mimetype);
      const webpUploadParams: AWS.S3.PutObjectRequest = {
        Bucket: this.bucketName,
        Key: webpObjectKey,
        Body: webpBuffer,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000',
        ACL: 'public-read',
      };

      await this.s3Client.putObject(webpUploadParams).promise();

      const originalUrl = `https://${this.bucketName}.s3.us-east-1.wasabisys.com/${objectKey}`;
      const webpUrl = `https://${this.bucketName}.s3.us-east-1.wasabisys.com/${webpObjectKey}`;
      
      this.logger.log(`✅ Organization logo uploaded successfully - Original: ${originalUrl}, WebP: ${webpUrl}`);

      return {
        originalUrl,
        webpUrl,
        objectKey: webpObjectKey // Return WebP key as primary
      };
    } catch (error) {
      this.logger.error(`❌ Failed to upload organization logo: ${error.message}`);
      throw new Error(`Failed to upload organization logo: ${error.message}`);
    }
  }

  /**
   * Upload profile/avatar logo to Wasabi with WebP optimization
   * @param file - The file to upload
   * @param adminId - The admin ID
   * @returns Object with original and WebP URLs
   */
  async uploadProfileLogo(file: Express.Multer.File, adminId: string): Promise<{originalUrl: string, webpUrl: string, objectKey: string}> {
    try {
      this.logger.log(`📤 Uploading profile logo for admin: ${adminId}`);
      
      const timestamp = Date.now();
      const fileExtension = file.originalname.split('.').pop();
      const objectKey = `profileLogo/${adminId}-${timestamp}.${fileExtension}`;
      const webpObjectKey = `profileLogo/${adminId}-${timestamp}.webp`;

      // Upload original file
      const uploadParams: AWS.S3.PutObjectRequest = {
        Bucket: this.bucketName,
        Key: objectKey,
        Body: file.buffer,
        ContentType: file.mimetype,
        CacheControl: 'public, max-age=31536000', // 1 year cache
        ACL: 'public-read', // Make it publicly accessible
      };

      await this.s3Client.putObject(uploadParams).promise();

      // Convert to WebP and upload
      const webpBuffer = await this.convertToWebP(file.buffer, file.mimetype);
      const webpUploadParams: AWS.S3.PutObjectRequest = {
        Bucket: this.bucketName,
        Key: webpObjectKey,
        Body: webpBuffer,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000',
        ACL: 'public-read',
      };

      await this.s3Client.putObject(webpUploadParams).promise();

      const originalUrl = `https://${this.bucketName}.s3.us-east-1.wasabisys.com/${objectKey}`;
      const webpUrl = `https://${this.bucketName}.s3.us-east-1.wasabisys.com/${webpObjectKey}`;
      
      this.logger.log(`✅ Profile logo uploaded successfully - Original: ${originalUrl}, WebP: ${webpUrl}`);

      return {
        originalUrl,
        webpUrl,
        objectKey: webpObjectKey // Return WebP key as primary
      };
    } catch (error) {
      this.logger.error(`❌ Failed to upload profile logo: ${error.message}`);
      throw new Error(`Failed to upload profile logo: ${error.message}`);
    }
  }

  /**
   * Convert image buffer to WebP format
   * @param buffer - Image buffer
   * @param mimeType - Original MIME type
   * @returns WebP buffer
   */
  private async convertToWebP(buffer: Buffer, mimeType: string): Promise<Buffer> {
    try {
      // Only convert if it's an image
      if (!mimeType.startsWith('image/')) {
        throw new Error('File is not an image');
      }

      const webpBuffer = await sharp(buffer)
        .resize(300, 300, { 
          fit: 'cover', 
          position: 'center' 
        })
        .webp({ 
          quality: 85,
          effort: 4 
        })
        .toBuffer();

      this.logger.log(`✅ Image converted to WebP - Original: ${buffer.length} bytes, WebP: ${webpBuffer.length} bytes`);
      return webpBuffer;
    } catch (error) {
      this.logger.error(`❌ Failed to convert image to WebP: ${error.message}`);
      throw new Error(`Failed to convert image to WebP: ${error.message}`);
    }
  }

  /**
   * Generate signed URL for profile logo
   * @param objectKey - The object key in Wasabi
   * @param expiresIn - Expiration time in seconds (default: 1 hour)
   * @returns Signed URL
   */
  async getProfileLogoSignedUrl(objectKey: string, expiresIn: number = 3600): Promise<string> {
    try {
      const signedUrl = this.s3Client.getSignedUrl('getObject', {
        Bucket: this.bucketName,
        Key: objectKey,
        Expires: expiresIn,
      });

      this.logger.log(`✅ Generated signed URL for profile logo: ${objectKey}`);
      return signedUrl;
    } catch (error) {
      this.logger.error(`❌ Failed to generate signed URL: ${error.message}`);
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  }

  /**
   * Generate signed URL for organization logo
   * @param objectKey - The object key in Wasabi
   * @param expiresIn - Expiration time in seconds (default: 1 hour)
   * @returns Signed URL
   */
  async getOrganizationLogoSignedUrl(objectKey: string, expiresIn: number = 3600): Promise<string> {
    try {
      const signedUrl = this.s3Client.getSignedUrl('getObject', {
        Bucket: this.bucketName,
        Key: objectKey,
        Expires: expiresIn,
      });

      this.logger.log(`✅ Generated signed URL for organization logo: ${objectKey}`);
      return signedUrl;
    } catch (error) {
      this.logger.error(`❌ Failed to generate signed URL: ${error.message}`);
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  }

  /**
   * Delete a file from Wasabi
   * @param fileUrl - The full Wasabi URL of the file
   */
  async deleteFile(fileUrl: string): Promise<void> {
    try {
      // Extract object key from URL
      const objectKey = fileUrl.split('.com/')[1];
      
      if (!objectKey) {
        throw new Error('Invalid file URL');
      }

      await this.s3Client.deleteObject({
        Bucket: this.bucketName,
        Key: objectKey,
      }).promise();

      this.logger.log(`✅ File deleted from Wasabi: ${objectKey}`);
    } catch (error) {
      this.logger.error(`❌ Failed to delete file from Wasabi: ${error.message}`);
      // Don't throw error - deletion failure shouldn't block operations
    }
  }
}
