/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export interface Artwork {
  id: number;
  name: string;
  imageUrl: string;
}

// Represents a single point, generic over the coordinate type (e.g., number for pixels)
export interface Corner<T> {
  x: T;
  y: T;
}

// Represents a single point using percentage-based coordinates relative to the image dimensions.
export interface CornerPercent {
  xPercent: number;
  yPercent: number;
}

// Represents the polygon area for the mask.
export type PlacementArea = CornerPercent[];
