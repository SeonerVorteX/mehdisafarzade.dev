import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
    DeleteObjectCommand,
    GetObjectCommand,
    HeadObjectCommand,
    PutObjectCommand,
    S3Client,
    type HeadObjectCommandOutput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3 } from '../../constants/env';
import { BaseLoggerService } from '../logger/logger.service';

/**
 * S3 access (Examination's S3Service, trimmed to what the media pipeline needs).
 * The bucket is private: browsers upload via presigned PUT and read via
 * short-lived presigned GET. `S3_ENDPOINT` + `S3_FORCE_PATH_STYLE` point it at
 * SeaweedFS (portfolio-s3-dev) in dev. Without S3 config (dev/test), media calls fail with 503
 * instead of crashing boot.
 */
@Injectable()
export class S3Service {
    private readonly client: S3Client | null;

    constructor(private readonly logger: BaseLoggerService) {
        this.logger.setContext(S3Service.name);
        this.client = S3.configured
            ? new S3Client({
                  region: S3.region,
                  endpoint: S3.endpoint,
                  forcePathStyle: S3.forcePathStyle,
                  credentials: { accessKeyId: S3.accessKeyId, secretAccessKey: S3.secretAccessKey },
              })
            : null;
        if (!this.client) this.logger.warn('S3 is not configured: media endpoints will return 503');
    }

    get configured(): boolean {
        return this.client !== null;
    }

    private get s3(): S3Client {
        if (!this.client) throw new ServiceUnavailableException('i18n:error.SERVICE_UNAVAILABLE');
        return this.client;
    }

    presignPut(key: string, contentType: string, contentLength: number, expiresIn = 300): Promise<string> {
        return getSignedUrl(
            this.s3,
            new PutObjectCommand({
                Bucket: S3.bucket,
                Key: key,
                ContentType: contentType,
                ContentLength: contentLength,
            }),
            { expiresIn },
        );
    }

    presignGet(key: string, expiresIn = 600): Promise<string> {
        return getSignedUrl(this.s3, new GetObjectCommand({ Bucket: S3.bucket, Key: key }), { expiresIn });
    }

    head(key: string): Promise<HeadObjectCommandOutput> {
        return this.s3.send(new HeadObjectCommand({ Bucket: S3.bucket, Key: key }));
    }

    /** Reads the first `bytes` of an object (magic-byte sniffing without downloading it all). */
    async readHead(key: string, bytes = 4100): Promise<Buffer> {
        const res = await this.s3.send(
            new GetObjectCommand({ Bucket: S3.bucket, Key: key, Range: `bytes=0-${bytes - 1}` }),
        );
        const body = await res.Body?.transformToByteArray();
        return Buffer.from(body ?? []);
    }

    async getObject(key: string): Promise<Buffer> {
        const res = await this.s3.send(new GetObjectCommand({ Bucket: S3.bucket, Key: key }));
        return Buffer.from((await res.Body?.transformToByteArray()) ?? []);
    }

    async putObject(key: string, body: Buffer, contentType: string): Promise<void> {
        await this.s3.send(
            new PutObjectCommand({
                Bucket: S3.bucket,
                Key: key,
                Body: body,
                ContentType: contentType,
                CacheControl: 'public, max-age=31536000, immutable',
            }),
        );
    }

    async delete(key: string): Promise<void> {
        await this.s3.send(new DeleteObjectCommand({ Bucket: S3.bucket, Key: key }));
    }
}
