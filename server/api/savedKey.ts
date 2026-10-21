/**
 * The Google AI key saved from the editor's key dialog, once loaded (see keystore.ts). Kept in a
 * module with no imports so gemini.ts can read it without an import cycle.
 */
let saved: string | null = null;
export const getSavedKey = (): string | null => saved;
export const setSavedKey = (key: string | null): void => {
  saved = key;
};
