/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useCallback } from 'react';
import { SavedImage } from './SavedImages';

interface SavedImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: SavedImage[];
  startIndex: number;
}

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const ChevronLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
);

const ChevronRightIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
);

const SavedImageViewerModal: React.FC<SavedImageViewerModalProps> = ({ isOpen, onClose, images, startIndex }) => {
    const [currentIndex, setCurrentIndex] = useState(startIndex);

    useEffect(() => {
        if(isOpen) {
            setCurrentIndex(startIndex);
        }
    }, [isOpen, startIndex]);

    const handleNext = useCallback(() => {
        if (images.length > 1) {
            setCurrentIndex(prev => (prev + 1) % images.length);
        }
    }, [images.length]);

    const handlePrev = useCallback(() => {
        if (images.length > 1) {
            setCurrentIndex(prev => (prev - 1 + images.length) % images.length);
        }
    }, [images.length]);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose, handleNext, handlePrev]);


    if (!isOpen || images.length === 0) {
        return null;
    }
    
    const currentImage = images[currentIndex];
    
    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4 animate-fade-in" 
            onClick={onClose} 
            role="dialog" 
            aria-modal="true"
            aria-labelledby="image-viewer-title"
        >
            <div 
                className="relative bg-zinc-900/70 backdrop-blur-sm rounded-lg shadow-2xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col" 
                onClick={e => e.stopPropagation()}
                role="document"
            >
                <div className="flex-shrink-0 flex items-center justify-between p-3 border-b border-zinc-700">
                    <h2 id="image-viewer-title" className="text-white font-semibold truncate pr-4">{currentImage.name}.jpg</h2>
                    <button 
                        onClick={onClose} 
                        className="text-zinc-400 hover:text-white transition-colors"
                        aria-label="Close image viewer"
                    >
                        <CloseIcon />
                    </button>
                </div>

                <div className="flex-grow relative flex items-center justify-center min-h-0 p-4">
                    <img src={currentImage.url} alt={currentImage.name} className="max-w-full max-h-full object-contain select-none"/>
                </div>

                {images.length > 1 && (
                    <>
                        <button 
                            onClick={handlePrev} 
                            className="absolute left-0 md:left-4 top-1/2 -translate-y-1/2 p-2 bg-black/30 text-white rounded-full hover:bg-black/50 transition-all focus:outline-none focus:ring-2 focus:ring-white"
                            aria-label="Previous image"
                        >
                            <ChevronLeftIcon />
                        </button>
                        <button 
                            onClick={handleNext} 
                            className="absolute right-0 md:right-4 top-1/2 -translate-y-1/2 p-2 bg-black/30 text-white rounded-full hover:bg-black/50 transition-all focus:outline-none focus:ring-2 focus:ring-white"
                            aria-label="Next image"
                        >
                            <ChevronRightIcon />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

export default SavedImageViewerModal;
