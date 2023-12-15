import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { API_URL } from './constants';
import CharacterCard from './CharacterCard';
import { CharacterDTO } from './interfaces/CharacterDTO';

const PAGE_SIZE = 24;

type CharacterGridProps = {
  setSearchBarContents: (contents: string) => void
}

export default function CharacterGrid({ setSearchBarContents }: CharacterGridProps ) {
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [characters, setCharacters] = useState<CharacterDTO[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);

  // load chars
  useEffect(() => {
    const fetchData = async () => {
      try {
        const skip = (currentPage - 1) * PAGE_SIZE;
        let url = `${API_URL}/characters?skip=${skip}&take=${PAGE_SIZE}`;

        if (searchQuery) url += `&search=${searchQuery}`;

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.statusText}`);
        }

        const data = await response.json();
        setCharacters(data.data);
        (() => {
          data.data.map((char: CharacterDTO) => localStorage.setItem(`char_${char.char.id}`, JSON.stringify(char)));
        })();
        setTotalPages(Math.ceil(data.total / PAGE_SIZE));
        setLoading(false);
      } catch (error: Error | any) {
        setError(error.message);
        setLoading(false);
      }
    };

    fetchData();
  }, [currentPage, searchQuery]);

  // handle search
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const searchParam = queryParams.get('search');
    // populate search bar
    if (searchParam) setSearchBarContents(searchParam);
    setSearchQuery(searchParam);
  }, [location.search]);

  const handleNextPage = () => {
    setCurrentPage((prevPage) => prevPage + 1);
  };

  const handlePrevPage = () => {
    setCurrentPage((prevPage) => Math.max(1, prevPage - 1));
  };

  return (
    <div className="bg-gray-900 min-h-screen flex flex-col items-center">
      <main className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading && (<div className="w-full col-span-4">
          <p className="text-white font-extrabold justify-center">Loading...</p>
        </div>)}
        {error && (<div className="w-full col-span-4">
          <p className="text-white font-extrabold justify-center">Error: {error}</p>
        </div>)}
        {!loading &&
          !error &&
          characters.map((char) => (
            <CharacterCard
              key={char.char.id}
              id={char.char.id}
              type={char.type}
              char={char}
            />
          ))}
      </main>
      {!error && !loading && (<div className="mt-4 flex items-center">
        {currentPage > 1 && (
          <button className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
            onClick={handlePrevPage}
          >Previous</button>
        )}
        <span className="text-white">
          Page {currentPage} of {totalPages}
        </span>
        {currentPage < totalPages && (
          <button className="bg-blue-500 text-white px-4 py-2 rounded ml-2"
            onClick={handleNextPage}
          >Next</button>
        )}
      </div>)}
    </div>
  );
}
