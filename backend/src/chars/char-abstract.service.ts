import { BaseEntity, Repository } from 'typeorm';
import { SearchType } from './chars.service.js';

export abstract class CharacterServiceProvider<T extends BaseEntity> {
  protected constructor(protected readonly repository: Repository<T>) {}

  public abstract ingestCharacter(id: string): Promise<T | null>;
  public abstract ingestCharacters(pageNumber: number): Promise<T[]>;
  public abstract freshCharacters(): Promise<any>;
  public abstract makeCharacterFromDTO(dto: unknown): Promise<T>;
  public abstract search(query: string | undefined, searchType: SearchType | undefined, pageNum: number): Promise<{ result: T[], total: number }>;
  public abstract getLatestCharacters(count: number): Promise<T[]>;

  public async getCharacterById(id: string): Promise<T | null> {
    return this.repository.createQueryBuilder('char')
      .leftJoinAndSelect('char.tags', 'tags')
      .where('char.id = :id', { id })
      .getOne();
  }

  public async getCharactersByIds(ids: string[]): Promise<T[]> {
    return this.repository.createQueryBuilder('char')
      .leftJoinAndSelect('char.tags', 'tags')
      .whereInIds(ids)
      .getMany();
  }

  public async getTotalCount(): Promise<number> {
    return this.repository.count();
  }
}
