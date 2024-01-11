import ChubCharacter from '../chub/chub-character.entity.js';
import ChubCharactersService from '../chub/chub.service.js';
import { CharacterApi } from './api-abstact.js';

const CHUB_API = 'https://api.chub.ai';
const SEARCH_PAGE_SIZE = 25;
const SEARCH_MIN_TOKENS = 50;

export default class ChubApi extends CharacterApi<ChubCharacter> {
  constructor() {
    super(CHUB_API);
  }

  public async getCharacters(charService: ChubCharactersService, page = 1, order: 'desc' | 'asc' = 'desc', searchQuery = ''): Promise<{ results: ChubCharacter[], total: number }> {
    console.log(`CHUB: PROCESSING PAGE ${page}...`);
    // https://api.chub.ai/search?search=&first=10&topics=&excludetopics=&page=1&sort=created_at&venus=true&min_tokens=50&nsfw=true
    const key = `/search?search=${encodeURIComponent(searchQuery)}&first=${SEARCH_PAGE_SIZE}&topics=&excludetopics=&page=${page}&sort=id&asc=${order === 'asc'}&venus=true&min_tokens=${SEARCH_MIN_TOKENS}&nsfw=true`;
  
    const result = await this.client.get<ChubCharacterSearchDTO>(key);
    if (!result?.data?.data?.nodes.length) return { results: [], total: 0 };
  
    const total = result.data.data.count;
    const results = await Promise.all(
      result.data.data.nodes.map((node: { [key: string]: any }) => charService.makeCharacterFromDTO(node, true))
    );
    return {
      results, total,
    };
  }  

  public async getCharacter(charService: ChubCharactersService, fullPath: string): Promise<ChubCharacter | null> {
    if (!fullPath) return null;

    const key = `/api/characters/${fullPath}?full=true`;
    const node = await this.client.get(key)
      .then((res) => res.data.node)
      .then((res) => {
        console.log(`CHUB: GOT CHARACTER ${fullPath}!`);
        return res;
      })
      .catch((err) => {
        if (err.response.status === 404) return null; // that's OK
        throw err;
      });
    if (!node) return null;
    return charService.makeCharacterFromDTO(node);
  }

  public async getTags(): Promise<string[]> {
    const key = `/tags`;
    return this.client.get(key)
      .then((res) => res.data.tags as ChubTagDTO[])
      .then((tagDTOArray) => tagDTOArray.map((dto) => ChubApi.normalizeTag(dto.name)))
      .then((tags) => Array.from(new Set(tags))) // deduplicate
  }
}

export type ChubCharacterSearchDTO = {
  data: {
    count: number
    nodes: ChubCharacterDTO[]
    page: number
  }
}

export type ChubCharacterDTO = {
  createdAt: string
  creatorId: string | null
  definition: null | {
    alternate_greetings: string[]
    avatar: string
    description: string
    embedded_lorebook: null | ChubLorebook
    example_dialogs: string
    extensions: { [key: string]: unknown } // irrelevant
    first_message: string
    full_path: string // SOMETIMES EMPTY, use root fullPath instead
    id: number
    is_public: boolean
    name: string
    nsfw_image: boolean
    personality: string
    post_history_instructions: string
    project_name: string
    scenario: string
    system_prompt: string
    tavern_personality: string
  }
  description: string
  forks: unknown[] // TODO
  forksCount: number
  fullPath: string
  hasGallery: boolean
  id: number
  is_favorite: boolean
  is_public: boolean
  labels: ChubLabel[]
  lastActivityAt: string
  nChats: number
  nMessages: number
  nTokens: number
  n_public_chats: number
  name: string
  nsfw_image: boolean
  permissions: null // TODO
  primaryFormat: 'cai' | 'tavern'
  projectSpace: string
  rating: number
  ratingCount: number
  related_characters: [] // TODO
  related_lorebooks: number[] // TODO: WTF IS [-1]
  related_prompts: number[] // TODO: WTF IS [-1]
  starCount: number
  tagline: string
  topics: string[]
}

export type ChubTagDTO = {
  id: number
  name: string
  non_private_projects_count: number
  title: string
}

export type ChubLabel = {
  title: string;
  description: string;
}

export enum ChubLabelType {
  EXPR = 'EXPR',
  CAI = 'CAI',
  TOKEN_COUNTS = 'TOKEN_COUNTS',
}

export type ChubLorebook = {
  description: string;
  name: string;
  entries: ChubLorebookEntry[];
  extensions: { [key: string]: unknown }, // irrelevant
  recursive_scanning: boolean;
  scan_depth: number;
  token_budget: number;
}

export type ChubLorebookEntry = {
  id: number;
  case_sensitive: boolean;
  comment: string;
  constant: boolean;
  content: string;
  enabled: boolean;
  insertion_order: number;
  keys: string[];
  name: string;
  position: 'after_chat' | 'after_message' | 'before_chat' | 'before_message';
  priority: number;
  secondary_keys: string[];
  selective: boolean;
  extensions: {
    display_index: number,
    exclude_recursion: boolean,
    position: number,
    probability: number,
    useProbability: boolean;
  }
}
