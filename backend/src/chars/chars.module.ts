import { forwardRef, Module } from '@nestjs/common';
import { CharactersService } from './chars.service.js';
import ChubModule from '../chub/chub.module.js';
import JanitorModule from '../janitor/janitor.module.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import ChubCharacter from '../chub/chub-character.entity.js';
import JanitorCharacter from '../janitor/janitor-character.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChubCharacter]),
    TypeOrmModule.forFeature([JanitorCharacter]),
    forwardRef(() => ChubModule),
    forwardRef(() => JanitorModule),
  ],
  providers: [CharactersService],
  exports: [CharactersService],
})
export default class CharactersModule {}
