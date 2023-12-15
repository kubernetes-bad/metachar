import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import ChubCharactersService from '../chub/chub.service.js';
import { JanitorCharacterService } from '../janitor/janitor.service.js';
import { TavernCardV2 } from '../lib/charImg.js';
import JanitorCharacter from '../janitor/janitor-character.entity.js';
import ChubCharacter from '../chub/chub-character.entity.js';

export const PAGE_SIZE = 25;

interface SearchQuery {
  tags: string[];
  searchTerm: string;
}

function extractSearchQuery(query: string): SearchQuery {
  const regex = /tag:\s*\[([^\]]+)]|(\S+)/g;

  let match;
  let tags: string[] = [];
  let searchTerm: string = '';

  while ((match = regex.exec(query)) !== null) {
    if (match[1]) { // tags
      tags = match[1].split(',').map((tag) => tag.trim());
    } else if (match[2]) { // search term
      searchTerm = match[2].trim();
    }
  }

  // strip quotes
  tags = tags.map((tag) => tag.replace(/^"(.*)"$/, '$1'));

  return { tags, searchTerm };
}

@Injectable()
export class CharactersService {
  constructor(
    private readonly chubCharService: ChubCharactersService,
    private readonly janitorService: JanitorCharacterService,
    @InjectRepository(ChubCharacter) private readonly chubRepo: Repository<ChubCharacter>,
    @InjectRepository(JanitorCharacter) private readonly janitorRepo: Repository<JanitorCharacter>,
  ) {}

  public async search(query?: string | undefined, searchType?: SearchType, pageNum: number = 1): Promise<SearchResult> {
    const [chubCharsResult, janitorCharsResult] = await Promise.all([
      this.chubCharService.search(query, searchType, pageNum),
      this.janitorService.search(query, searchType, pageNum)
    ]);
    const total =  chubCharsResult.total + janitorCharsResult.total;

    const chars: Character[] = [...chubCharsResult.result, ...janitorCharsResult.result]
      // SORT BY DATE - CAN BE NULL
      .sort((a, b) => {
        if (!a.original_createdAt && !b.original_createdAt) return 0;
        const dateA = a.original_createdAt || a.createdAt;
        const dateB = b.original_createdAt || b.createdAt;
        return dateA > dateB ? -1 : 1; // DESCENDING ORDER
      }).map((char) => ({
        ...TavernCardV2.from(char),
        type: (char instanceof ChubCharacter) ? 'chub' : 'janitor',
        char,
        tokenCount: char.getTokenCount(),
      }));

    return {
      result: chars,
      total,
    }
  }

  private isUUID(input: string): boolean {
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    return uuidRegex.test(input);
  }

  async getCharacterById(id: string): Promise<null | Character> {
    if (this.isUUID(id)) {
      const char: JanitorCharacter | null = await this.janitorService.getCharacterById(id);
      if (!char) return null;
      return { ...TavernCardV2.from(char), type: 'janitor', char, tokenCount: char.getTokenCount() };
    }
    // not an uuid - maybe chub
    let char: JanitorCharacter | ChubCharacter | null = await this.chubCharService.getCharacterById(id);
    if (!char) {
      char = await this.janitorService.getCharacterById(id);
      if (!char) return null;
      return { ...TavernCardV2.from(char), type: 'janitor', char, tokenCount: char.getTokenCount() };
    } else { // fallback to janitor!
      return { ...TavernCardV2.from(char), type: 'chub', char, tokenCount: char.getTokenCount() };
    }
  }

