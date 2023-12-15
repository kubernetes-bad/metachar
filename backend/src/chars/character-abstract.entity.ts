import { BaseEntity, CreateDateColumn, DeleteDateColumn, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import llamaTokenizer from 'llama-tokenizer-js';
import S3Service from '../s3/s3.service.js';
import { JanitorAssetType } from '../janitor/janitor-character.entity.js';
import { ChubAssetType } from '../chub/chub-character.entity.js';
import { CharacterApi } from '../lib/api-abstact.js';
import BaseTag from '../tags/tag.entity.js';

export abstract class BaseCharacter<T extends CharacterAssetType, K extends BaseTag<BaseCharacter<any, any>>> extends BaseEntity {
  @PrimaryColumn({ type: 'varchar', length:255 })
  public id: string;

  public abstract tags: K[];

  @CreateDateColumn()
  public createdAt: string;

  @UpdateDateColumn()
  public updatedAt: string;

  @DeleteDateColumn()
  public deletedAt: string;

  public abstract saveAsset(api: CharacterApi<BaseCharacter<T, K>>, s3service: S3Service, assetType: T, url: string): Promise<unknown>;
  public abstract getTokenCount(): number;

  protected getTokenCountForFields(fields: (string | null | undefined)[]) {
    return fields.flatMap(f => f ? [f] : []) // filter out empties
      .map((field) => field ? llamaTokenizer.encode(field)?.length || 0 : 0)
      .reduce((a, b) => a + b, 0);
  }
}

export type CharacterAssetType = JanitorAssetType | ChubAssetType;
