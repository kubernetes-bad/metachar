import { Controller, Get, NotFoundException, Param, ParseIntPipe, Query } from '@nestjs/common';
import { Character, CharactersService, PAGE_SIZE } from '../chars/chars.service.js';

@Controller('')
export default class FrontendController {
  constructor(
    private readonly charactersService: CharactersService,
  ) {}

  @Get('characters')
  public async getCharacters(
    @Query('skip', new ParseIntPipe({ optional: true })) skip: number = 0,
    @Query('take', new ParseIntPipe({ optional: true })) take = PAGE_SIZE,
    @Query('search') query?: string,
  ) {
    return this.charactersService.getCharacters(skip, take, query);
  }

  @Get('characters/:charId')
  public async getCharacter(
    @Param('charId') charId: string,
  ): Promise<Character> {
    const char: Character | null = await this.charactersService.getCharacterById(charId);
    if (!char) throw new NotFoundException('Character not found');
    return char;
  }
}
