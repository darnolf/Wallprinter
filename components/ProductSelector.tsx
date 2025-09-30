/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { Artwork } from '../types';
import ObjectCard from './ObjectCard';

interface ProductSelectorProps {
  artworks: Artwork[];
  selectedArtwork: Artwork | null;
  onArtworkSelect: (artwork: Artwork) => void;
  onAddArtworkClick: () => void;
  onDragStart: (artwork: Artwork) => void;
  onTouchStart: (artwork: Artwork, event: React.TouchEvent) => void;
  onArtworkDelete: (artworkId: number) => void;
}

const PlusIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-zinc-500 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
);

const ProductSelector: React.FC<ProductSelectorProps> = ({ artworks, selectedArtwork, onArtworkSelect, onAddArtworkClick, onDragStart, onTouchStart, onArtworkDelete }) => {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-zinc-700 dark:text-zinc-300">1: Artwork</h3>
      <div className="grid grid-cols-1 gap-4">
        {artworks.map(artwork => (
          <ObjectCard
            key={artwork.id}
            artwork={artwork}
            isSelected={selectedArtwork?.id === artwork.id}
            onSelect={onArtworkSelect}
            onDragStart={(p, e) => onDragStart(p)}
            onTouchStart={onTouchStart}
            onDelete={onArtworkDelete}
          />
        ))}
        <button
          onClick={onAddArtworkClick}
          className="w-full aspect-square bg-zinc-100 dark:bg-zinc-800 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-400 hover:border-blue-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          aria-label="Add new artwork"
        >
          <PlusIcon />
          <span className="mt-1 text-sm font-semibold">Add New</span>
        </button>
      </div>
    </div>
  );
};

export default ProductSelector;