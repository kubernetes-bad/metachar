import axios, { AxiosInstance } from 'axios';
import rateLimit from 'axios-rate-limit';
import axiosRetry from 'axios-retry';
import { CharacterServiceProvider } from '../chars/char-abstract.service.js';
import { BaseCharacter, CharacterAssetType } from '../chars/character-abstract.entity.js';
import BaseTag from '../tags/tag.entity.js';

const NUM_RETRIES = 5;
const MAX_CONCURRENT_REQUESTS = 5;
const MAX_RPS = 5;
const TIMEOUT = 60 * 1000;

export abstract class CharacterApi<T extends BaseCharacter<CharacterAssetType, BaseTag<any>>> {
  protected client: AxiosInstance;

  protected constructor(baseURL: string) {
    this.client = rateLimit(axios.create({
      baseURL,
      timeout: TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
      },
    }), { maxRequests: MAX_CONCURRENT_REQUESTS, perMilliseconds: 1000, maxRPS: MAX_RPS });

    axiosRetry(this.client, {
      retries: NUM_RETRIES,
      onRetry: (retryCount, err, req) => {
        console.error(err);
        console.log(`retrying request for the ${retryCount}th time...`);
      },
    });
  }

  public abstract getCharacter(charService: CharacterServiceProvider<T>, apiId: string): Promise<T | null>;
  public abstract getCharacters(charService: CharacterServiceProvider<T>, page: number, order: 'desc' | 'asc'): Promise<{ results: T[], total: number }>;
  public abstract getTags(charService: CharacterServiceProvider<T>): Promise<string[]>;

  public static normalizeTag(tag: string): string {
    // strip emoji
    let normalizedTag = tag
      // REMOVE EMOJI
      .replaceAll(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
      .replaceAll('"', '')
      .replaceAll('*', '')
      .replaceAll('“', '')
      .replaceAll('«', '')
      .replaceAll('»', '')
      .replaceAll('”', '')
      .replaceAll('❝', '')
      .replaceAll('❞', '')
      .replaceAll('’', "'")
      .replaceAll('❛', "'")
      .replaceAll('❜', "'")
      .replaceAll('´', "'")
      .replaceAll('‘', "'")
      .replaceAll('„', "'")
      .replaceAll('‚', ",")
      .replaceAll('❨', "(")
      .replaceAll('❩', ")")
      .replaceAll('--', "-")
      .replaceAll('—', "-")
      .replaceAll('—', "-")
      .trim();
    if (normalizedTag.startsWith('*')) normalizedTag = normalizedTag.replace('*', '');
    if (normalizedTag.endsWith('*')) normalizedTag = normalizedTag.slice(0, -1);
    if (normalizedTag.startsWith('(')) normalizedTag = normalizedTag.replace('(', '');
    if (normalizedTag.endsWith(')')) normalizedTag = normalizedTag.slice(0, -1);
    if (normalizedTag.startsWith('#')) normalizedTag = normalizedTag.replace('#', '');
    return normalizedTag;
  }
}
