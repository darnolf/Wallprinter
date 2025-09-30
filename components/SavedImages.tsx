/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';

export interface SavedImage {
  id: number;
  url: string;
  name: string;
}

interface SavedImagesProps {
  images: SavedImage[];
  onDelete: (id: number) => void;
  onImageClick: (index: number) => void;
}

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);


const SavedImages: React.FC<SavedImagesProps> = ({ images, onDelete, onImageClick }) => {
    if (images.length === 0) {
        return null;
    }

  return (
    <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-700">
        <h3 className="text-xl font-semibold text-zinc-800 dark:text-zinc-200 mb-6">Saved Images</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-2 gap-4">
            {images.map((image, index) => (
                <div key={image.id} className="group relative rounded-lg overflow-hidden shadow-md bg-zinc-100 dark:bg-zinc-800 aspect-square">
                    <button onClick={() => onImageClick(index)} className="w-full h-full" aria-label={`View larger image for ${image.name}`}>
                        <img src={image.url} alt={image.name} className="w-full h-full object-cover" />
                    </button>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-3 pointer-events-none">
                        <p className="text-white text-xs font-semibold truncate">{image.name}.jpg</p>
                    </div>
                    <div className="absolute bottom-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a
                            href={image.url}
                            download={`${image.name}.jpg`}
                            onClick={e => e.stopPropagation()}
                            className="p-1.5 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
                            aria-label={`Download ${image.name}`}
                        >
                            <DownloadIcon />
                        </a>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(image.id);
                            }}
                            className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                            aria-label={`Delete ${image.name}`}
                        >
                            <TrashIcon />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};

export default SavedImages;