/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import Spinner from './Spinner';

interface SceneEditorProps {
    isEditing: boolean;
    onApplyEdit: (prompt: string) => void;
}

const SceneEditor: React.FC<SceneEditorProps> = ({ isEditing, onApplyEdit }) => {
    const [prompt, setPrompt] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (prompt.trim()) {
            onApplyEdit(prompt.trim());
        }
    };

    return (
        <div className="space-y-4 p-6 bg-zinc-100/80 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
            <div className="flex flex-col">
                <h3 className="text-xl font-semibold text-zinc-700 dark:text-zinc-300">2a: Prepare Scene (Optional)</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                    Enter a prompt to modify the scene before placing your artwork.
                </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder='e.g., "remove the chair on the left", "close the window blinds", "make the wall white"'
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    rows={3}
                    disabled={isEditing}
                />
                <button
                    type="submit"
                    disabled={isEditing || !prompt.trim()}
                    className="w-full sm:w-auto bg-zinc-600 text-white dark:bg-zinc-500 dark:hover:bg-zinc-400 font-bold py-2 px-6 rounded-lg shadow-sm hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-500 transition-all duration-300 disabled:bg-zinc-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isEditing ? (
                        <>
                            <Spinner /> Applying...
                        </>
                    ) : (
                        'Apply Edit'
                    )}
                </button>
            </form>
        </div>
    );
};

export default SceneEditor;