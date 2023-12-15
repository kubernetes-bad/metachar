import { Body, Controller, NotFoundException, ParseIntPipe, Post, Query, Req } from '@nestjs/common';
import { JanitorCharacterService } from './janitor.service.js';
import JanitorCharacter from './janitor-character.entity.js';

@Controller('janitor')
export class JanitorController {
  constructor(
    private readonly janitorCharService: JanitorCharacterService,
  ) {}

  @Post('ingest')
  async ingestCharacter(
    @Req() req: Request,
    @Body('uid') uid: string,
  ): Promise<JanitorCharacter> {
    const jCharacter: JanitorCharacter | null = await this.janitorCharService.ingestCharacter(uid);
    if (!jCharacter) throw new NotFoundException('Character not found');
    return jCharacter;
  }

  @Post('ingestAll')
  async ingestPage(
    @Req() req: Request,
    @Query('pageNum', ParseIntPipe) pageNum: number,
  ) {
    return this.janitorCharService.ingestCharacters(pageNum);
  }
}
