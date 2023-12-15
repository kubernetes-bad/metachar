import ReadableStream from 'node:stream';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import { curly } from 'node-libcurl';
import _ from 'lodash';

@Injectable()
export default class S3Service {
  private readonly minioClient;
  private readonly s3FileEndpoint: string;
  private readonly s3FileEndpointPort;
  private readonly s3FileBucket;
  constructor(private readonly config: ConfigService) {
    this.s3FileEndpoint = config.get<string>('s3.endpoint', 's3.us-east-2.amazonaws.com');
    this.s3FileBucket = config.get<string>('s3.bucket', 'metachar');
    if (this.s3FileEndpoint.includes(':')) {
      const [host, port] = this.s3FileEndpoint.split(':');
      this.s3FileEndpoint = host;
      this.s3FileEndpointPort = Number(port);
    } else this.s3FileEndpointPort = 443;

    const accessKeyFromEnv = config.get<string>(
      'AWS_FILES_S3_ACCESS_KEY',
      process.env.AWS_S3_ACCESS_KEY || '',
    );
    const secretKeyFromEnv = config.get<string>(
      'AWS_FILES_S3_KEY_SECRET',
      process.env.AWS_S3_KEY_SECRET || '',
    );

    this.minioClient = new Client({
      endPoint: this.s3FileEndpoint,
      port: this.s3FileEndpointPort,
      useSSL: this.s3FileEndpointPort === 443,
      accessKey: accessKeyFromEnv,
      secretKey: secretKeyFromEnv,
    });
  }

  async uploadFile(buffer: Buffer, filename: string, mimeType = 'image/png') {
    return this.minioClient.putObject(this.s3FileBucket, filename, buffer, { 'content-type': mimeType });
  }

  async downloadFile(url: string): Promise<Buffer> {
    const key = url.substring(this.getBasePath().length);
    const resultStream = await this.getObjectStream(key);
    const buffers = [];
    for await (const data of resultStream) {
      buffers.push(data);
    }

    return Buffer.concat(buffers);
  }

  getBasePath() {
    return `https://${this.s3FileEndpoint}/${this.s3FileBucket}`;
  }

  getObjectStream(key: string): Promise<ReadableStream.Readable> {
    return this.minioClient.getObject(this.s3FileBucket, key);
  }

  async getBuffer(url: string) {
    const urlObj = new URL(url);

    const result = await curly.get<Buffer>(url, {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/000000000 Safari/537.36',
      curlyResponseBodyParser: false,
    })
    const mimeType = _.get(result.headers.pop(), 'content-type');
    const filename = urlObj.pathname.split('/').pop();
    if (!filename) throw new Error('Bad filename');
    return { buff: result.data, mimeType, filename };
  }

  async getAndStore(url: string, targetPrefix: string, transformerFn: GetStoreProcessorFn = async (x, y, z) => ({ buff: x, mimeType: y, filename: z })) {
    const result = await this.getBuffer(url);
    if (!result || !result.buff) return null;
    const { buff, mimeType, filename } = result;
    const transformedResult  = await transformerFn(buff, mimeType, filename);
    const { buff: processedBuffer, mimeType: processedMimeType, filename: processedFilename } = transformedResult;
    const path = `${targetPrefix}/${processedFilename}`;
    return this.uploadFile(processedBuffer, path, processedMimeType);
  }
}

export type GetStoreProcessorFn = (b: Buffer, mimeType: string | undefined, filename: string) => Promise<{  buff: Buffer, mimeType: string | undefined, filename: string }>;
