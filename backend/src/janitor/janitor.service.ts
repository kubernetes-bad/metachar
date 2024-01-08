import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import JanitorCharacter, { JanitorAssetType } from './janitor-character.entity.js';
import JanitorApi, { JanitorCharacterDto } from '../lib/janitor.api.js';
import S3Service from '../s3/s3.service.js';
import { PAGE_SIZE, SearchType } from '../chars/chars.service.js';
import { CharacterServiceProvider } from '../chars/char-abstract.service.js';
import JanitorTag from '../tags/tag-janitor.entity.js';

@Injectable()
export class JanitorCharacterService extends CharacterServiceProvider<JanitorCharacter> {
  private readonly logger = new Logger(JanitorCharacterService.name);
  private readonly api: JanitorApi;

  constructor(
    @InjectRepository(JanitorCharacter) repository: Repository<JanitorCharacter>,
    private readonly config: ConfigService,
    private readonly s3service: S3Service,
  ) {
    super(repository);
    const flaresolverrEndpoint = this.config.getOrThrow('flaresolverr.endpoint');
    this.api = new JanitorApi(flaresolverrEndpoint);
  }

  private async saveIngestableCharacter(char: JanitorCharacter): Promise<JanitorCharacter> {
    if (char.tags) { // save tags
      char.tags = await this.repository.manager.save(char.tags);
    }
    return this.repository.save(char);
  }

  public async ingestTags() : Promise<JanitorTag[]> {
    const tagNames = await this.api.getTags(this);
    const tags = tagNames.map((name) => JanitorTag.makeWithName(name));
    return this.repository.manager.getRepository(JanitorTag).save(tags);
  }

  async ingestCharacter(uid: string): Promise<JanitorCharacter | null> {
    await this.ingestTags();
    const jCharacter = await this.api.getCharacter(this, uid);
    if (!jCharacter) return null;
    return this.saveIngestableCharacter(jCharacter);
  }

  async ingestCharacters(pageNum: number): Promise<JanitorCharacter[]> {
    await this.ingestTags();
    const { results: jCharacterDtos, total } = await this.api.getCharacters(this, pageNum);
    if (!jCharacterDtos) return [];

    return Promise.all(
      jCharacterDtos.map(async (dto) => this.api.getCharacter(this, dto.id)
        .then((char) => char ? this.saveIngestableCharacter(char) : null)
      )
    ).then((chars) => chars.filter(char => char !== null) as JanitorCharacter[]);
  }

  @Cron('0 10 * * * *')
  public async freshCharacters() {
    this.logger.log(`JANITOR: INGESTING FRESH CHARS...`);
    return this.ingestCharacters(1);
  }

  async makeCharacterFromDTO(dto: JanitorCharacterDto): Promise<JanitorCharacter> {
    const jCharacter = new JanitorCharacter();
    jCharacter.id = `janitor-${dto.id}`;
    jCharacter.name = dto.name;
    jCharacter.avatar = dto.avatar;
    jCharacter.original_createdAt = new Date(dto.created_at);
    jCharacter.original_updatedAt = new Date(dto.updated_at);
    jCharacter.creator_id = dto.creator_id;
    jCharacter.creator_name = dto.creator_name;
    jCharacter.description = dto.description;
    jCharacter.personality = dto.personality || null;
    jCharacter.scenario = dto.scenario || null;
    jCharacter.example_dialogs = dto.example_dialogs || null;
    jCharacter.first_message = dto.first_message || null;
    jCharacter.is_nsfw = dto.is_nsfw;
    jCharacter.total_chat = dto.total_chat || 0;
    jCharacter.total_message = dto.total_message || 0;
    const dtoTags = (dto.tags || []).map((t) => t.slug);
    jCharacter.tags = Array.from(new Set(
      dtoTags.map((slug) => JanitorTag.makeWithName(JanitorApi.normalizeTag(slug))),
    ));

    await Promise.all([
      jCharacter.saveAsset(this.api, this.s3service, JanitorAssetType.AVATAR, dto.avatar), // save avatar
      jCharacter.saveAsset(this.api, this.s3service, JanitorAssetType.CARD, dto.avatar), // save card
    ]);
    return jCharacter;
  }

  public async search(query: string | undefined, searchType: SearchType | undefined, pageNum: number): Promise<{ result: JanitorCharacter[], total: number }> {
    if (!query) return { result: await this.getLatestCharacters(PAGE_SIZE), total: await this.getTotalCount() };
    return {
       result: [], total: 0,
    }
  }

  public async getLatestCharacters(count: number): Promise<JanitorCharacter[]> {
    return this.repository.find({ order: { original_createdAt: 'DESC' }, take: count });
  }
}
