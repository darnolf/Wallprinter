/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useCallback, useEffect, useRef } from 'react';
import Header from './components/Header';
import ProductSelector from './components/ProductSelector';
import ImageUploader from './components/ImageUploader';
import Spinner from './components/Spinner';
import AddProductModal from './components/AddProductModal';
import DebugModal from './components/DebugModal';
import TouchGhost from './components/TouchGhost';
import SavedImages, { SavedImage } from './components/SavedImages';
import SavedImageViewerModal from './components/SavedImageViewerModal';
import SceneEditor from './components/SceneEditor';
import SceneEditPreviewModal from './components/SceneEditPreviewModal';
import { Artwork, PlacementArea } from './types';
import { generateMuralOnScene, editSceneWithPrompt } from './services/geminiService';

type Theme = 'light' | 'dark';

function App() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);
  const [sceneImageFile, setSceneImageFile] = useState<File | null>(null);
  const [sceneImageUrl, setSceneImageUrl] = useState<string | null>(null);
  const [placementAreaPoints, setPlacementAreaPoints] = useState<PlacementArea | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [debugImageUrl, setDebugImageUrl] = useState<string | null>(null);
  const [finalPrompt, setFinalPrompt] = useState<string | null>(null);
  const [isDebugModalOpen, setIsDebugModalOpen] = useState<boolean>(false);
  const [isAddArtworkModalOpen, setIsAddArtworkModalOpen] = useState<boolean>(false);
  const [draggedArtwork, setDraggedArtwork] = useState<Artwork | null>(null);
  const [touchGhost, setTouchGhost] = useState<{ imageUrl: string | null; position: { x: number; y: number } | null }>({ imageUrl: null, position: null });
  const [savedImages, setSavedImages] = useState<SavedImage[]>([]);
  const [saveCounter, setSaveCounter] = useState<number>(0);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState<boolean>(false);
  const [viewerStartIndex, setViewerStartIndex] = useState<number>(0);
  const sceneUploaderRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<Theme>('light');

  // New state for scene editing
  const [isEditingScene, setIsEditingScene] = useState<boolean>(false);
  const [sceneEditError, setSceneEditError] = useState<string | null>(null);
  const [editedScenePreviewUrl, setEditedScenePreviewUrl] = useState<string | null>(null);
  const [editedSceneFile, setEditedSceneFile] = useState<File | null>(null);
  const [isEditPreviewModalOpen, setIsEditPreviewModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  useEffect(() => {
    const handleTouchMove = (event: TouchEvent) => {
      if (touchGhost.imageUrl && event.touches.length > 0) {
        setTouchGhost(prev => ({ ...prev, position: { x: event.touches[0].clientX, y: event.touches[0].clientY } }));
      }
    };
    window.addEventListener('touchmove', handleTouchMove);
    return () => window.removeEventListener('touchmove', handleTouchMove);
  }, [touchGhost.imageUrl]);

  const handleArtworkSelect = (artwork: Artwork) => {
    setSelectedArtwork(artwork);
  };

  const handleFileSelect = (file: File) => {
    setSceneImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setSceneImageUrl(e.target?.result as string);
      setGeneratedImageUrl(null);
      setPlacementAreaPoints(null);
      setError(null);
      // Reset edit state as well
      setEditedScenePreviewUrl(null);
      setEditedSceneFile(null);
      setSceneEditError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleAreaUpdate = (points: PlacementArea | null) => {
    setPlacementAreaPoints(points);
  };

  const handleAddArtwork = (name: string, file: File) => {
    const newArtwork: Artwork = {
      id: Date.now(),
      name: name,
      imageUrl: URL.createObjectURL(file),
    };
    setArtworks(prev => [...prev, newArtwork]);
    setSelectedArtwork(newArtwork);
    setIsAddArtworkModalOpen(false);
  };

  const handleDeleteArtwork = (artworkId: number) => {
    const newArtworks = artworks.filter(p => p.id !== artworkId);
    setArtworks(newArtworks);

    if (selectedArtwork?.id === artworkId) {
      setSelectedArtwork(newArtworks[0] || null);
    }
  };
  
  const handleApplySceneEdit = async (prompt: string) => {
    if (!sceneImageFile || !prompt) return;
    setIsEditingScene(true);
    setSceneEditError(null);
    setIsEditPreviewModalOpen(true);
    try {
        const { editedFile, editedUrl } = await editSceneWithPrompt(sceneImageFile, prompt);
        setEditedSceneFile(editedFile);
        setEditedScenePreviewUrl(editedUrl);
    } catch (e: any) {
        console.error(e);
        setSceneEditError(`Scene editing failed: ${e.message}`);
    } finally {
        setIsEditingScene(false);
    }
  };
  
  const handleApproveSceneEdit = () => {
    if (!editedSceneFile || !editedScenePreviewUrl) return;

    setSceneImageFile(editedSceneFile);
    setSceneImageUrl(editedScenePreviewUrl);
    
    // Reset mask as the scene has changed
    setPlacementAreaPoints(null);
    handleDiscardSceneEdit(); // Close modal and clear temp state
  };
  
  const handleDiscardSceneEdit = () => {
    setIsEditPreviewModalOpen(false);
    setEditedSceneFile(null);
    setEditedScenePreviewUrl(null);
    setSceneEditError(null);
  };


  const handleGenerateClick = async () => {
    if (!selectedArtwork || !sceneImageFile || !placementAreaPoints || placementAreaPoints.length < 3) {
      setError('Please select an artwork, upload a scene, and define a placement area (at least 3 points).');
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedImageUrl(null);
    try {
      const artworkFile = await fetch(selectedArtwork.imageUrl).then(r => r.blob()).then(blob => new File([blob], 'artwork.png', { type: 'image/png' }));

      const result = await generateMuralOnScene(artworkFile, sceneImageFile, placementAreaPoints);
      
      setGeneratedImageUrl(result.finalImageUrl);
      setDebugImageUrl(result.debugImageUrl);
      setFinalPrompt(result.finalPrompt);
    } catch (e: any) {
      console.error(e);
      setError(`Generation failed: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (draggedArtwork) {
        const dropzoneId = (event.target as HTMLElement).closest('[data-dropzone-id]')?.getAttribute('data-dropzone-id');
        if (dropzoneId === 'scene-uploader') {
            const rect = sceneUploaderRef.current?.getBoundingClientRect();
            if (!rect) return;
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            const shell = [
                { xPercent: (x / rect.width) * 100 - 5, yPercent: (y / rect.height) * 100 - 5 },
                { xPercent: (x / rect.width) * 100 + 5, yPercent: (y / rect.height) * 100 - 5 },
                { xPercent: (x / rect.width) * 100 + 5, yPercent: (y / rect.height) * 100 + 5 },
                { xPercent: (x / rect.width) * 100 - 5, yPercent: (y / rect.height) * 100 + 5 },
            ];
            setPlacementAreaPoints(shell);
        }
    }
    setDraggedArtwork(null);
  }, [draggedArtwork]);

  const handleTouchEnd = (event: TouchEvent) => {
    if (touchGhost.imageUrl) {
        const touch = event.changedTouches[0];
        const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
        const dropzoneId = targetElement?.closest('[data-dropzone-id]')?.getAttribute('data-dropzone-id');

        if (dropzoneId === 'scene-uploader') {
            const rect = sceneUploaderRef.current?.getBoundingClientRect();
            if (!rect) return;
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;

            const shell = [
                { xPercent: (x / rect.width) * 100 - 5, yPercent: (y / rect.height) * 100 - 5 },
                { xPercent: (x / rect.width) * 100 + 5, yPercent: (y / rect.height) * 100 - 5 },
                { xPercent: (x / rect.width) * 100 + 5, yPercent: (y / rect.height) * 100 + 5 },
                { xPercent: (x / rect.width) * 100 - 5, yPercent: (y / rect.height) * 100 + 5 },
            ];
            setPlacementAreaPoints(shell);
        }
    }
    setTouchGhost({ imageUrl: null, position: null });
    window.removeEventListener('touchend', handleTouchEnd);
  };
  
  const handleDragStart = (artwork: Artwork) => {
    setDraggedArtwork(artwork);
    setSelectedArtwork(artwork);
  };

  const handleTouchStart = (artwork: Artwork, event: React.TouchEvent) => {
    setSelectedArtwork(artwork);
    setTouchGhost({
        imageUrl: artwork.imageUrl,
        position: { x: event.touches[0].clientX, y: event.touches[0].clientY }
    });
    window.addEventListener('touchend', handleTouchEnd, { once: true });
  };

  const handleResetMask = () => {
    setPlacementAreaPoints(null);
  };

  const handleResetScene = () => {
    setSceneImageFile(null);
    setSceneImageUrl(null);
    setPlacementAreaPoints(null);
    setGeneratedImageUrl(null);
    setError(null);
    const sceneUploaderInput = document.getElementById('scene-uploader-input') as HTMLInputElement;
    if (sceneUploaderInput) {
        sceneUploaderInput.value = "";
    }
    // Reset scene editing state
    setEditedScenePreviewUrl(null);
    setEditedSceneFile(null);
    setSceneEditError(null);
    setIsEditingScene(false);
    setIsEditPreviewModalOpen(false);
  };

  const handleSaveImage = () => {
    if (!generatedImageUrl) return;

    const date = new Date();
    const dateStr = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
    const filename = `wallprinter_${dateStr}-${saveCounter.toString().padStart(3, '0')}`;
    
    const newSavedImage: SavedImage = {
        id: Date.now(),
        url: generatedImageUrl,
        name: filename,
    };

    setSavedImages(prev => [newSavedImage, ...prev]);
    setSaveCounter(prev => prev + 1);
  };
  
  const handleDeleteSavedImage = (id: number) => {
    setSavedImages(images => images.filter(img => img.id !== id));
  };
  
  const handleOpenImageViewer = (index: number) => {
    setViewerStartIndex(index);
    setIsImageViewerOpen(true);
  };

  return (
    <div className="bg-zinc-50 dark:bg-zinc-900 min-h-screen font-sans" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
      <div className="container mx-auto px-4 py-8">
        <Header theme={theme} onToggleTheme={toggleTheme} />
        
        <main className="mt-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            
            {/* Left Column: Artwork Selection */}
            <div className="lg:col-span-1">
              <ProductSelector
                artworks={artworks}
                selectedArtwork={selectedArtwork}
                onArtworkSelect={handleArtworkSelect}
                onAddArtworkClick={() => setIsAddArtworkModalOpen(true)}
                onDragStart={handleDragStart}
                onTouchStart={handleTouchStart}
                onArtworkDelete={handleDeleteArtwork}
              />
            </div>

            {/* Right Column: Scene and Generation */}
            <div className="lg:col-span-2 space-y-8">
              <ImageUploader
                ref={sceneUploaderRef}
                id="scene-uploader"
                label="Step 2: Upload a Scene & Define Area"
                onFileSelect={handleFileSelect}
                imageUrl={sceneImageUrl}
                isEditableArea={!!sceneImageUrl}
                points={placementAreaPoints}
                onAreaUpdate={handleAreaUpdate}
              />

              {sceneImageUrl && <SceneEditor onApplyEdit={handleApplySceneEdit} isEditing={isEditingScene} />}
                
              {/* Action Buttons */}
              {sceneImageUrl && (
                <div className="flex flex-col items-center justify-center gap-4">
                   <h3 className="text-xl font-semibold text-zinc-700 dark:text-zinc-300 self-center">Step 3: Generate Image</h3>
                  <div className="w-full flex flex-col sm:flex-row flex-wrap items-center justify-center gap-4">
                    <button
                      onClick={handleGenerateClick}
                      disabled={isLoading || !placementAreaPoints || placementAreaPoints.length < 3}
                      className="w-full sm:w-auto bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 font-bold py-3 px-8 rounded-lg shadow-md hover:bg-zinc-900 dark:hover:bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-500 dark:focus:ring-zinc-400 transition-all duration-300 disabled:bg-zinc-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isLoading ? 'Generating...' : '✨ Generate Image'}
                    </button>
                     <button
                        onClick={handleResetMask}
                        disabled={isLoading || !placementAreaPoints}
                        className="w-full sm:w-auto bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200 font-bold py-3 px-6 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-400 transition-all duration-300 disabled:bg-zinc-400/50 disabled:text-zinc-500 disabled:cursor-not-allowed"
                      >
                          Reset Mask
                      </button>
                      <button
                        onClick={handleResetScene}
                        disabled={isLoading}
                        className="w-full sm:w-auto bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200 font-bold py-3 px-6 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-400 transition-all duration-300"
                      >
                          Reset Scene
                      </button>
                  </div>
                </div>
              )}
              
              {/* Error Display */}
              {error && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-md animate-fade-in" role="alert">
                  <p className="font-bold">Error</p>
                  <p>{error}</p>
                </div>
              )}

              {/* Loading and Result Display */}
              <div className="w-full aspect-video bg-zinc-100 dark:bg-zinc-800 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg flex items-center justify-center relative overflow-hidden">
                {isLoading && (
                  <div className="absolute inset-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 animate-fade-in">
                    <Spinner />
                    <p className="mt-4 text-zinc-600 dark:text-zinc-400 font-semibold">Placing your artwork, this can take a moment...</p>
                  </div>
                )}
                {generatedImageUrl ? (
                    <img src={generatedImageUrl} alt="Generated scene" className="w-full h-full object-contain" />
                ) : (
                    !isLoading && <p className="text-zinc-500 dark:text-zinc-400">Your generated image will appear here</p>
                )}
              </div>
              
              {/* Result Action Buttons */}
              {generatedImageUrl && !isLoading && (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 -mt-4">
                  <button
                      onClick={handleSaveImage}
                      className="w-full sm:w-auto bg-blue-600 text-white font-bold py-3 px-8 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 flex items-center justify-center gap-2"
                  >
                      Save Image
                  </button>
                  <button
                      onClick={() => setIsDebugModalOpen(true)}
                      className="w-full sm:w-auto bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200 font-bold py-3 px-6 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-400 transition-all duration-300"
                  >
                      Show Debug View
                  </button>
                </div>
              )}
            </div>
          </div>
          <SavedImages images={savedImages} onDelete={handleDeleteSavedImage} onImageClick={handleOpenImageViewer} />
        </main>
      </div>

      <AddProductModal
        isOpen={isAddArtworkModalOpen}
        onClose={() => setIsAddArtworkModalOpen(false)}
        onAddArtwork={handleAddArtwork}
      />
      
      <DebugModal
        isOpen={isDebugModalOpen}
        onClose={() => setIsDebugModalOpen(false)}
        imageUrl={debugImageUrl}
        prompt={finalPrompt}
      />
      
      <SavedImageViewerModal
        isOpen={isImageViewerOpen}
        onClose={() => setIsImageViewerOpen(false)}
        images={savedImages}
        startIndex={viewerStartIndex}
      />

      <SceneEditPreviewModal
        isOpen={isEditPreviewModalOpen}
        isLoading={isEditingScene}
        error={sceneEditError}
        originalUrl={sceneImageUrl}
        editedUrl={editedScenePreviewUrl}
        onApprove={handleApproveSceneEdit}
        onClose={handleDiscardSceneEdit}
      />
      
      <TouchGhost 
        imageUrl={touchGhost.imageUrl}
        position={touchGhost.position}
      />
    </div>
  );
}

export default App;