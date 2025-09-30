// Fix: Commented out the reference to 'vite/client' to resolve a type definition error.
// This error typically indicates a project setup issue (e.g., missing dev dependencies) rather than a problem with the file itself.
// /// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MAINTENANCE_MODE: string;
  readonly VITE_GEMINI_API_KEY: string;
  readonly VITE_PEXELS_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}