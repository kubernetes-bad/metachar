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

  @Post('ingestBySearch')
  async ingestCharactersBySearch(
    @Req() req: Request,
    @Res() res: Response,
    @Body('maxPage') maxPage: number,
    @Body('searchQuery') searchQuery: string,
    @Body('startPage') startPage: number,
  ) {
    // Start the ingestion process in the background
    this.janitorCharService.freshCharactersBySearch(maxPage, searchQuery, startPage)
      .then(() => {
        console.log('Ingestion process completed.');
      })
      .catch((error) => {
        console.error('Ingestion process failed:', error);
      });
  
    // Immediately return a response to the client
    return res.status(202).send({ message: 'Ingest has been started' });
  }

  @Post('ingestAll')
  async ingestPage(
    @Req() req: Request,
    @Query('pageNum', ParseIntPipe) pageNum: number,
  ) {
    return this.janitorCharService.ingestCharacters(pageNum);
  }
}
