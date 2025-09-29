/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import Spinner from './Spinner';

interface SceneEditPreviewModalProps {
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;
  originalUrl: string | null;
  editedUrl: string | null;
  onClose: () => void;
  onApprove: () => void;
}

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const SceneEditPreviewModal: React.FC<SceneEditPreviewModalProps> = ({ isOpen, isLoading, error, originalUrl, editedUrl, onClose, onApprove }) => {
  if (!isOpen) {
    return null;
  }

  const handleModalContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="bg-white dark:bg-zinc-800 rounded-xl shadow-2xl w-full max-w-6xl p-6 md:p-8 relative transform transition-all flex flex-col"
        style={{ maxHeight: '90vh' }}
        onClick={handleModalContentClick}
        role="document"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white transition-colors z-10"
          aria-label="Close modal"
        >
          <CloseIcon />
        </button>
        <div className="text-center mb-6 flex-shrink-0">
          <h2 className="text-2xl font-extrabold text-zinc-800 dark:text-zinc-100">Scene Edit Preview</h2>
        </div>
        
        <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto min-h-0">
          {isLoading ? (
            <div className="md:col-span-2 flex flex-col items-center justify-center h-full min-h-[40vh]">
              <Spinner />
              <p className="mt-4 text-zinc-600 dark:text-zinc-400 font-semibold">Editing your scene, please wait...</p>
            </div>
          ) : error ? (
            <div className="md:col-span-2 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-md h-fit">
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center">
                <h3 className="text-lg font-bold text-zinc-600 dark:text-zinc-400 mb-2">Original</h3>
                <div className="w-full aspect-video bg-zinc-100 dark:bg-zinc-700/50 rounded-lg overflow-hidden border dark:border-zinc-700">
                  <img src={originalUrl ?? ''} alt="Original scene" className="w-full h-full object-contain" />
                </div>
              </div>
              <div className="flex flex-col items-center">
                <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200 mb-2">Edited</h3>
                <div className="w-full aspect-video bg-zinc-100 dark:bg-zinc-700/50 rounded-lg overflow-hidden border-2 border-blue-500">
                  <img src={editedUrl ?? ''} alt="Edited scene" className="w-full h-full object-contain" />
                </div>
              </div>
            </>
          )}
        </div>
        
        {!isLoading && (
            <div className="mt-6 flex-shrink-0 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                    onClick={onClose}
                    className="w-full sm:w-auto bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200 font-bold py-3 px-8 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-400 transition-all duration-300"
                >
                    Discard
                </button>
                <button
                    onClick={onApprove}
                    disabled={!!error || !editedUrl}
                    className="w-full sm:w-auto bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 font-bold py-3 px-8 rounded-lg shadow-md hover:bg-zinc-900 dark:hover:bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-500 transition-all duration-300 disabled:bg-zinc-400 disabled:cursor-not-allowed"
                >
                    Approve & Use This Scene
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default SceneEditPreviewModal;