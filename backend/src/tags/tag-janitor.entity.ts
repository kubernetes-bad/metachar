import { Entity, ManyToMany } from 'typeorm';
import JanitorCharacter from '../janitor/janitor-character.entity.js';
import BaseTag from './tag.entity.js';

@Entity('tag')
export default class JanitorTag extends BaseTag<JanitorCharacter> {
  @ManyToMany((type) => JanitorCharacter, (character) => character.tags)
  public characters: Promise<JanitorCharacter[]>;
}
