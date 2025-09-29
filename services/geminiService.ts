/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";
import { CornerPercent, PlacementArea } from '../types';

// Helper to get intrinsic image dimensions from a File object
const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            if (!event.target?.result) {
                return reject(new Error("Failed to read file."));
            }
            const img = new Image();
            img.src = event.target.result as string;
            img.onload = () => {
                resolve({ width: img.naturalWidth, height: img.naturalHeight });
            };
            img.onerror = (err) => reject(new Error(`Image load error: ${err}`));
        };
        reader.onerror = (err) => reject(new Error(`File reader error: ${err}`));
    });
};

// Helper to crop a square image back to an original aspect ratio, removing padding.
const cropToOriginalAspectRatio = (
    imageDataUrl: string,
    originalWidth: number,
    originalHeight: number,
    targetDimension: number
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = imageDataUrl;
        img.onload = () => {
            const aspectRatio = originalWidth / originalHeight;
            let contentWidth, contentHeight;
            if (aspectRatio > 1) { // Landscape
                contentWidth = targetDimension;
                contentHeight = targetDimension / aspectRatio;
            } else { // Portrait or square
                contentHeight = targetDimension;
                contentWidth = targetDimension * aspectRatio;
            }

            const x = (targetDimension - contentWidth) / 2;
            const y = (targetDimension - contentHeight) / 2;

            const canvas = document.createElement('canvas');
            canvas.width = contentWidth;
            canvas.height = contentHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context for cropping.'));
            }
            
            ctx.drawImage(img, x, y, contentWidth, contentHeight, 0, 0, contentWidth, contentHeight);
            resolve(canvas.toDataURL('image/jpeg', 0.95));
        };
        img.onerror = (err) => reject(new Error(`Image load error during cropping: ${err}`));
    });
};


// Resizes the image to fit within a square and adds padding.
const resizeImage = (file: File, targetDimension: number): Promise<File> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            if (!event.target?.result) {
                return reject(new Error("Failed to read file."));
            }
            const img = new Image();
            img.src = event.target.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = targetDimension;
                canvas.height = targetDimension;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Could not get canvas context.'));
                }

                ctx.fillStyle = '#808080'; // Use neutral grey for padding
                ctx.fillRect(0, 0, targetDimension, targetDimension);

                const aspectRatio = img.width / img.height;
                let newWidth, newHeight;

                if (aspectRatio > 1) {
                    newWidth = targetDimension;
                    newHeight = targetDimension / aspectRatio;
                } else {
                    newHeight = targetDimension;
                    newWidth = targetDimension * aspectRatio;
                }

                const x = (targetDimension - newWidth) / 2;
                const y = (targetDimension - newHeight) / 2;
                
                ctx.drawImage(img, x, y, newWidth, newHeight);

                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(new File([blob], file.name, {
                            type: 'image/png', // Use PNG for lossless quality for AI input
                            lastModified: Date.now()
                        }));
                    } else {
                        reject(new Error('Canvas to Blob conversion failed.'));
                    }
                }, 'image/png');
            };
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

const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

const dataUrlToFile = async (dataUrl: string, filename: string, mimeType: string): Promise<File> => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], filename, { type: mimeType });
};

