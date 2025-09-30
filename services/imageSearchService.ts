/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export interface PexelsImage {
    id: number;
    width: number;
    height: number;
    url: string;
    photographer: string;
    photographer_url: string;
    photographer_id: number;
    avg_color: string;
    src: {
      original: string;
      large2x: string;
      large: string;
      medium: string;
      small: string;
      portrait: string;
      landscape: string;
      tiny: string;
    };
    liked: boolean;
    alt: string;
}

interface PexelsResponse {
    page: number;
    per_page: number;
    photos: PexelsImage[];
    total_results: number;
    next_page: string;
}

/**
 * Searches for images on Pexels using the provided query.
 * @param query The search term.
 * @returns A promise that resolves to an array of PexelsImage objects.
 */
export const searchImages = async (query: string): Promise<PexelsImage[]> => {
    const apiKey = import.meta.env?.VITE_PEXELS_API_KEY;
    if (!apiKey || apiKey === 'YOUR_PEXELS_API_KEY_HERE') {
        throw new Error("Pexels API key is not configured. Please add your VITE_PEXELS_API_KEY to your .env file.");
    }

    const API_URL = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=15`;

    const response = await fetch(API_URL, {
        headers: {
            Authorization: apiKey,
        },
    });

    if (!response.ok) {
        if (response.status === 401) {
            throw new Error("Authentication failed. Please check your Pexels API key.");
        }
        throw new Error(`Failed to fetch images from Pexels. Status: ${response.status}`);
    }

    const data: PexelsResponse = await response.json();
    return data.photos;
};