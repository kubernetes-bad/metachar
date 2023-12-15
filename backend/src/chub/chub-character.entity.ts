import { Column, Entity, JoinTable, ManyToMany } from 'typeorm';
import { convertToPng } from '../lib/charImg.js';
import S3Service, { GetStoreProcessorFn } from '../s3/s3.service.js';
import { BaseCharacter } from '../chars/character-abstract.entity.js';
import ChubApi, { ChubLabel, ChubLorebook } from '../lib/chub.api.js';
import ChubTag from '../tags/tag-chub.entity.js';

@Entity()
export default class ChubCharacter extends BaseCharacter<ChubAssetType, ChubTag> {
  @Column({ nullable: true })
  public creatorId?: string;

  @Column({ type: 'mediumtext', nullable: true })
  public card_description?: string; // NOT definition.description!

  @Column({ nullable: true })
  public forksCount: number;

  @Column({ nullable: true })
  public fullPath: string;

  @Column({ default: false, nullable: true })
  public hasGallery: boolean;

  @Column({ type: 'json', nullable: true })
  public labels: ChubLabel[] | null;

  @Column({ type: 'datetime', nullable: true })
  public lastActivityAt: Date | null;

  @Column({ nullable: true })
  public nChats: number;

  @Column({ nullable: true })
  public nMessages: number;

  @Column({ nullable: true })
  public nTokens: number;

  @Column({ nullable: true, default: 0 })
  public n_public_chats: number;

  @Column({ nullable: false })
  public title: string; // chub api field: name

  @Column({ default: false, nullable: true })
  public nsfw_image: boolean;

  @Column({ default: 'tavern' })
  public primaryFormat: string;

  @Column({ type: 'datetime' })
  public original_createdAt: Date | null;

  @Column()
  public starCount: number;

  @Column()
  public rating: number;

  @Column()
  public ratingCount: number;

  @Column({ type: 'mediumtext' })
  public tagline: string;

  @Column({ type: 'json' })
  public topics: string[];

  // DEFINITION COLUMNS

  @Column({ type: 'json' })
  public alternate_greetings: string[] | null;

  @Column()
  public avatar: string;

  @Column({ type: 'mediumtext' })
  public description: string;

  @Column({ type: 'json', nullable: true })
  public embedded_lorebook: ChubLorebook | null;

  @Column({ type: 'mediumtext' })
  public example_dialogs: string; // TODO: maybe json array instead?

  @Column({ type: 'json', nullable: true })
  public extensions: { [key: string]: any }; // TODO: submit an issue if you know an example of this

  @Column({ type: 'text' })
  public first_message: string;

  @Column({ nullable: false })
  public name: string;

  @Column({ type: 'mediumtext' })
  public personality: string;

  @Column({ type: 'mediumtext' })
  public post_history_instructions: string;

  @Column()
  public project_name: string;

  @Column({ type: 'mediumtext' })
  public scenario: string;

  @Column({ type: 'text' })
  public system_prompt: string;

  @Column({ type: 'mediumtext' })
  public tavern_personality: string;

  @ManyToMany((type) => ChubTag, (tag) => tag.characters, { eager: true, cascade: true,  createForeignKeyConstraints: false })
  @JoinTable({
    name: 'tags_characters',
    joinColumn: {
      name: 'character',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'fk_chub-character_tag_characterId',
    },
    inverseJoinColumn: {
      name: 'tag',
      referencedColumnName: 'name',
      foreignKeyConstraintName: 'fk_chub-tag-character_tagName',
    },
  })
  tags: ChubTag[];

  public async saveAsset(api: ChubApi, s3service: S3Service, assetType: ChubAssetType, url: string): Promise<unknown> {
    const transformerFn: GetStoreProcessorFn = async (buff: Buffer, mimeType: string | undefined, filename: string) => {
      if (mimeType === 'image/webp' || filename.endsWith('.webp')) {
        // convert to png
        return { buff: await convertToPng(buff), mimeType: 'image/png', filename: `${filename}.png`};
      }
      return { buff,  mimeType, filename };
    }

    const result = await s3service.getAndStore(url, `${this.id}/${assetType}`, transformerFn);
    if (!result) return null;
    return result;
  }

  public getTokenCount(): number {
    return this.nTokens;
  }
}

export enum ChubAssetType {
  EXPRESSION = 'expression',
  AVATAR = 'avatar',
  CARD_IMAGE = 'card_image',
}
