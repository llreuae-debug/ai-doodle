#!/usr/bin/env node
/**
 * build-cast.mjs
 *
 * Generates character sheets and assets for the 40 original characters of Chalkline Studio:
 * 1. Writes /assets/library/characters/<slug>/sheet.json for every character.
 * 2. Generates line SVG, color SVG, and stroke JSON for all character poses.
 * 3. Keeps props and shapes from existing categories.
 * 4. Writes updated manifest.json to assets/library/ and public/library/.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHARACTERS } from './characters-data.mjs';
import { renderCharacter } from './caricature.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ASSETS_OUT = path.join(ROOT, 'assets/library');
const PUBLIC_OUT = path.join(ROOT, 'public/library');

export async function buildCast() {
  console.log(`Generating character sheets and items for ${CHARACTERS.length} characters...`);

  const characterManifestItems = [];

  for (const c of CHARACTERS) {
    // 1. Write character sheet
    const sheetDir = path.join(ASSETS_OUT, 'characters', c.slug);
    const pubSheetDir = path.join(PUBLIC_OUT, 'characters', c.slug);
    mkdirSync(sheetDir, { recursive: true });
    mkdirSync(pubSheetDir, { recursive: true });

    const sheet = {
      name: c.name,
      role: c.role,
      slug: c.slug,
      age: c.age,
      look: c.look,
      outfitColours: c.outfit,
      skinTone: c.skinTone,
      hairColor: c.hairColor,
      hairStyle: c.hairStyle,
      hasGlasses: !!c.hasGlasses,
      premium: !!c.premium,
      poses: c.poses,
    };

    writeFileSync(path.join(sheetDir, 'sheet.json'), `${JSON.stringify(sheet, null, 2)}\n`);
    writeFileSync(path.join(pubSheetDir, 'sheet.json'), `${JSON.stringify(sheet, null, 2)}\n`);

    // 2. Generate items for all poses
    for (const pose of c.poses) {
      const item = renderCharacter(c, pose);
      const doc = {
        id: item.id,
        cat: 'characters',
        name: item.name,
        role: item.role,
        character: item.character,
        pose: item.pose,
        tags: item.tags,
        premium: item.premium,
        strokes: item.strokes,
        fills: item.fills,
        source: 'original',
      };

      for (const base of [ASSETS_OUT, PUBLIC_OUT]) {
        const catDir = path.join(base, 'characters');
        mkdirSync(catDir, { recursive: true });
        writeFileSync(path.join(catDir, `${item.id}.json`), `${JSON.stringify(doc, null, 2)}\n`);
        writeFileSync(path.join(catDir, `${item.id}.svg`), item.lineSvg);
        writeFileSync(path.join(catDir, `${item.id}.color.svg`), item.colorSvg);
      }

      characterManifestItems.push({
        id: item.id,
        cat: 'characters',
        name: item.name,
        role: item.role,
        character: item.character,
        pose: item.pose,
        tags: item.tags,
        premium: item.premium,
        file: `/library/characters/${item.id}.json`,
        thumb: `/library/characters/${item.id}.svg`,
        thumbLine: `/library/characters/${item.id}.svg`,
        thumbColor: `/library/characters/${item.id}.color.svg`,
        strokeCount: item.strokes.length,
      });
    }
  }

  console.log(`Generated ${characterManifestItems.length} character pose items across ${CHARACTERS.length} characters.`);

  // 3. Merge with non-character items from existing public manifest
  const existingManifestPath = path.join(PUBLIC_OUT, 'manifest.json');
  let nonCharacterItems = [];
  if (existsSync(existingManifestPath)) {
    try {
      const existing = JSON.parse(readFileSync(existingManifestPath, 'utf8'));
      nonCharacterItems = existing.filter((it) => it.cat !== 'characters');
    } catch {
      nonCharacterItems = [];
    }
  }

  // Prepend characters, then props & shapes
  const mergedManifest = [...characterManifestItems, ...nonCharacterItems];

  writeFileSync(path.join(ASSETS_OUT, 'manifest.json'), `${JSON.stringify(mergedManifest, null, 1)}\n`);
  writeFileSync(path.join(PUBLIC_OUT, 'manifest.json'), `${JSON.stringify(mergedManifest, null, 1)}\n`);

  console.log(`Updated manifest with ${mergedManifest.length} total items (${characterManifestItems.length} characters + ${nonCharacterItems.length} props/shapes).`);
  return { characterCount: CHARACTERS.length, poseCount: characterManifestItems.length, total: mergedManifest.length };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await buildCast();
}
