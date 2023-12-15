import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import JanitorTag from './tag-janitor.entity.js';
import ChubTag from './tag-chub.entity.js';

@Injectable()
export default class TagsService {
  constructor(
    @InjectRepository(JanitorTag) private readonly janitorTagRepo: Repository<JanitorTag>,
    @InjectRepository(ChubTag) private readonly chubTagRepo: Repository<ChubTag>,
  ) {}

  public async getTags(): Promise<Tag[]> {
    function makeTagQuery(repo: Repository<any>, type: 'chub' | 'janitor', limit: number = 100): Promise<Tag[]> {
      return repo.createQueryBuilder('tag')
        .leftJoin('tag.characters', 'characters')
        .select(['tag.name AS name', 'COUNT(characters.id) AS charCount', `"${type}" as type`])
        .groupBy('tag.name')
        .orderBy('charCount', 'DESC')
        .addOrderBy('tag.name', 'ASC')
        .limit(limit)
        .getRawMany<Tag>();
    }

    return Promise.all([
      makeTagQuery(this.chubTagRepo, 'chub'),
      makeTagQuery(this.janitorTagRepo, 'janitor'),
    ]).then((ta) => ta.flat());
  }
}

export class Tag {
  name: string
  charCount: number
  type: 'chub' | 'janitor'
}