// Helper to draw a solid magenta polygon on an image.
const createOverlayMaskedImage = async (
    sceneFile: File, 
    points: PlacementArea,
    originalDimensions: { originalWidth: number; originalHeight: number; }
): Promise<File> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(sceneFile);
        reader.onload = (event) => {
            if (!event.target?.result) {
                return reject(new Error("Failed to read file for drawing."));
            }
            const img = new Image();
            img.src = event.target.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const targetDimension = canvas.width;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Could not get canvas context for drawing.'));
                }
                ctx.drawImage(img, 0, 0);

                const { originalWidth, originalHeight } = originalDimensions;
                const aspectRatio = originalWidth / originalHeight;
                let contentWidth, contentHeight;

                if (aspectRatio > 1) {
                    contentWidth = targetDimension;
                    contentHeight = targetDimension / aspectRatio;
                } else {
                    contentHeight = targetDimension;
                    contentWidth = targetDimension * aspectRatio;
                }
                
                const offsetX = (targetDimension - contentWidth) / 2;
                const offsetY = (targetDimension - contentHeight) / 2;

                const getCanvasCoords = (point: CornerPercent) => {
                    const x = offsetX + (point.xPercent / 100) * contentWidth;
                    const y = offsetY + (point.yPercent / 100) * contentHeight;
                    return { x, y };
                };
                
                ctx.fillStyle = 'rgb(255, 0, 255)'; // Solid, opaque magenta

                // Draw Polygon
                if (points && points.length >= 3) {
                  const canvasPoints = points.map(getCanvasCoords);
                  ctx.beginPath();
                  ctx.moveTo(canvasPoints[0].x, canvasPoints[0].y);
                  for (let i = 1; i < canvasPoints.length; i++) {
                      ctx.lineTo(canvasPoints[i].x, canvasPoints[i].y);
                  }
                  ctx.closePath();
                  ctx.fill();
                } else {
                    return reject(new Error("Not enough points to draw the placement area."));
                }
                
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(new File([blob], `masked-${sceneFile.name}.png`, {
                            type: 'image/png',
                            lastModified: Date.now()
                        }));
                    } else {
                        reject(new Error('Canvas to Blob conversion failed during drawing.'));
                    }
                }, 'image/png');
            };
            img.onerror = (err) => reject(new Error(`Image load error during drawing: ${err}`));
        };
        reader.onerror = (err) => reject(new Error(`File reader error during drawing: ${err}`));
    });
};


/**
 * Generates a composite image by placing an artwork onto a user-defined area in a scene.
 * @param artworkImage The file for the artwork/mural to be placed.
 * @param sceneImage The file for the background environment.
 * @param points The polygon area defined by the user, with coordinates in percentages.
 * @returns A promise that resolves to an object containing the final image URL and a debug image URL.
 */
export const generateMuralOnScene = async (
    artworkImage: File, 
    sceneImage: File,
    points: PlacementArea
): Promise<{ finalImageUrl: string; debugImageUrl: string; finalPrompt: string; }> => {
  console.log('Starting mural generation process...');
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

  const { width: originalWidth, height: originalHeight } = await getImageDimensions(sceneImage);
  const MAX_DIMENSION = 1024;
  
  console.log('Resizing artwork and scene images...');
  const resizedArtworkImage = await resizeImage(artworkImage, MAX_DIMENSION);
  const resizedSceneImage = await resizeImage(sceneImage, MAX_DIMENSION);

  console.log('Creating overlay image for AI and debug view...');
  const overlayMaskedSceneImage = await createOverlayMaskedImage(resizedSceneImage, points, { originalWidth, originalHeight });
  const debugImageUrl = await fileToDataUrl(overlayMaskedSceneImage);

  const artworkImagePart = await fileToPart(resizedArtworkImage);
  const overlaySceneImagePart = await fileToPart(overlayMaskedSceneImage);
  const originalSceneImagePart = await fileToPart(resizedSceneImage);
  
  const prompt = `
You are a virtual decorator with expert photo-editing skills. Your task is to apply an ARTWORK as a full-wall mural that completely covers the specified area in an ORIGINAL SCENE, using a MASKED SCENE as a guide. The result must be photorealistic.

**Input Images (in order):**
1.  **ARTWORK:** The image to apply to the wall.
2.  **ORIGINAL SCENE:** The original, untouched photograph of the room. This is your absolute source of truth for all parts of the image that are not the wall being covered.
3.  **MASKED SCENE:** The same photo, but with a solid magenta area indicating the exact boundary for the mural.

**CRITICAL INSTRUCTIONS (MUST BE FOLLOWED PRECISELY):**
1.  **Mural Application:** The ARTWORK must be scaled and cropped as needed to COMPLETELY FILL the entire magenta area, edge to edge. The final result should look as if the wall itself has become the artwork.
2.  **Object Preservation (THE MOST IMPORTANT RULE):** Any objects from the ORIGINAL SCENE that are inside or touching the magenta area (e.g., windows, furniture, plants) **MUST BE PRESERVED PERFECTLY**. Use the ORIGINAL SCENE to see what these objects look like and meticulously restore them on top of the mural. The mural must appear to be behind them.
3.  **DO NOT ADD FRAMES:** Under no circumstances should you render the artwork as a hanging picture or add any kind of border, frame, or margin. The artwork IS the wall surface. This is non-negotiable.
4.  **Fidelity:** For ALL areas outside the magenta zone, the final image must be **100% IDENTICAL** to the ORIGINAL SCENE.
5.  **Perspective & Lighting:** Adapt the ARTWORK to the perspective, shadows, and lighting of the wall.
6.  **No Tiling:** Apply the ARTWORK as a single, complete piece. **DO NOT TILE or REPEAT it.**

Your final output must be a single, photorealistic image where the wall is seamlessly transformed into the artwork.
`;

  const textPart = { text: prompt };
  
  console.log('Sending images and prompt to the composition model...');
  
  const response: GenerateContentResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image-preview',
    contents: { parts: [artworkImagePart, originalSceneImagePart, overlaySceneImagePart, textPart] },
    config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
    },
  });

  console.log('Received response from model.');
  
  const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

  if (imagePartFromResponse?.inlineData) {
    const { mimeType, data } = imagePartFromResponse.inlineData;
    const generatedSquareImageUrl = `data:${mimeType};base64,${data}`;
    
    console.log('Cropping generated image to original aspect ratio...');
    const finalImageUrl = await cropToOriginalAspectRatio(
        generatedSquareImageUrl,
        originalWidth,
        originalHeight,
        MAX_DIMENSION
    );
    
    return { finalImageUrl, debugImageUrl, finalPrompt: prompt };
  }

  console.error("Model response did not contain an image part.", response);
  throw new Error("The AI model did not return an image. Please try again.");
};

