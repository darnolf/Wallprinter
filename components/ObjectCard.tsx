/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { Artwork } from '../types';

interface ObjectCardProps {
  artwork: Artwork;
  isSelected: boolean;
  onSelect: (artwork: Artwork) => void;
  onDragStart: (artwork: Artwork, event: React.DragEvent) => void;
  onTouchStart: (artwork: Artwork, event: React.TouchEvent) => void;
  onDelete?: (artworkId: number) => void;
}

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);


const ObjectCard: React.FC<ObjectCardProps> = ({ artwork, isSelected, onSelect, onDragStart, onTouchStart, onDelete }) => {
  const cardClasses = `
    group relative w-full aspect-square rounded-xl overflow-hidden cursor-pointer 
    transition-all duration-300 transform 
    hover:scale-105 hover:shadow-2xl 
    focus-within:ring-4 focus-within:ring-offset-2 focus-within:ring-offset-zinc-50 dark:focus-within:ring-offset-zinc-900 focus-within:ring-blue-500
    ${isSelected ? 'ring-4 ring-blue-500 shadow-xl scale-105' : 'ring-2 ring-zinc-200 dark:ring-zinc-700 shadow-md'}
  `;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', artwork.id.toString());
    onDragStart(artwork, e);
  };

  return (
    <div
      className={cardClasses}
      onClick={() => onSelect(artwork)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(artwork); }}
      tabIndex={0}
      role="button"
      aria-pressed={isSelected}
      aria-label={`Select artwork ${artwork.name}`}
      draggable="true"
      onDragStart={handleDragStart}
      onTouchStart={(e) => onTouchStart(artwork, e)}
    >
      <img
        src={artwork.imageUrl}
        alt={artwork.name}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110 pointer-events-none"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 p-3 w-full pointer-events-none">
        <h4 className="text-white text-sm font-bold truncate">{artwork.name}</h4>
      </div>
      
      {isSelected && (
        <div className={`absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1.5 flex items-center justify-center shadow-lg transition-opacity duration-300 ${onDelete ? 'group-hover:opacity-0' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
        </div>
      )}

      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(artwork.id);
          }}
          className="absolute top-2 right-2 z-10 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          aria-label={`Delete artwork ${artwork.name}`}
        >
          <CloseIcon />
        </button>
      )}
    </div>
  );
};

export default ObjectCard;