/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (apiKey: string) => void;
  currentApiKey: string;
}

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave, currentApiKey }) => {
  const [apiKey, setApiKey] = useState(currentApiKey);

  useEffect(() => {
    setApiKey(currentApiKey);
  }, [currentApiKey, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(apiKey);
  };

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
        className="bg-white dark:bg-zinc-800 rounded-xl shadow-2xl w-full max-w-md p-6 md:p-8 relative transform transition-all"
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
        <div className="text-center mb-6">
          <h2 className="text-2xl font-extrabold text-zinc-800 dark:text-zinc-100">Settings</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="pexelsApiKey" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Pexels API Key
              </label>
              <input
                type="password"
                id="pexelsApiKey"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your Pexels API key"
              />
               <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                Required for the "Search Online" feature. Get your free key from the 
                <a href="https://www.pexels.com/api/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline"> Pexels API website</a>.
              </p>
            </div>

          <button
            type="submit"
            className="w-full bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 font-bold py-3 px-4 rounded-lg shadow-md hover:bg-zinc-900 dark:hover:bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-500 transition-all duration-300"
          >
            Save Settings
          </button>
        </form>
      </div>
    </div>
  );
};

export default SettingsModal;
