import sharp from 'sharp';
import { CropBoost } from 'smartcrop';
import { crop as smartcrop } from 'smartcrop-sharp';
import extract from 'png-chunks-extract';
import encode from 'png-chunks-encode';
import PNGtext from 'png-chunk-text';
import * as codecs from '@astropub/codecs'
import JanitorCharacter from '../janitor/janitor-character.entity.js';
import ChubCharacter from '../chub/chub-character.entity.js';
import { detectFaces, loadHaarFaceModels } from './cv.js';

const AVATAR_SQ_SIZE = 300;

await loadHaarFaceModels();

export async function convertToPng(buffer: Buffer, mimeType = 'image/webp') {
  if (mimeType === 'image/avif') { // AVIF support in node is fucked
    const imageData = await codecs.decode(buffer);

    // codecs' png encoding is hella slow (17s/image!) - use sharp instead
    // const result = await codecs.encode(imageData, 'image/png');
    // return Buffer.from(result.data);

    return sharp(imageData.data, {
      raw: {
        width: imageData.width,
        height: imageData.height,
        channels: 4, // best guess -_-
      },
    }).toFormat('png')
      .flatten() // convert to just 3 channels
      .toBuffer();
  }
  return sharp(buffer)
    .toFormat('png')
    .toBuffer();
}

export async function makeAvatar(buff: Buffer, mimeType = 'image/png'): Promise<Buffer> {
  const pngBuffer = mimeType === 'image/png' ? buff : await convertToPng(buff, mimeType);
  // detect faces
  const cropOptions: CropOptions = { width: AVATAR_SQ_SIZE, height: AVATAR_SQ_SIZE };

  let faces: { x: number, y: number, width: number, height: number }[];
  faces = await detectFaces(pngBuffer);
  if (faces.length) {
    cropOptions.boost = faces.map((face) => {
      return {
        x: face.x,
        y: face.y,
        width: face.width,
        height: face.height,
        weight: 1.0
      };
    });
  }
  const res = await smartcrop(pngBuffer, cropOptions);
  const crop = res.topCrop;
  return sharp(pngBuffer)
    .extract({ width: crop.width, height: crop.height, left: crop.x, top: crop.y })
    .resize(AVATAR_SQ_SIZE, AVATAR_SQ_SIZE)
    .toFormat('jpg')
    .toBuffer();
}

export async function addCharacterToImage(inputBuff: Buffer, char: JanitorCharacter): Promise<Buffer> {
  const chunks = extract(inputBuff);
  const tEXtChunks = chunks.filter(chunk => chunk.name === 'tEXt');

  for (let tEXtChunk of tEXtChunks) {
    chunks.splice(chunks.indexOf(tEXtChunk), 1);
  }

  const tavernCard: TavernCardV2 = {
    spec: 'chara_card_v2',
    spec_version: '2.0',
    data: {
      name: char.name,
      description: char.description,
      personality: char.personality || '',
      scenario: char.scenario || '',
      first_mes: char.first_message || '',
      mes_example: char.example_dialogs || '',
      creator_notes: '',
      system_prompt: '',
      post_history_instructions: '',
      alternate_greetings: [],
      tags: char.tags.map((t) => t.name) || [],
      creator: char.creator_name,
      character_version: 'main',
      extensions: {},
    },
  };

  const base64EncodedData = Buffer.from(JSON.stringify(tavernCard), 'utf8').toString('base64');
  chunks.splice(-1, 0, PNGtext.encode('chara', base64EncodedData));
  return Buffer.from(encode(chunks));
}

export class TavernCardV2 {
  spec: 'chara_card_v2'
  spec_version: '2.0' // May 8th addition
  data: TavernCardV2Data

  public static from(char: JanitorCharacter | ChubCharacter): TavernCardV2 {
    const card = new TavernCardV2();
    card.spec = 'chara_card_v2';
    card.spec_version = '2.0';
    card.data = {
      name: char.name,
      description: char.description,
      personality: char.personality || "",
      scenario: char.scenario || "",
      first_mes: char.first_message || "",
      mes_example: char.example_dialogs || "",
    } as TavernCardV2Data;

    if (char instanceof JanitorCharacter) {
      card.data.creator_notes = "";
      card.data.system_prompt = "";
      card.data.post_history_instructions = "";
      card.data.alternate_greetings = [];
      card.data.tags = char.tags.map((t) => t.name) || [];
      card.data.creator = char.creator_name;
      card.data.character_version = 'main';
      card.data.extensions = {};
    } else if (char instanceof ChubCharacter) {
      card.data.creator_notes = char.description;
      card.data.system_prompt = char.system_prompt;
      card.data.post_history_instructions = char.post_history_instructions;
      card.data.alternate_greetings = char.alternate_greetings || [];
      card.data.tags = char.topics || [];
      card.data.creator = char.creatorId || "";
      card.data.character_version = 'main';
      card.data.extensions = char.extensions;
    }
    else throw new Error('YOU DID DONE FUCKED UP LOL');
    return card;
  }
}

export type TavernCardV2Data = {
  name: string
  description: string
  personality: string
  scenario: string
  first_mes: string
  mes_example: string

  // New fields start here
  creator_notes: string
  system_prompt: string
  post_history_instructions: string
  alternate_greetings: Array<string>
  character_book?: CharacterBook

  // May 8th additions
  tags: Array<string>
  creator: string
  character_version: string
  extensions: Record<string, any>
};

export type CharacterBook = {
  name?: string
  description?: string
  scan_depth?: number // agnai: "Memory: Chat History Depth"
  token_budget?: number // agnai: "Memory: Context Limit"
  recursive_scanning?: boolean // no agnai equivalent. whether entry content can trigger other entries
  extensions: Record<string, any>
  entries: Array<{
    keys: Array<string>
    content: string
    extensions: Record<string, any>
    enabled: boolean
    insertion_order: number // if two entries inserted, lower "insertion order" = inserted higher
    case_sensitive?: boolean

    // FIELDS WITH NO CURRENT EQUIVALENT IN SILLY
    name?: string // not used in prompt engineering
    priority?: number // if token budget reached, lower priority value = discarded first

    // FIELDS WITH NO CURRENT EQUIVALENT IN AGNAI
    id?: number // not used in prompt engineering
    comment?: string // not used in prompt engineering
    selective?: boolean // if `true`, require a key from both `keys` and `secondary_keys` to trigger the entry
    secondary_keys?: Array<string> // see field `selective`. ignored if selective == false
    constant?: boolean // if true, always inserted in the prompt (within budget limit)
    position?: 'before_char' | 'after_char' // whether the entry is placed before or after the character defs
  }>
}

type CropOptions = {
  minScale?: number;
  width: number;
  height: number;
  boost?: CropBoost[];
  ruleOfThirds?: boolean;
  debug?: boolean;
}
