import { forwardRef, Module } from '@nestjs/common';
import { ImagesController } from './images.controller.js';
import S3Module from '../s3/s3.module.js';
import CharactersModule from '../chars/chars.module.js';

@Module({
  imports: [
    S3Module, forwardRef(() => CharactersModule),
  ],
  controllers: [ImagesController],
})
export default class ImagesModule {}
