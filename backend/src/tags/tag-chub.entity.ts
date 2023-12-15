import { Entity, ManyToMany } from 'typeorm';
import ChubCharacter from '../chub/chub-character.entity.js';
import BaseTag from './tag.entity.js';

@Entity('tag')
export default class ChubTag extends BaseTag<ChubCharacter> {
  @ManyToMany((type) => ChubCharacter, (character) => character.tags)
  public characters: Promise<ChubCharacter[]>;
}
