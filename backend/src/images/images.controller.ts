import {
  Controller,
  Get,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import S3Service from '../s3/s3.service.js';
import { CharacterAssetType } from '../chars/character-abstract.entity.js';
import { CharactersService } from '../chars/chars.service.js';
import ChubCharacter, { ChubAssetType } from '../chub/chub-character.entity.js';
import JanitorCharacter, { JanitorAssetType } from '../janitor/janitor-character.entity.js';

@Controller('images')
export class ImagesController {
  constructor(
    private readonly charactersService: CharactersService,
    private readonly s3service: S3Service,
  ) {}

  @Get(':imageType/:charId')
  public async getAvatarForChar(
    @Param('charId') charId: string,
    @Param('imageType') imageType: CharacterAssetType,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const char = await this.charactersService.getCharacterById(charId);
    if (!char) throw new NotFoundException('Character not found');

    let assetPath = `chara_card_v2.png`;
    if (char.type === 'chub') {
      if (imageType === ChubAssetType.AVATAR) {
        const chubChar = char.char as ChubCharacter;
        const avatarFilename = chubChar.avatar?.split('/').pop();
        if (!chubChar.avatar || !avatarFilename) throw new NotFoundException('Character does not have avatar');
        assetPath = avatarFilename.endsWith('.webp') ? `${avatarFilename}.png` : avatarFilename;
      }
    }
    else if (char.type === 'janitor') {
      const janitorChar = char.char as JanitorCharacter;
      assetPath = janitorChar.avatar;
      if (imageType === ChubAssetType.AVATAR) imageType = JanitorAssetType.AVATAR;
      else if (imageType === ChubAssetType.CARD_IMAGE) imageType = JanitorAssetType.CARD;
      if (imageType === JanitorAssetType.CARD && !assetPath.endsWith('.png')) assetPath += '.png';
    }

    try {
      const imageStream = await this.s3service.getObjectStream(`${charId}/${imageType}/${assetPath}`);
      res.set({
        'Content-Type': 'image/png',
        'Content-Disposition': 'attachment; filename="image.png"',
      });
      return new StreamableFile(imageStream);
    } catch (err) {
      res.set({ 'Content-Type': 'application/json' });
      console.error(err);
      throw new InternalServerErrorException('Something went wrong');
    }
  }
}
