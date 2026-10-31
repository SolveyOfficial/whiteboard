# Solvey Whiteboard

A free whiteboard for sketching diagrams, wireframes and ideas with a hand-drawn feel. Based on [Excalidraw](https://github.com/excalidraw/excalidraw).

Live: https://solveyofficial.github.io/whiteboard/

## Private by design

Everything runs in your browser. Drawings are kept in your browser's storage and are never uploaded. The app has no analytics or tracking, serves its own fonts and loads nothing from other sites. Once loaded, it also works offline and can be installed as an app.

## Features

- Shapes, arrows, lines, freehand drawing, text and images
- Hand-drawn or clean styles, with fills, colours and fonts
- Frames, a shape library and an infinite canvas
- Convert Mermaid code into an editable diagram
- Export to PNG or SVG, or save and open `.excalidraw` files
- Light and dark themes, and more than 50 languages

## Development

You need Node.js 22 or later and Yarn 1 (`corepack enable`).

```sh
yarn install           # install dependencies
yarn start             # development server at http://localhost:3001
yarn test:code         # ESLint
yarn test:other        # Prettier
yarn test:typecheck    # TypeScript
yarn test:app --watch=false   # unit tests
yarn build             # production build in excalidraw-app/build
```

Set `BASE_PATH` (for example `BASE_PATH=/whiteboard/`) when the app is served from a sub-path.

`yarn notices` regenerates `THIRD_PARTY_NOTICES.md` from the last build. It lists every bundled package and font with its licence, and is linked from the app menu as "Licences".

When the repository is public, every push to `main` is published to GitHub Pages.

## Licence

MIT, see LICENSE.
