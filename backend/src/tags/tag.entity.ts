import { BaseEntity, PrimaryColumn } from 'typeorm';
import { BaseCharacter, CharacterAssetType } from '../chars/character-abstract.entity.js';

export default abstract class BaseTag<T extends BaseCharacter<CharacterAssetType, BaseTag<any>>> extends BaseEntity {
  static makeWithName<T extends BaseCharacter<CharacterAssetType, BaseTag<any>>>(name: string): BaseTag<T> {
    const tag = new (this as any)();
    tag.name = name;
    return tag;
  }

  @PrimaryColumn({ type: 'varchar', length: 255, charset: 'utf8mb4', collation: 'utf8mb4_bin' })
  public name: string;

  public abstract characters: Promise<T[]>;
}
