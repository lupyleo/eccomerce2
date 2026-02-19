import { AppError } from '@/lib/errors';

export interface UploadResult {
  url: string;
  key: string;
}

export interface StorageService {
  generatePresignedUploadUrl(key: string, contentType: string): Promise<string>;
  generatePresignedDownloadUrl(key: string): Promise<string>;
  deleteFile(key: string): Promise<void>;
  getPublicUrl(key: string): string;
}

export class S3StorageService implements StorageService {
  private readonly bucket: string;
  private readonly region: string;
  private readonly endpoint: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET ?? 'ecommerce';
    this.region = process.env.S3_REGION ?? 'ap-northeast-2';
    this.endpoint = process.env.S3_ENDPOINT ?? `https://s3.${this.region}.amazonaws.com`;
  }

  async generatePresignedUploadUrl(key: string, _contentType: string): Promise<string> {
    // In production, use AWS SDK to generate presigned URLs
    // For now, return a mock URL for development
    if (process.env.NODE_ENV === 'production') {
      throw new AppError('NOT_IMPLEMENTED', 'S3 presigned URL 생성은 AWS SDK 설정이 필요합니다.');
    }

    // Mock: MinIO endpoint for development
    const minioEndpoint = process.env.MINIO_ENDPOINT ?? 'http://localhost:9000';
    return `${minioEndpoint}/${this.bucket}/${key}?upload=presigned`;
  }

  async generatePresignedDownloadUrl(key: string): Promise<string> {
    if (process.env.NODE_ENV === 'production') {
      throw new AppError('NOT_IMPLEMENTED', 'S3 presigned URL 생성은 AWS SDK 설정이 필요합니다.');
    }

    const minioEndpoint = process.env.MINIO_ENDPOINT ?? 'http://localhost:9000';
    return `${minioEndpoint}/${this.bucket}/${key}`;
  }

  async deleteFile(_key: string): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new AppError('NOT_IMPLEMENTED', 'S3 삭제는 AWS SDK 설정이 필요합니다.');
    }
    // Mock: No-op in development
  }

  getPublicUrl(key: string): string {
    const cdnUrl = process.env.CDN_URL;
    if (cdnUrl) {
      return `${cdnUrl}/${key}`;
    }
    return `${this.endpoint}/${this.bucket}/${key}`;
  }
}

export class StorageServiceFactory {
  private static instance: StorageService | null = null;

  static create(): StorageService {
    if (!this.instance) {
      this.instance = new S3StorageService();
    }
    return this.instance;
  }
}
