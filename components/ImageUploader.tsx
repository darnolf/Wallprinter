/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { CornerPercent, PlacementArea } from '../types';

interface ImageUploaderProps {
  id: string;
  label: string;
  onFileSelect: (file: File) => void;
  imageUrl: string | null;
  isEditableArea: boolean;
  points: PlacementArea | null;
  onAreaUpdate: (points: PlacementArea | null) => void;
}

const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-zinc-500 dark:text-zinc-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const ImageUploader = forwardRef<HTMLDivElement, ImageUploaderProps>(({ id, label, onFileSelect, imageUrl, isEditableArea, points, onAreaUpdate }, ref) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
  
  const [draggedPoint, setDraggedPoint] = useState<{ index: number; isNew?: boolean } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useImperativeHandle(ref, () => containerRef.current!, []);

  // Reset view when image changes
  useEffect(() => {
    setImageDimensions({ width: 0, height: 0 });
    setImageOffset({ x: 0, y: 0 });
  }, [imageUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-blue-500');
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onFileSelect(file);
    }
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (imageUrl) return;
    e.currentTarget.classList.add('border-blue-500');
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('border-blue-500');
  };

  const getPixelCoords = (point: CornerPercent) => {
    if (imageDimensions.width === 0) return { x: -100, y: -100 };
    const xOnImage = (point.xPercent / 100) * imageDimensions.width;
    const yOnImage = (point.yPercent / 100) * imageDimensions.height;
    return {
      x: xOnImage + imageOffset.x,
      y: yOnImage + imageOffset.y,
    };
  };

  const updateImageDimensions = () => {
    if (imageRef.current && svgRef.current) {
        const { width: containerWidth, height: containerHeight } = svgRef.current.getBoundingClientRect();
        
        const imgWidth = imageRef.current.offsetWidth;
        const imgHeight = imageRef.current.offsetHeight;
  
        if (imgWidth > 0 && (imgWidth !== imageDimensions.width || imgHeight !== imageDimensions.height)) {
          setImageDimensions({ width: imgWidth, height: imgHeight });
          setImageOffset({
            x: (containerWidth - imgWidth) / 2,
            y: (containerHeight - imgHeight) / 2,
          });
        }
    }
  };

  const handleImageLoad = () => {
    // Use a small timeout to ensure browser has rendered the image and calculated its offset dimensions
    setTimeout(updateImageDimensions, 50);
  };
  
  useEffect(() => {
    const memoizedUpdate = updateImageDimensions;
    window.addEventListener('resize', memoizedUpdate);
    return () => window.removeEventListener('resize', memoizedUpdate);
  }, [imageDimensions.width, imageDimensions.height, imageOffset.x, imageOffset.y]);

  // --- MASK DRAWING LOGIC ---
  const screenToSvgCoords = (screenX: number, screenY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const x = screenX - rect.left;
    const y = screenY - rect.top;
    return { x, y };
  };
  
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isEditableArea || e.button !== 0 || !imageRef.current) return;
    
    updateImageDimensions();
        
    const target = e.target as SVGElement;
    const pointIndex = target.dataset.index ? parseInt(target.dataset.index, 10) : -1;
    
    if (pointIndex !== -1) {
        setDraggedPoint({ index: pointIndex });
    } else if (target.dataset.midpoint) {
        const { p1, p2 } = JSON.parse(target.dataset.midpoint);
        const newIndex = Math.max(p1, p2);
        const { x, y } = screenToSvgCoords(e.clientX, e.clientY);
        
        const imageX = x - imageOffset.x;
        const imageY = y - imageOffset.y;

        const newPoint = {
            xPercent: (imageX / imageDimensions.width) * 100,
            yPercent: (imageY / imageDimensions.height) * 100,
        };
        const newPoints = [...points!];
        newPoints.splice(newIndex, 0, newPoint);
        onAreaUpdate(newPoints);
        setDraggedPoint({ index: newIndex });
    } else if (!points || points.length === 0) {
        setIsDrawing(true);
        const { x, y } = screenToSvgCoords(e.clientX, e.clientY);
        
        const imageX = x - imageOffset.x;
        const imageY = y - imageOffset.y;

        const newPoint = {
            xPercent: (imageX / imageDimensions.width) * 100,
            yPercent: (imageY / imageDimensions.height) * 100,
        };
        onAreaUpdate([newPoint, newPoint, newPoint, newPoint]);
        setDraggedPoint({ index: 2 }); // Drag the bottom-right corner
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggedPoint || !points || imageDimensions.width === 0) return;
    
    const { x, y } = screenToSvgCoords(e.clientX, e.clientY);
    
    const imageX = x - imageOffset.x;
    const imageY = y - imageOffset.y;

    const clampedImageX = Math.max(0, Math.min(imageX, imageDimensions.width));
    const clampedImageY = Math.max(0, Math.min(imageY, imageDimensions.height));

    const newPoints = [...points];
    const newXPercent = (clampedImageX / imageDimensions.width) * 100;
    const newYPercent = (clampedImageY / imageDimensions.height) * 100;
    
    if (isDrawing) {
      const startPoint = newPoints[0];
      newPoints[1] = { xPercent: newXPercent, yPercent: startPoint.yPercent };
      newPoints[2] = { xPercent: newXPercent, yPercent: newYPercent };
      newPoints[3] = { xPercent: startPoint.xPercent, yPercent: newYPercent };
    } else {
      newPoints[draggedPoint.index] = { xPercent: newXPercent, yPercent: newYPercent };
    }
    
    onAreaUpdate(newPoints);
  };

  const handlePointerUp = () => {
    setDraggedPoint(null);
    setIsDrawing(false);
  };

  const handlePointDoubleClick = (indexToDelete: number) => {
    if (points && points.length > 3) {
      const newPoints = points.filter((_, index) => index !== indexToDelete);
      onAreaUpdate(newPoints);
    }
  };

  return (
    <div ref={containerRef} className="h-full flex flex-col" data-dropzone-id={id}>
      <h3 className="text-xl font-semibold text-zinc-700 dark:text-zinc-300 mb-4 flex-shrink-0">{label}</h3>
      <div
        className="w-full flex-grow min-h-0 bg-zinc-100 dark:bg-zinc-800 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg flex items-center justify-center relative overflow-hidden transition-colors duration-300 select-none"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !imageUrl && fileInputRef.current?.click()}
      >
        <input id={`${id}-input`} type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/png, image/jpeg, image/webp" className="hidden" />
        {imageUrl ? (
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden" onPointerUp={handlePointerUp} onPointerMove={handlePointerMove}>
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Scene"
              className="max-w-full max-h-full object-contain pointer-events-none"
              onLoad={handleImageLoad}
            />
            {isEditableArea && (
              <svg
                ref={svgRef}
                className="absolute top-0 left-0 w-full h-full"
                style={{ cursor: draggedPoint ? 'grabbing' : 'crosshair' }}
                onPointerDown={handlePointerDown}
              >
                  {points && points.length > 0 && imageDimensions.width > 0 && (
                    <>
                      <polygon
                        points={points.map(p => {
                          const { x, y } = getPixelCoords(p);
                          return `${x},${y}`;
                        }).join(' ')}
                        className="fill-fuchsia-500/50 stroke-fuchsia-500 stroke-2"
                      />
                      {points.map((p1, index) => {
                          const p2 = points[(index + 1) % points.length];
                          const p1Coords = getPixelCoords(p1);
                          const p2Coords = getPixelCoords(p2);
                          const midX = (p1Coords.x + p2Coords.x) / 2;
                          const midY = (p1Coords.y + p2Coords.y) / 2;

                          return (
                              <circle
                                  key={`mid-${index}`}
                                  cx={midX}
                                  cy={midY}
                                  r={6}
                                  className="fill-white/50 stroke-fuchsia-600/50 stroke-2 hover:fill-white transition-colors cursor-copy"
                                  data-midpoint={JSON.stringify({p1: index, p2: (index + 1) % points.length})}
                              />
                          )
                      })}
                      {points.map((point, index) => {
                        const { x, y } = getPixelCoords(point);
                        return (
                          <circle
                            key={index}
                            cx={x}
                            cy={y}
                            r={8}
                            data-index={index}
                            className="fill-white stroke-fuchsia-600 stroke-[3px] cursor-grab active:cursor-grabbing"
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              handlePointDoubleClick(index);
                            }}
                          />
                        );
                      })}
                    </>
                  )}
              </svg>
            )}
          </div>
        ) : (
          <div className="text-center text-zinc-500 dark:text-zinc-400 p-4 cursor-pointer">
            <UploadIcon />
            <p>Click to upload or drag & drop a scene</p>
            <p className="text-xs mt-1">PNG, JPG, or WEBP</p>
          </div>
        )}
      </div>
    </div>
  );
});

export default ImageUploader;
