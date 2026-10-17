# GuroVia Minimal Brand Update

## Changes

- Added `public/gurovia-logo.svg`, a full horizontal GuroVia wordmark intended for documents and external brand use.
- Added `public/gurovia-mark.svg`, the standalone icon used in the platform brand area.
- Updated `public/gradebook-icon.svg` to use the new mark for browser/app favicon metadata.
- Updated `components/brand.tsx` to render the SVG mark rather than text initials.
- Removed the illustrative gradebook preview sheet from the public homepage. The homepage now presents factual platform information, clear school registration actions, how the service works, and the real school directory.
- Simplified the homepage layout and responsive styles with a neutral background, restrained green accents, and clear type hierarchy.
- Updated the generated Open Graph graphic to use a simplified book mark consistent with the new SVG identity.

## Assets

- `public/gurovia-logo.svg` — full horizontal logo lockup.
- `public/gurovia-mark.svg` — standalone icon.
- `public/gradebook-icon.svg` — favicon/app icon alias.

The SVGs are editable vector files and contain no raster image content.

## Validation

- Homepage no longer contains the illustrative preview markup.
- 76 TypeScript/TSX source files passed a syntax transpilation check.
- All three SVG assets parsed as valid XML.
- Tenant and security source checks should also be run before deployment.

A full Next.js production build still needs to be run in an environment with all project dependencies installed.
