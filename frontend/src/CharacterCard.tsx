import React from 'react';
import { CharacterDTO, CharacterType, ChubAssetType, JanitorAssetType } from './interfaces/CharacterDTO';
import { API_URL } from './constants';
import CharacterLink from './CharacterLink';

interface CharProps {
  id: string
  type: CharacterType
  char: CharacterDTO
}

function shorten(str: string, maxLen: number, separator = ' ') {
  if (str.length <= maxLen) return str;
  return `${str.substring(0, str.lastIndexOf(separator, maxLen))}...`;
}

function CharacterCard({ id, type, char }: CharProps) {
  let avatarPath = '';
  let cardPath = '';
  let name = char.char.title || char.char.name;
  let tagline = shorten(char.char.tagline || char.char.description, 150);
  let creator = char.char.creatorId || char.char.creator_name || char.char.creator_id || 'Unknown';

  if (type === CharacterType.CHUB) {
    avatarPath = `${API_URL}/images/${ChubAssetType.AVATAR}/${id}`;
    cardPath = `${API_URL}/images/${ChubAssetType.CARD_IMAGE}/${id}`;
  } else if (type === CharacterType.JANITOR) {
    avatarPath = `${API_URL}/images/${JanitorAssetType.AVATAR}/${id}`;
    cardPath = `${API_URL}/images/${JanitorAssetType.CARD}/${id}`;
  }

  return (
    <CharacterLink id={id}>
      <div className="bg-gray-700 p-4 rounded-md shadow-md flex flex-col items-center w-80">
        <div className="aspect-w-1 aspect-h-1 mb-4">
          <img src={avatarPath} alt={name} className="object-cover rounded-md" />
        </div>
        <h2 className="text-lg font-bold text-white mb-2">{name}</h2>
        <p className="text-gray-300 mb-2 text-center">{tagline}</p>
        <p className="text-sm text-gray-400">{`by ${creator}`}</p>
      </div>
    </CharacterLink>
  );
}

export default CharacterCard;
