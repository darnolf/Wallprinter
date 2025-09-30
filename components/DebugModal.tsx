/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';

interface DebugModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  prompt: string | null;
}

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const DebugModal: React.FC<DebugModalProps> = ({ isOpen, onClose, imageUrl, prompt }) => {
  if (!isOpen || !imageUrl) {
    return null;
  }

  const handleModalContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="bg-white dark:bg-zinc-800 rounded-xl shadow-2xl w-full max-w-4xl p-6 md:p-8 relative transform transition-all flex flex-col"
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
        <div className="text-center mb-4 flex-shrink-0">
          <h2 className="text-2xl font-extrabold text-zinc-800 dark:text-zinc-100">Debug View</h2>
        </div>
        
        <div className="flex flex-col gap-4 overflow-y-auto">
          <div>
            <p className="text-zinc-600 dark:text-zinc-400 mb-2">This is the crude pre-composite image sent to the AI. It defines the exact boundaries for the artwork.</p>
            <div className="rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-900">
                <img src={imageUrl} alt="Debug view of the pre-composite image" className="w-full h-full object-contain" />
            </div>
          </div>
          
          {prompt && (
            <div>
                <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200 mb-2">Final Prompt to Image Model</h3>
                <pre className="bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 p-4 rounded-lg text-xs whitespace-pre-wrap">
                    <code>{prompt}</code>
                </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DebugModal;