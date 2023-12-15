import { Entity, Column, ManyToMany, JoinTable } from 'typeorm';
import { BaseCharacter } from '../chars/character-abstract.entity.js';
import S3Service, { GetStoreProcessorFn } from '../s3/s3.service.js';
import { addCharacterToImage, convertToPng, makeAvatar } from '../lib/charImg.js';
import JanitorApi from '../lib/janitor.api.js';
import JanitorTag from '../tags/tag-janitor.entity.js';

@Entity()
export default class JanitorCharacter extends BaseCharacter<JanitorAssetType, JanitorTag> {
  @Column()
  public name: string;

  @Column()
  public avatar: string;

  @Column({ type: 'datetime' })
  public original_createdAt: Date | null;

  @Column({ type: 'datetime' })
  public original_updatedAt: Date | null;

  @Column()
  public creator_id: string;

  @Column()
  public creator_name: string;

  @Column({ nullable: true })
  public creator_verified: boolean;

  @Column({ type: 'text' })
  public description: string;

  @Column({  type: 'mediumtext', nullable: true })
  public personality: string | null;

  @Column({ type: 'text', nullable: true })
  public scenario: string | null;

  @Column({ type: 'mediumtext', nullable: true })
  public example_dialogs: string | null;

  @Column({ type: 'mediumtext', nullable: true })
  public first_message: string | null;

  @Column({ default: false })
  public is_nsfw: boolean;

  @Column()
  public total_chat: number;

  @Column()
  public total_message: number;

  @ManyToMany((type) => JanitorTag, (tag) => tag.characters, { eager: true, cascade:  true,  createForeignKeyConstraints: false })
  @JoinTable({
    name: 'tags_characters',
    joinColumn: {
      name: 'character',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'fk_jani-character_tag_characterId',
    },
    inverseJoinColumn: {
      name: 'tag',
      referencedColumnName: 'name',
      foreignKeyConstraintName: 'fk_jani-tag-character_tagName',
    },
  })
  public tags: JanitorTag[];

  public async saveAsset(api: JanitorApi, s3service: S3Service, assetType: JanitorAssetType, filename: string): Promise<any> {
    const url = `https://pics.janitorai.com/bot-avatars/${filename}`;

    let transformerFn: GetStoreProcessorFn | undefined = undefined;
    if (assetType === JanitorAssetType.CARD) {
      transformerFn = async (buff: Buffer, mimeType: string | undefined, file: string) => {
        if (mimeType === 'image/png') return { buff , mimeType, filename: file };
        // convert to png
        let pngBuffer = await convertToPng(buff, mimeType);
        // add character exif data
        pngBuffer = await addCharacterToImage(pngBuffer, this);
        return { buff: pngBuffer, mimeType: 'image/png', filename: `${filename}.png` };
      }
    }
    else if (assetType === JanitorAssetType.AVATAR) {
      // square crop based on face
      transformerFn = async (buff: Buffer, mimeType: string | undefined, file: string) => {
        const avatarBuffer = await makeAvatar(buff, mimeType);
        return { buff: avatarBuffer, mimeType: 'image/jpeg', filename: file };
      };
    }
    return s3service.getAndStore(url, `${this.id}/${assetType}`, transformerFn);
  };

  public getTokenCount(): number {
    return super.getTokenCountForFields([
      this.description,
      this.personality,
      this.scenario,
      this.example_dialogs,
      this.first_message,
    ]);
  }
}

export enum JanitorAssetType {
  AVATAR = 'avatars',
  CARD = 'cards',
}
