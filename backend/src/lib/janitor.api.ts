import * as cheerio from 'cheerio';
import Flaresolverr from './flaresolverr.js';
import { CharacterApi } from './api-abstact.js';
import { JanitorCharacterService } from '../janitor/janitor.service.js';
import JanitorCharacter from '../janitor/janitor-character.entity.js';

export const JANITOR_API_ROOT = 'https://kim.janitorai.com';

export default class JanitorApi extends CharacterApi<JanitorCharacter> {
  private readonly flaresolverr: Flaresolverr;

  constructor(flaresolverrUrl: string) {
    super(`http://${flaresolverrUrl}/v1`);
    this.flaresolverr = new Flaresolverr(this.client);
  }

  private async get<T>(url: string): Promise<T> {
    const res = await this.flaresolverr.get(url);
    if (!res) throw new Error('No response from janitor');
    const $ = cheerio.load(res);
    return JSON.parse($('pre').text()) as T;
  }

  public async getCharacter(charService: JanitorCharacterService, uid: string): Promise<JanitorCharacter | null> {
    const key = `${JANITOR_API_ROOT}/characters/${uid.replace('janitor-', '')}`;
    const dto = await this.get<JanitorCharacterDto>(key);
    console.log(`JANITOR: PROCESSING CHARACTER ${dto.name}...`);
    return charService.makeCharacterFromDTO(dto);
  }

  public async getCharacters(charService: JanitorCharacterService, page = 1, searchQuery = ''): Promise<{ results: JanitorCharacter[], total: number }> {
    const key = `${JANITOR_API_ROOT}/characters?page=${page}&search=${encodeURIComponent(searchQuery)}&mode=all&sort=latest`;
  
    const result = await this
      .get<{ data: JanitorCharacterDto[], total: number, size: number, page: number }>(key);
  
    console.log(`JANITOR: PROCESSING PAGE ${page}...`);
  
    if (!result.data.length) return { results: [], total: 0 };
    const characters = await Promise.all(
      result.data.map((dto) => charService.makeCharacterFromDTO(dto)),
    );
  
    return { results: characters, total: result.total };
  }  

  public async getTags(charService: JanitorCharacterService): Promise<string[]> {
    const key = `${JANITOR_API_ROOT}/tags`;
    const result = await this.get<JanitorTagDto[]>(key);
    return result.map((tag) => JanitorApi.normalizeTag(tag.name));
  }
}

export type JanitorCharacterDto = {
  id: string
  name: string
  avatar: string
  created_at: string
  updated_at: string
  creator_id: string
  creator_name: string
  creator_verified: boolean
  description: string
  personality?: string
  scenario?: string
  example_dialogs?: string
  first_message?: string
  is_nsfw: boolean
  is_public: boolean
  tag_ids: number[]
  total_chat: number
  total_message: number
  tags: JanitorTagDto[]
  stats: {
    chat: number
    message: number
  }
}

export type JanitorTagDto = {
  id: number
  created_at: string
  name: string
  slug: string
  description: string
}
