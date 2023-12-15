import React from 'react';
import { Link } from 'react-router-dom';

interface CharacterLinkProps {
  id: string;
  children: React.ReactNode;
}

function CharacterLink({ id, children }: CharacterLinkProps) {
  return <Link to={`/characters/${id}`}>{children}</Link>;
}

export default CharacterLink;
