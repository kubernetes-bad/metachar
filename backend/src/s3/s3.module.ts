import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import S3Service from './s3.service.js';

@Module({
  imports: [ConfigModule],
  providers: [S3Service],
  exports: [S3Service],
})
export default class S3Module {}
