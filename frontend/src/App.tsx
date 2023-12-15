import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Header from './Header';
import './App.css';
import CharacterGrid from './CharacterGrid';
import ProductDetail from './CharacterDetail';

function App() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <Router>
      <Header searchTerm={searchTerm} setSearchTerm={setSearchTerm}/>
      <Routes>
        <Route path="/" element={<CharacterGrid setSearchBarContents={setSearchTerm}/>} />
        <Route path="/characters/:characterId" element={<ProductDetail/>} />
      </Routes>
    </Router>
  );
}

export default App;
