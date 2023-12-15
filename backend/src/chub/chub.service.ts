import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { FindOptionsWhere } from 'typeorm/find-options/FindOptionsWhere';
import ChubCharacter, { ChubAssetType } from './chub-character.entity.js';
import ChubApi, { ChubLabelType, ChubTagDTO } from '../lib/chub.api.js';
import S3Service from '../s3/s3.service.js';
import { PAGE_SIZE, SearchType } from '../chars/chars.service.js';
import { CharacterServiceProvider } from '../chars/char-abstract.service.js';
import ChubTag from '../tags/tag-chub.entity.js';

const AVATARS_ENDPOINT = 'https://avatars.charhub.io';

@Injectable()
export default class ChubCharactersService extends CharacterServiceProvider<ChubCharacter>{
  private readonly logger = new Logger(ChubCharactersService.name);
  private api: ChubApi = new ChubApi();

  constructor(
    @InjectRepository(ChubCharacter) repository: Repository<ChubCharacter>,
    private readonly s3service: S3Service,
  ) {
    super(repository);
  }

  private async saveIngestableCharacter(chubCharacter: ChubCharacter): Promise<ChubCharacter> {
    if (chubCharacter.tags) { // save tags
      chubCharacter.tags = await this.repository.manager.save(chubCharacter.tags);
    }
    return this.repository.save(chubCharacter);
  }

  public async ingestTags() : Promise<ChubTag[]> {
    const tagNames = await this.api.getTags();
    const tags = tagNames.map((name) => ChubTag.makeWithName(name));
    return this.repository.manager.getRepository(ChubTag).save(tags);
  }

  public async ingestCharacter(fullPath: string): Promise<ChubCharacter | null> {
    await this.ingestTags();
    const chubCharacter = await this.api.getCharacter(this, fullPath);
    if (!chubCharacter) return null;
    return this.saveIngestableCharacter(chubCharacter);
  }

  public async ingestCharacters(pageNumber: number): Promise<ChubCharacter[]> {
    await this.ingestTags();
    const chubResults = await this.api.getCharacters(this, pageNumber);
    if (!chubResults.results || !chubResults.results.length) return [];

    return Promise.all(
      chubResults.results.map(async (chubCharacter) => this.api.getCharacter(this, chubCharacter.fullPath)
        .then((char) => char ? this.saveIngestableCharacter(char) : null)
      )
    ).then((chars) => chars.filter(char => char !== null) as ChubCharacter[]);
  }

  @Cron('0 10 * * * *')
  public async freshCharacters() {
    this.logger.log(`CHUB: INGESTING FRESH CHARS...`);
    return this.ingestCharacters(1);
  }

  public async makeCharacterFromDTO(node: {  [key: string]: any }, skipAssets = false): Promise<ChubCharacter> {
    const result = new ChubCharacter();
    Object.assign(result, node);
    result.id = `chub-${node.id}`;
    result.creatorId = node.fullPath.split('/')[0]; // chub has 'null' always
    result.title = node.name;
    result.card_description = node.description;
    result.original_createdAt = node.createdAt;
    result.alternate_greetings = node.definition?.alternate_greetings;
    result.avatar =  node.definition?.avatar;
    result.description = node.definition?.description;
    result.embedded_lorebook = node.definition?.embedded_lorebook;
    result.example_dialogs = node.definition?.example_dialogs;
    result.extensions = node.definition?.extensions;
    result.first_message = node.definition?.first_message;
    result.name = node.definition?.name;
    result.personality = node.definition?.personality;
    result.post_history_instructions = node.definition?.post_history_instructions;
    result.project_name = node.definition?.project_name;
    result.scenario = node.definition?.scenario;
    result.system_prompt = node.definition?.system_prompt;
    result.tavern_personality = node.definition?.tavern_personality;
    result.tags = Array.from(new Set(
      node.topics.map((topic: string) => ChubTag.makeWithName(ChubApi.normalizeTag(topic)),
    )));

    if (skipAssets) return result;

    const tasks = [];
    // save expressions
    const expressionLabel = result.labels?.find((label) => label.title === ChubLabelType.EXPR);
    if (expressionLabel) {
      tasks.push(result.saveAsset(this.api, this.s3service, ChubAssetType.EXPRESSION, expressionLabel.description));
    }

    // save avatar
    if (result.avatar) {
      tasks.push(result.saveAsset(this.api, this.s3service, ChubAssetType.AVATAR, result.avatar));
    }

    // save card image
    const cardImageUrl = `${AVATARS_ENDPOINT}/avatars/${result.fullPath}/chara_card_v2.png?nocache=${Math.random() * 100000}`;
    tasks.push(result.saveAsset(this.api, this.s3service, ChubAssetType.CARD_IMAGE, cardImageUrl));

    await Promise.all(tasks);

    return result;
  }

