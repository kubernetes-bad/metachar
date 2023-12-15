import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

type HeaderProps = {
  searchTerm: string
  setSearchTerm: (term: string) => void
}

function Header({ searchTerm, setSearchTerm }: HeaderProps) {
  const navigate = useNavigate();

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    return (event.key === 'Enter') ? submitSearch() : null;
  }

  const submitSearch = () => {
    navigate(`/?search=${searchTerm}`)
  }

  const handleSearchTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }

  return (
    <header className="bg-indigo-900 p-4 text-white">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold"><Link to="/">MetaChar</Link></h1>
        <div className="flex mt-2 md:mt-0">
          <input
            type="text"
            onChange={handleSearchTyping}
            onKeyDown={handleKeyPress}
            placeholder="Search..."
            defaultValue={searchTerm}
            color="red"
            className="w-full md:w-64 px-2 py-1 border rounded text-sky-900"
          />
          <button type="submit"
            onClick={submitSearch}
            className="ml-2 bg-blue-500 text-white px-4 py-1 rounded"
          >Search</button>
        </div>
      </div>
    </header>
  );
}

export default Header;
