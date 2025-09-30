/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect } from 'react';
import { generateArtworkFromPrompt } from '../services/geminiService';
import { searchImages, PexelsImage } from '../services/imageSearchService';
import Spinner from './Spinner';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddArtwork: (name: string, file: File) => void;
}

type ActiveTab = 'upload' | 'generate' | 'search';

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-zinc-500 dark:text-zinc-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const SearchIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
    </svg>
);

const AddProductModal: React.FC<AddProductModalProps> = ({ isOpen, onClose, onAddArtwork }) => {
  const [artworkName, setArtworkName] = useState('');
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState<ActiveTab>('upload');
  
  // State for AI generation
  const [generationPrompt, setGenerationPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // State for Image Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PexelsImage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedPexelsImage, setSelectedPexelsImage] = useState<PexelsImage | null>(null);

  const VITE_PEXELS_API_KEY = import.meta.env?.VITE_PEXELS_API_KEY;
  const isPexelsConfigured = VITE_PEXELS_API_KEY && VITE_PEXELS_API_KEY !== 'YOUR_PEXELS_API_KEY_HERE';

  const VITE_API_KEY = import.meta.env?.VITE_API_KEY;
  const isGeminiConfigured = VITE_API_KEY && VITE_API_KEY !== 'YOUR_API_KEY_HERE';

  // Reset state when modal is opened/closed
  useEffect(() => {
    if (isOpen) {
        setArtworkName('');
        setArtworkFile(null);
        setPreviewUrl(null);
        setError(null);
        setActiveTab('upload');
        setGenerationPrompt('');
        setIsGenerating(false);
        setGenerationError(null);
        setSearchQuery('');
        setSearchResults([]);
        setIsSearching(false);
        setSearchError(null);
        setSelectedPexelsImage(null);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const resetCommonErrors = () => {
    setError(null);
    setGenerationError(null);
    setSearchError(null);
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setError('Please select a PNG, JPG, or WEBP file.');
        return;
      }
      resetCommonErrors();
      setArtworkFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      if (!artworkName) {
        setArtworkName(file.name.replace(/\.[^/.]+$/, ""));
      }
      setSelectedPexelsImage(null);
    }
  };

  const handleGenerateClick = async () => {
    if (!generationPrompt.trim() || !isGeminiConfigured) return;

    setIsGenerating(true);
    resetCommonErrors();
    setPreviewUrl(null);
    setArtworkFile(null);
    setSelectedPexelsImage(null);

    try {
        const { file, url } = await generateArtworkFromPrompt(generationPrompt);
        setArtworkFile(file);
        setPreviewUrl(url);
        if (!artworkName.trim()) {
            setArtworkName(generationPrompt);
        }
    } catch (e: any) {
        console.error(e);
        setGenerationError(`Generation failed: ${e.message}`);
    } finally {
        setIsGenerating(false);
    }
  };

  const executeSearch = async () => {
    if (!searchQuery.trim()) {
        setSearchError("Please enter a search term.");
        return;
    }
    
    setIsSearching(true);
    resetCommonErrors();
    setSearchResults([]);

    try {
        const results = await searchImages(searchQuery);
        setSearchResults(results);
        if (results.length === 0) {
            setSearchError("No results found. Try a different search term.");
        }
    } catch (e: any) {
        console.error(e);
        setSearchError(`Search failed: ${e.message}`);
    } finally {
        setIsSearching(false);
    }
  };

  const handlePexelsImageSelect = (image: PexelsImage) => {
    resetCommonErrors();
    setSelectedPexelsImage(image);
    setPreviewUrl(image.src.large); // Use large for preview
    if (!artworkName.trim()) {
        setArtworkName(image.alt || `Artwork by ${image.photographer}`);
    }
    // We'll convert to a file on final submit
    setArtworkFile(null); 
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artworkName.trim()) {
      setError('Please provide a name for the artwork.');
      return;
    }
    
    // If a pexels image is selected, fetch it and convert to a file first.
    if (selectedPexelsImage && !artworkFile) {
        try {
            const response = await fetch(selectedPexelsImage.src.original);
            const blob = await response.blob();
            const file = new File([blob], `${artworkName.replace(/\s/g, '_')}.jpg`, { type: blob.type });
            onAddArtwork(artworkName, file);
        } catch (err) {
            console.error("Failed to fetch Pexels image", err);
            setError("Could not download the selected image. Please try again.");
        }
        return;
    }
    
    if (!artworkFile) {
        setError("Please upload, generate, or select an image.");
        return;
    }

    onAddArtwork(artworkName, artworkFile);
  };

  const handleModalContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
        handleFileChange({ target: { files: [file] } } as any);
    }
  };

  const TabButton: React.FC<{ tabId: ActiveTab; children: React.ReactNode }> = ({ tabId, children }) => (
    <button
        type="button"
        onClick={() => setActiveTab(tabId)}
        className={`w-1/3 py-3 text-sm font-bold transition-colors ${
            activeTab === tabId
                ? 'text-zinc-800 dark:text-white border-b-2 border-zinc-800 dark:border-white'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
        }`}
        role="tab"
        aria-selected={activeTab === tabId}
    >
        {children}
    </button>
  );

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="bg-white dark:bg-zinc-800 rounded-xl shadow-2xl w-full max-w-lg p-6 md:p-8 relative transform transition-all flex flex-col"
        onClick={handleModalContentClick}
        role="document"
        style={{ maxHeight: '90vh' }}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white transition-colors z-10"
          aria-label="Close modal"
        >
          <CloseIcon />
        </button>
        <div className="text-center mb-6 flex-shrink-0">
          <h2 className="text-2xl font-extrabold text-zinc-800 dark:text-zinc-100">Add New Artwork</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6 flex-grow flex flex-col min-h-0">
          {/* Tabs */}
          <div className="flex border-b border-zinc-200 dark:border-zinc-700 mb-6 flex-shrink-0" role="tablist">
              <TabButton tabId="upload">Upload File</TabButton>
              <TabButton tabId="generate">Generate with AI</TabButton>
              <TabButton tabId="search">Search Online</TabButton>
          </div>

          {/* Tab Content */}
          <div className="flex-grow space-y-6 overflow-y-auto pr-2 -mr-2">
            <div className={activeTab === 'upload' ? 'block' : 'hidden'} role="tabpanel">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Artwork Image
                </label>
                <div
                className="w-full aspect-video bg-zinc-100 dark:bg-zinc-700/50 border-2 border-dashed rounded-lg flex items-center justify-center transition-colors duration-300 relative overflow-hidden cursor-pointer hover:border-blue-500"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                >
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/png, image/jpeg, image/webp" className="hidden" />
                    {!previewUrl && (
                        <div className="text-center text-zinc-500 dark:text-zinc-400 p-4">
                            <UploadIcon />
                            <p>Click to upload or drag & drop</p>
                            <p className="text-xs mt-1">PNG, JPG, or WEBP</p>
                        </div>
                    )}
                    {previewUrl && !selectedPexelsImage && <img src={previewUrl} alt="Artwork preview" className="w-full h-full object-contain" />}
                </div>
            </div>

            <div className={activeTab === 'generate' ? 'block space-y-4' : 'hidden'} role="tabpanel">
                {!isGeminiConfigured ? (
                    <div className="text-center p-4 bg-zinc-100 dark:bg-zinc-700/50 rounded-lg">
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            AI artwork generation is disabled.
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                            To enable it, please add your Gemini API key as <code>VITE_API_KEY</code> in a <code>.env</code> file.
                        </p>
                    </div>
                ) : (
                    <>
                        <div>
                            <label htmlFor="generationPrompt" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            Describe the artwork you want to create
                            </label>
                            <textarea
                                id="generationPrompt"
                                value={generationPrompt}
                                onChange={(e) => setGenerationPrompt(e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g., A vibrant oil painting of a futuristic city at sunset"
                                rows={3}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={handleGenerateClick}
                            disabled={isGenerating || !generationPrompt.trim()}
                            className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isGenerating ? <><Spinner /> Generating...</> : '✨ Generate Artwork'}
                        </button>
                        {generationError && <p className="text-sm text-red-600 animate-fade-in">{generationError}</p>}
                    </>
                )}
            </div>

            <div className={activeTab === 'search' ? 'block space-y-4' : 'hidden'} role="tabpanel">
                {!isPexelsConfigured ? (
                    <div className="text-center p-4 bg-zinc-100 dark:bg-zinc-700/50 rounded-lg">
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            The image search feature is disabled.
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                            To enable it, please add your Pexels API key as <code>VITE_PEXELS_API_KEY</code> in a <code>.env</code> file.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        executeSearch();
                                    }
                                }}
                                placeholder="Search for photos on Pexels..."
                                className="flex-grow px-3 py-2 bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button 
                                type="button" 
                                onClick={executeSearch} 
                                disabled={isSearching || !searchQuery.trim()} 
                                className="bg-blue-600 text-white font-bold p-2 rounded-lg shadow-md hover:bg-blue-700 disabled:bg-blue-400"
                            >
                               <SearchIcon />
                            </button>
                        </div>
                        {searchError && <p className="text-sm text-red-600 animate-fade-in">{searchError}</p>}
                        {isSearching && <div className="flex justify-center py-8"><Spinner /></div>}
                        <div className="grid grid-cols-3 gap-2">
                            {searchResults.map(image => (
                                <button
                                    type="button"
                                    key={image.id}
                                    onClick={() => handlePexelsImageSelect(image)}
                                    className={`aspect-square rounded-md overflow-hidden transition-all focus:outline-none ${selectedPexelsImage?.id === image.id ? 'ring-4 ring-blue-500 scale-105' : 'hover:scale-105 focus:ring-4 focus:ring-blue-500'}`}
                                >
                                    <img src={image.src.tiny} alt={image.alt} className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>
            
            {(previewUrl || isGenerating) && activeTab !== 'upload' && (
              <div className="w-full aspect-video bg-zinc-100 dark:bg-zinc-700/50 border-2 border-dashed rounded-lg flex items-center justify-center transition-colors duration-300 relative overflow-hidden flex-shrink-0">
                {isGenerating && (
                  <div className="absolute inset-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                    <Spinner />
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Creating your vision...</p>
                  </div>
                )}
                {previewUrl && <img src={previewUrl} alt="Artwork preview" className="w-full h-full object-contain" />}
              </div>
            )}
            
            <div className="flex-shrink-0">
              <label htmlFor="artworkName" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Artwork Name
              </label>
              <input
                type="text"
                id="artworkName"
                value={artworkName}
                onChange={(e) => setArtworkName(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter a name for the artwork"
                required
              />
            </div>
          </div>
          
          <div className="flex-shrink-0 pt-6">
            {error && <p className="text-sm text-red-600 animate-fade-in mb-4">{error}</p>}
            <button
              type="submit"
              disabled={!artworkName || (!artworkFile && !selectedPexelsImage)}
              className="w-full bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 font-bold py-3 px-4 rounded-lg shadow-md hover:bg-zinc-900 dark:hover:bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-500 transition-all duration-300 disabled:bg-zinc-400 disabled:cursor-not-allowed"
            >
              Add Artwork to Library
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProductModal;