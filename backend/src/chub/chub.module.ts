import { TypeOrmModule } from '@nestjs/typeorm';
import { forwardRef, Module } from '@nestjs/common';
import S3Module from '../s3/s3.module.js';
import CharactersModule from '../chars/chars.module.js';
import ChubCharacter from './chub-character.entity.js';
import ChubController from './chub.controller.js';
import ChubCharactersService from './chub.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChubCharacter]),
    S3Module,
    forwardRef(() => CharactersModule),
  ],
  controllers: [ChubController],
  providers: [ChubCharactersService],
  exports: [ChubCharactersService],
})
export default class ChubModule {}
