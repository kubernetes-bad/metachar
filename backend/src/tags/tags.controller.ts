import { Controller, Get } from '@nestjs/common';
import TagsService from './tags.service.js';

@Controller('tags')
export default class TagsController {
  constructor(
    private readonly tagsService: TagsService,
  ) {}

  @Get('')
  public async getAllTags(
  ) {
    return this.tagsService.getTags();
  }
}
