import { Module } from '@nestjs/common';
import TagsController from './tags.controller.js';
import TagsService from './tags.service.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import JanitorTag from './tag-janitor.entity.js';
import ChubTag from './tag-chub.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([JanitorTag]),
    TypeOrmModule.forFeature([ChubTag]),
  ],
  controllers: [TagsController],
  providers: [TagsService]
})
export class TagsModule {}
