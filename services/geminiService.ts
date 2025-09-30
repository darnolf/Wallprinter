/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";
import { PlacementArea } from '../types';

// Helper to load a File object into an HTMLImageElement
const loadImage = (file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            if (!event.target?.result) {
                return reject(new Error("Failed to read file."));
            }
            const img = new Image();
            img.src = event.target.result as string;
            img.onload = () => resolve(img);
            img.onerror = (err) => reject(new Error(`Image load error: ${err}`));
        };
        reader.onerror = (err) => reject(new Error(`File reader error: ${err}`));
    });
};

const fileToPart = async (file: File): Promise<{ inlineData: { mimeType: string; data: string; } }> => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
    
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
    
    const mimeType = mimeMatch[1];
    const data = arr[1];
    return { inlineData: { mimeType, data } };
};

const dataUrlToFile = async (dataUrl: string, filename: string, mimeType: string): Promise<File> => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], filename, { type: mimeType });
};


/**
 * Creates a "crude" composite image by pasting the artwork onto the scene
 * within the defined placement area. This serves as a precise guide for the AI.
 */
const createPreCompositeImage = async (artworkFile: File, sceneFile: File, placementArea: PlacementArea): Promise<string> => {
    const [artworkImg, sceneImg] = await Promise.all([loadImage(artworkFile), loadImage(sceneFile)]);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Could not get canvas context");

    canvas.width = sceneImg.naturalWidth;
    canvas.height = sceneImg.naturalHeight;

    // 1. Draw the original scene
    ctx.drawImage(sceneImg, 0, 0, canvas.width, canvas.height);

    if (placementArea && placementArea.length > 0) {
        // 2. Calculate bounding box of the polygon in pixels
        let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
        const pixelPoints = placementArea.map(p => {
            const px = (p.xPercent / 100) * canvas.width;
            const py = (p.yPercent / 100) * canvas.height;
            if (px < minX) minX = px;
            if (py < minY) minY = py;
            if (px > maxX) maxX = px;
            if (py > maxY) maxY = py;
            return { x: px, y: py };
        });
        const boxWidth = maxX - minX;
        const boxHeight = maxY - minY;

        if (boxWidth > 0 && boxHeight > 0) {
            // 3. Create a path for the polygon and clip to it
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(pixelPoints[0].x, pixelPoints[0].y);
            for (let i = 1; i < pixelPoints.length; i++) {
                ctx.lineTo(pixelPoints[i].x, pixelPoints[i].y);
            }
            ctx.closePath();
            ctx.clip();

            // 4. Draw the artwork scaled to fill the bounding box
            ctx.drawImage(artworkImg, minX, minY, boxWidth, boxHeight);
            
            // 5. Restore context to remove clipping mask
            ctx.restore();
        }
    }

    return canvas.toDataURL('image/png');
};

export const generateMuralOnScene = async (artworkFile: File, sceneFile: File, placementArea: PlacementArea) => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const preCompositeImageUrl = await createPreCompositeImage(artworkFile, sceneFile, placementArea);
    const preCompositeFile = await dataUrlToFile(preCompositeImageUrl, 'composite.png', 'image/png');

    const scenePart = await fileToPart(sceneFile);
    const compositePart = await fileToPart(preCompositeFile);

    const finalPrompt = `You are an expert photo editor. Your task is to seamlessly blend a piece of artwork onto a scene, making it look like a photorealistic mural. You will be given two images:
1.  The "Crude Composite": This image shows the original scene with the artwork crudely pasted in the correct location and boundaries. This defines the EXACT area you must work within.
2.  The "Original Scene": This is the clean, untouched scene for your reference.

CRITICAL RULES:
1.  BLEND THE ARTWORK: Your primary goal is to adjust the artwork from the "Crude Composite" to match the lighting, perspective, shadows, and texture of the "Original Scene". The result should look like the artwork was painted directly onto the surfaces.
2.  RESPECT BOUNDARIES: The artwork's placement in the "Crude Composite" is absolute. You MUST NOT modify any pixels outside of the area covered by the pasted artwork. The rest of the scene must be pixel-for-pixel identical to the "Original Scene".
3.  CONTENT-AWARE OCCLUSION: Use the "Original Scene" as a reference. If the artwork area in the "Crude Composite" covers features like windows, doors, furniture, or other objects, you MUST render the mural AROUND them. Do not paint over these objects. They must remain visible and untouched in the final output.
4.  NO ADDED EFFECTS: Do not add any artificial borders, frames, or drop shadows around the artwork. The goal is a seamless mural, not a hanging picture.

Your final output must be a single, photorealistic image that perfectly integrates the artwork into the scene according to these rules.`;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: {
        parts: [
          { text: finalPrompt },
          compositePart,
          scenePart
        ],
      },
      config: {
          responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    let finalImageUrl: string | null = null;
    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            const base64ImageBytes: string = part.inlineData.data;
            finalImageUrl = `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
        }
    }

    if (!finalImageUrl) throw new Error("The model did not return an image.");
    
    return {
        finalImageUrl,
        debugImageUrl: preCompositeImageUrl,
        finalPrompt,
    };
};

export const editSceneWithPrompt = async (sceneFile: File, prompt: string) => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const scenePart = await fileToPart(sceneFile);

    const fullPrompt = `You are an expert photo editor. Edit the following image based on this instruction: "${prompt}". Your output must only be the edited image, with no text.`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: {
            parts: [
                { text: fullPrompt },
                scenePart,
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    const part = response.candidates[0].content.parts[0];
    if (!part || !part.inlineData) {
        throw new Error("Model did not return an edited image.");
    }
    const { data, mimeType } = part.inlineData;
    const editedUrl = `data:${mimeType};base64,${data}`;
    const editedFile = await dataUrlToFile(editedUrl, 'edited-scene.png', mimeType);

    return { editedFile, editedUrl };
};

export const generateArtworkFromPrompt = async (prompt: string) => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
          aspectRatio: '1:1',
        },
    });
    
    const generatedImage = response.generatedImages[0];
    if (!generatedImage) {
        throw new Error("Artwork generation failed to produce an image.");
    }
    
    const base64ImageBytes: string = generatedImage.image.imageBytes;
    const url = `data:image/png;base64,${base64ImageBytes}`;
    const file = await dataUrlToFile(url, 'generated-artwork.png', 'image/png');

    return { file, url };
};
