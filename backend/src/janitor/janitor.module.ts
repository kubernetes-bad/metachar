import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import S3Module from '../s3/s3.module.js';
import CharactersModule from '../chars/chars.module.js';
import { JanitorController } from './janitor.controller.js';
import { JanitorCharacterService } from './janitor.service.js';
import JanitorCharacter from './janitor-character.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([JanitorCharacter]),
    ConfigModule,
    S3Module,
    forwardRef(() => CharactersModule),
  ],
  controllers: [JanitorController],
  providers: [JanitorCharacterService],
  exports: [JanitorCharacterService],
})
export default class JanitorModule {}
