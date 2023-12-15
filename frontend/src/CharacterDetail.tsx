import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ColorHash from 'color-hash';
import { ArrowTopRightOnSquareIcon, ArrowDownTrayIcon } from '@heroicons/react/24/solid';
import { CharacterDTO, CharacterType, ChubAssetType, JanitorAssetType, TavernCardV2 } from './interfaces/CharacterDTO';
import { API_URL } from './constants';

const colorHash = new ColorHash({ lightness: 0.5 });

function CharacterDetail() {
  let { characterId } = useParams<{ characterId: string }>();
  const [characterDetails, setCharacterDetails] = useState<CharacterDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarPath, setAvatarPath] = useState('');
  const [cardPath, setCardPath] = useState('');
  const [type, setType] = useState<CharacterType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [spoilerOpen, setSpoilerOpen] = useState(false);

  // fetch
  useEffect(() => {
    const fetchCharacterDetail = async () => {
      try {
        // check if in localStorage
        const cachedCharacterDetail = localStorage.getItem(`char_${characterId}`);
        if (cachedCharacterDetail) {
          setCharacterDetails(JSON.parse(cachedCharacterDetail));
          setLoading(false);
          return;
        }

        // if not in cache, fetch
        const response = await fetch(`${API_URL}/characters/${characterId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch character detail: ${response.statusText}`);
        }

        const data = await response.json();
        setCharacterDetails(data);
        setLoading(false);

        // save in cache
        localStorage.setItem(`char_${characterId}`, JSON.stringify(data));
      } catch (error: Error | any) {
        setError(error.message);
        setLoading(false);
      }
    };

    fetchCharacterDetail();
  }, [characterId]);

  // populate character details
  useEffect(() => {
    if (!characterDetails?.type) return;
    setType(characterDetails.type);

    if (type === CharacterType.CHUB) {
      setAvatarPath(`${API_URL}/images/${ChubAssetType.AVATAR}/${characterId}`);
      setCardPath(`${API_URL}/images/${ChubAssetType.CARD_IMAGE}/${characterId}`);
    } else if (type === CharacterType.JANITOR) {
      setAvatarPath(`${API_URL}/images/${JanitorAssetType.AVATAR}/${characterId}`);
      setCardPath(`${API_URL}/images/${JanitorAssetType.CARD}/${characterId}`);
    }
  }, [characterDetails, characterId, type]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;
  if (!characterDetails) return <p>No character details found.</p>;

  const downloadJson = () => {
    // delete extra garbage
    const tavernCard = Object.keys(characterDetails).reduce((card, field) => {
      if (field === 'char' || field === 'type' || field === 'tokenCount') return card;
      const value = characterDetails[field as keyof TavernCardV2];
      return { ...card, [field]: value };
    }, {} as TavernCardV2);

    const json = JSON.stringify(tavernCard);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${characterDetails.data.name}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const { name } = characterDetails.char;
  const tagline = characterDetails.char.tagline || characterDetails.char.description;
  const creator = characterDetails.char.creatorId || characterDetails.char.creator_name || characterDetails.char.creator_id || 'Unknown';
  const originLink = characterDetails.type === "chub"
    ? `https://www.chub.ai/characters/${characterDetails.char.fullPath}`
    : `https://janitorai.com/characters/${characterId?.replace('janitor-', '')}`;

  const downloadTavern = async () => {
    const blob = await fetch(cardPath)
      .then((res) => res.blob());
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="bg-gray-900 min-h-screen flex items-start justify-center text-white">
      <div className="md:w-2/3 p-4">
        <div className="flex flex-col md:flex-row items-start">
          <div className="md:w-1/3 p-4">
            <div>
              <img src={cardPath} alt={name} className="mb-4 rounded-lg w-full"/>
            </div>
            <div>
              <div className="flex pb-2">
                  <span>Original: </span>
                  <a href={originLink} target="_blank" rel="noreferrer"
                     className="ps-2 flex items-center text-cyan-600 underline underline-offset-2 hover:underline-offset-4 hover:text-white">
                  {characterDetails.type === "chub" ? "Chub" : "Janitor AI"}
                    <ArrowTopRightOnSquareIcon className="h-6 w-6"/>
                  </a>
              </div>
              <p className="pb-2">Download:</p>
              <div className="flex flex-wrap">
                <button className="rounded bg-purple-700 m-2 p-1 ps-2 pe-2 hover:shadow hover:shadow-white flex"
                        onClick={downloadTavern}
                >
                  <ArrowDownTrayIcon className="h-6 w-6 pe-1"/>
                  Tavern v2
                </button>
                <button className="rounded bg-amber-700 m-2 p-1 ps-2 pe-2 hover:shadow hover:shadow-white flex"
                        onClick={downloadJson}
                >
                  <ArrowDownTrayIcon className="h-6 w-6 pe-1"/>
                  JSON
                </button>
              </div>
            </div>
          </div>
          <div className="md:w-2/3 p-4">
          <h1 className="text-2xl font-bold mb-2">{name}</h1>
            <p className="text-slate-500 mb-2 italic text-s">Tokens: {characterDetails.tokenCount}</p>
            <p className="text-gray-300 mb-4">{tagline}</p>
            <p className="text-sm text-gray-400">{`by ${creator}`}</p>

            {characterDetails.data.tags.length && (
              <div className="flex flex-wrap mt-4">
                {characterDetails.data.tags.map((tag, index) => (
                  <Link key={index} className="text-white"
                    to={`/?search=tag:["${tag.replace(/"/g, '\\"')}"]`}>
                    <button key={index} style={{ backgroundColor: colorHash.hex(tag) }}
                      className="bg-blue-500 text-white px-2 py-1 rounded mr-2 mb-2">{tag}</button>
                  </Link>
                ))}
              </div>)}

            <div className="mt-4">
              <button
                className="text-blue-500 underline cursor-pointer focus:outline-none"
                onClick={() => setSpoilerOpen(!spoilerOpen)}
              >
                {spoilerOpen ? 'Hide definition' : 'Show definition'}
              </button>
              {spoilerOpen && (
                <div className="text-gray-300 mt-2">
                  <p className="text-2xl font-bold mb-2 mt-4">Description:</p>
                  <p className="mb-2 whitespace-pre-wrap">{characterDetails.char.description}</p>

                  {characterDetails.data.personality && (<>
                    <p className="text-2xl font-bold mb-2 mt-4">Personality:</p>
                    <p className="mb-2 whitespace-pre-wrap">{characterDetails.char.personality}</p>
                  </>)}

                  {characterDetails.data.scenario && (<>
                    <p className="text-2xl font-bold mb-2 mt-4">Scenario:</p>
                    <p className="mb-2 whitespace-pre-wrap">{characterDetails.char.personality}</p>
                  </>)}

                  {characterDetails.data.first_mes && (<>
                    <p className="text-2xl font-bold mb-2 mt-4">First Message:</p>
                    <p className="mb-2 whitespace-pre-wrap">{characterDetails.data.first_mes}</p>
                  </>)}

                  {characterDetails.data.mes_example && (<>
                    <p className="text-2xl font-bold mb-2 mt-4">Dialog Examples:</p>
                    <p className="mb-2 whitespace-pre-wrap">{characterDetails.data.mes_example}</p>
                  </>)}

                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CharacterDetail;
