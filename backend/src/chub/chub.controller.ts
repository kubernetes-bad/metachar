import { Body, Controller, Logger, NotFoundException, ParseIntPipe, Post, Query, Req } from '@nestjs/common';
import ChubCharacter from './chub-character.entity.js';
import ChubCharactersService from './chub.service.js';

@Controller('chub')
export default class ChubController {
  private readonly logger = new Logger(ChubController.name);

  constructor(
    private readonly chubService: ChubCharactersService,
  ) {}

  @Post('ingest')
  async ingestCharacter(
    @Req() req: Request,
    @Body('fullPath') fullPath: string,
  ): Promise<ChubCharacter> {
    const chubCharacter = await this.chubService.ingestCharacter(fullPath);
    if (!chubCharacter) throw new NotFoundException('Character not found');
    return chubCharacter;
  }

  @Post('ingestBySearch')
  async ingestCharactersBySearch(
    @Req() req: Request,
    @Body('maxPage') maxPage: number,
    @Body('searchQuery') searchQuery: string,
    @Body('startPage') startPage: number,
  ) {
    return this.chubService.freshCharactersBySearch(maxPage, searchQuery, startPage);
  }

  @Post('ingestAll')
  async ingestPage(
    @Req() req: Request,
    @Query('pageNum', ParseIntPipe) pageNum: number,
  ) {
    return this.chubService.ingestCharacters(pageNum);
  }
}