  public makeTagFromDTO(dto: ChubTagDTO): ChubTag {
    return ChubTag.makeWithName(dto.name);
}

  async getLatestCharacters(charNum: number): Promise<ChubCharacter[]> {
    return this.repository.find({ order: { original_createdAt: 'DESC' }, take: charNum });
  }

  async search(query?: string | undefined, searchType?: SearchType, pageNum: number = 1): Promise<{ result: ChubCharacter[], total: number }> {
    if (!query) return { result: await this.getLatestCharacters(PAGE_SIZE), total: await this.getTotalCount() };
    let arrayQuery: string[] | null = null;

    let where: FindOptionsWhere<ChubCharacter> | string | string[] = {};
    let orWhere: FindOptionsWhere<ChubCharacter> | FindOptionsWhere<ChubCharacter>[] | string[] | null = null;
    let andWhere: FindOptionsWhere<ChubCharacter> | FindOptionsWhere<ChubCharacter>[] | string[] | null = null;

    switch (searchType) {
      case SearchType.BASIC:
        where = { title: Like(`%${query}%`) };
        orWhere = [{ name: Like(`%${query}%`) }, { tagline: Like(`%${query}%`) }, { personality: Like(`%${query}%`) }, { scenario: Like(`%${query}%`) }];
        break;
      case SearchType.TITLE:
        where = { title: Like(`%${query}%`) };
        orWhere = { name: Like(`%${query}%`) };
        break;
      case SearchType.AUTHOR:
        where.creatorId = query;
        break;
      case SearchType.TAG:
        arrayQuery = (query.includes(',') ? query.split(',') : [query])
          .map((q) => q.trim().toLowerCase());

        where = 'JSON_SEARCH(LOWER(topics), "one", :query) IS NOT NULL';
        andWhere = arrayQuery.slice(1).map((term) => 'JSON_SEARCH(LOWER(topics), "one", :query) IS NOT NULL');

        break;
      default:
        throw new BadRequestException('Invalid search type');
    }

    const queryBuilder = this.repository.createQueryBuilder('char');
    if (typeof where === 'string') queryBuilder.where(where, { query: arrayQuery ? arrayQuery : query });
    else queryBuilder.where(where);

    if (andWhere) {
      if (Array.isArray(andWhere) && arrayQuery) {
        for (const [index, andWhereCase] of andWhere.entries()) {
          const q = arrayQuery?.slice(1)[index];
          queryBuilder.andWhere(andWhereCase, { query: q });
        }
      } else queryBuilder.andWhere(andWhere, { query: arrayQuery ? arrayQuery.slice(1) : query });
    }

    if (orWhere) queryBuilder.orWhere(orWhere, { query: arrayQuery ? arrayQuery : query });

    return {
      result: await queryBuilder
        .take(PAGE_SIZE)
        .skip((pageNum-1) * PAGE_SIZE)
        .getMany(),
      total: await queryBuilder.getCount(),
    };
  }
}