export const editSceneWithPrompt = async (
    sceneImage: File,
    prompt: string,
): Promise<{ editedFile: File, editedUrl: string }> => {
    console.log('Starting scene editing process...');
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

    const { width: originalWidth, height: originalHeight } = await getImageDimensions(sceneImage);
    const MAX_DIMENSION = 1024;

    console.log('Resizing scene image for editing...');
    const resizedSceneImage = await resizeImage(sceneImage, MAX_DIMENSION);

    const sceneImagePart = await fileToPart(resizedSceneImage);

    const fullPrompt = `You are a professional photo editor. Your task is to edit the provided image based on the user's instruction. The edit must be photorealistic and seamlessly blended. Do not change anything else in the image.

User Instruction: "${prompt}"`;
    
    const textPart = { text: fullPrompt };

    console.log('Sending image and prompt to the editing model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [sceneImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    console.log('Received response from editing model.');
    const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

    if (imagePartFromResponse?.inlineData) {
        const { mimeType, data } = imagePartFromResponse.inlineData;
        const generatedSquareImageUrl = `data:${mimeType};base64,${data}`;

        console.log('Cropping edited image to original aspect ratio...');
        const finalImageUrl = await cropToOriginalAspectRatio(
            generatedSquareImageUrl,
            originalWidth,
            originalHeight,
            MAX_DIMENSION
        );

        const finalImageFile = await dataUrlToFile(finalImageUrl, `edited-${sceneImage.name}`, 'image/jpeg');

        return { editedFile: finalImageFile, editedUrl: finalImageUrl };
    }

    console.error("Editing model response did not contain an image part.", response);
    throw new Error("The AI model did not return an edited image. Please try again.");
};

export const generateArtworkFromPrompt = async (prompt: string): Promise<{ file: File, url: string }> => {
    console.log(`Starting artwork generation for prompt: "${prompt}"`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
          aspectRatio: '3:4', // A common artwork aspect ratio
        },
    });
    
    console.log('Received response from image generation model.');
    const base64ImageBytes = response.generatedImages?.[0]?.image?.imageBytes;
    
    if (base64ImageBytes) {
        const mimeType = 'image/png';
        const imageUrl = `data:${mimeType};base64,${base64ImageBytes}`;
        const filename = `${prompt.slice(0, 30).replace(/\s/g, '_')}.png`;
        const imageFile = await dataUrlToFile(imageUrl, filename, mimeType);
        
        return { file: imageFile, url: imageUrl };
    }
    
    console.error("Image generation response did not contain image data.", response);
    throw new Error("The AI model did not return an image. Please try a different prompt.");
};
