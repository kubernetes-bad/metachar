export type CharacterDTO = TavernCardV2 & {
  type: CharacterType
  char: {
    id: string
    name: string
    avatar: string
    description: string
    title?: string // Chub
    tagline?: string // Chub
    creatorId?: string // Chub
    fullPath?: string // Chub
    creator_id?: string // Janitor
    creator_name?: string // Janitor
    tags: {
      name: string
      [key: string]: any
    }[]
    [key: string]: any
  }
  tokenCount: number
};

export type TavernCardV2 = {
  spec: 'chara_card_v2'
  spec_version: '2.0' // May 8th addition
  data: {
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
  }
}

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

export enum CharacterType {
  CHUB = 'chub',
  JANITOR = 'janitor',
}

export enum ChubAssetType {
  EXPRESSION = 'expression',
  AVATAR = 'avatar',
  CARD_IMAGE = 'card_image',
}

export enum JanitorAssetType {
  AVATAR = 'avatars',
  CARD = 'cards',
}