  public async getCharacters(skip: number, take: number = PAGE_SIZE, query?: string): Promise<{ data: Character[],total: number }> {
    // get IDs of chars from both Chub and Janitor sorted by created date
    const chubIdsQuery = this.chubRepo.createQueryBuilder('chub')
      .select(['id', 'createdAt']);
    const janitorIdsQuery = this.janitorRepo.createQueryBuilder('janitor')
      .select(['id', 'createdAt']);

    // handle search
    if (query) {
      const searchQuery = extractSearchQuery(query);
      if (searchQuery.searchTerm) {
        chubIdsQuery.andWhere('(chub.name LIKE :query OR chub.title LIKE :query)', { query: `%${searchQuery.searchTerm}%` });
        janitorIdsQuery.andWhere('(janitor.name LIKE :query)', { query: `%${searchQuery.searchTerm}%` });
      }

      // search on tags
      if (searchQuery.tags.length) {
        chubIdsQuery.innerJoin('chub.tags', 'tag');
        janitorIdsQuery.innerJoin('janitor.tags', 'tag');
        chubIdsQuery.andWhere('tag.name IN (:...chubTagNames)', { chubTagNames: searchQuery.tags });
        janitorIdsQuery.andWhere('tag.name IN (:...janitorTagNames)', { janitorTagNames: searchQuery.tags });
      }
    }

    let [chubQuery, chubParams] = chubIdsQuery.getQueryAndParameters();
    let [janitorQuery, janitorParams] = janitorIdsQuery.getQueryAndParameters();
    const namedParams: {[key: string]: any } = {};

    // detect open search
    if (chubQuery.includes('LIKE ?')) {
      chubQuery = chubQuery
        .replace('LIKE ?', 'LIKE :chubParam0')
        .replace('LIKE ?', 'LIKE :chubParam1');
      namedParams.chubParam0 = chubParams[0];
      namedParams.chubParam1 = chubParams[1];

      janitorQuery = janitorQuery.replace('LIKE ?', 'LIKE :janitorParam0');
      namedParams.janitorParam0 = janitorParams[0];
    }
    // detect tags changes
    if (chubQuery.match(/.*IN \((?:\?(?:, )?)*\)/g)) { // ... IN (?, ?, ....)
      chubQuery = chubQuery.replace(/IN \((?:\?(?:, )?)*\)/, 'IN (:...chubParams)');
      janitorQuery = janitorQuery.replace(/IN \((?:\?(?:, )?)*\)/, 'IN (:...janitorParams)');
      namedParams.chubParams = chubParams;
      namedParams.janitorParams = janitorParams;
    }

    const unionQueryBuilder = this.chubRepo.manager.createQueryBuilder()
      .select(['union.id', 'union.createdAt'])
      .from(`((${chubQuery}) UNION (${janitorQuery}))`, 'union')
      .setParameters(namedParams)
      .skip(skip)
      .take(take)
      .orderBy('createdAt', 'DESC');

    const mixedCharIds = await unionQueryBuilder
      .getRawMany<{ id: string, createdAt: Date }>();

    const janitorCharIds = mixedCharIds
      .map((char) => char.id)
      .filter((id) => id.startsWith('janitor'));
    const chubCharIds = mixedCharIds
      .map((char) => char.id)
      .filter((id) => id.startsWith('chub'));
    const janitorCharsPromise: Promise<Character[]> = this.janitorService.getCharactersByIds(janitorCharIds)
      .then((chars) => chars.map((char) => ({ ...TavernCardV2.from(char), type: 'janitor', char, tokenCount: char.getTokenCount() })));
    const chubCharsPromise: Promise<Character[]> = this.chubCharService.getCharactersByIds(chubCharIds)
      .then((chars) => chars.map((char) => ({ ...TavernCardV2.from(char), type: 'chub', char, tokenCount: char.getTokenCount() })));
    const dataPromise: Promise<Character[]> = Promise.all([janitorCharsPromise, chubCharsPromise])
      .then((chars) => chars.flat())
      .then((chars) => { // restore the ordering
        type ReferenceMap<T extends { char: JanitorCharacter | ChubCharacter }> = { [K in T['char']['id']]: T };
        const referenceMap: ReferenceMap<Character> = chars.reduce(
          (acc, char) => ({ ...acc, [char.char.id]: char }),
          {}
        );
        return mixedCharIds.map((ref) => referenceMap[ref.id]);
      });

    const totalPromise = Promise.all([
      chubIdsQuery.getCount(),
      janitorIdsQuery.getCount(),
    ]).then((res) => res.reduce((accum, item) => accum + item, 0));
    return {
      data: await dataPromise,
      total: await totalPromise,
    };
  }
}

export type Character = TavernCardV2 & {
  type: 'chub' | 'janitor'
  char: ChubCharacter | JanitorCharacter
  tokenCount: number
};

export type SearchResult = {
  result: Character[]
  total: number
};

export enum SearchType {
  BASIC = 'basic',
  TAG = 'tag',
  TITLE = 'title',
  AUTHOR = 'author',
  RANDOM = 'random',
}
