// Writes THIRD_PARTY_NOTICES.md from the licences collected during the app
// build (see the `license` plugin in excalidraw-app/vite.config.mts), plus the
// fonts that ship with the editor.
//
// Usage: yarn build:app && node scripts/third-party-notices.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const licences = path.join(root, "scripts", "licences");
const read = (file) => fs.readFileSync(file, "utf8").trim();

const collected = JSON.parse(
  fs.readFileSync(
    path.join(root, "node_modules", ".cache", "third-party-licences.json"),
    "utf8",
  ),
);

// The editor's own workspace packages are covered by LICENSE
const packages = collected.filter(
  ({ name }) => !name.startsWith("@excalidraw/") || name.includes("-to-"),
);

// WebAssembly modules embedded as base64 by scripts/buildWasm.js
for (const name of ["harfbuzzjs", "fonteditor-core"]) {
  const dir = path.join(root, "node_modules", name);
  const meta = JSON.parse(
    fs.readFileSync(path.join(dir, "package.json"), "utf8"),
  );
  packages.push({
    name: `${name} (WebAssembly build)`,
    version: meta.version,
    license: typeof meta.license === "string" ? meta.license : "MIT",
    licenseText: read(path.join(dir, "LICENSE")),
    repository:
      typeof meta.repository === "string"
        ? meta.repository
        : meta.repository?.url,
  });
}

// A few packages are published without a licence file: use the MIT licence
// with the copyright line from their source repository.
const MIT_COPYRIGHT = {
  "@radix-ui/": "Copyright (c) 2022 WorkOS",
  "react-remove-scroll-bar": "Copyright (c) 2017 Anton Korzunov",
};
const mit = read(path.join(licences, "MIT.txt"));
for (const entry of packages) {
  if (entry.licenseText || entry.license !== "MIT") {
    continue;
  }
  const prefix = Object.keys(MIT_COPYRIGHT).find((key) =>
    entry.name.startsWith(key),
  );
  if (prefix) {
    entry.licenseText = mit.replace("{copyright}", MIT_COPYRIGHT[prefix]);
  }
}

const missing = packages.filter(({ licenseText }) => !licenseText);
if (missing.length) {
  throw new Error(
    `No licence text for: ${missing
      .map(({ name, version }) => `${name}@${version}`)
      .join(", ")}`,
  );
}

const ofl = read(path.join(licences, "OFL-1.1.txt"));

const fonts = [
  {
    name: "Excalifont",
    copyright: "Copyright (c) 2024 by Excalidraw.",
    licence: "OFL-1.1",
  },
  {
    name: "Virgil",
    copyright: "Copyright (c) 2011 by Your Own Font Foundry.",
    licence: "OFL-1.1",
  },
  {
    name: "Assistant",
    copyright:
      "Copyright 2020 The Assistant Project Authors (https://github.com/hafontia/Assistant). Copyright 2010 The Source Sans Pro Authors (https://github.com/adobe-fonts/source-sans-pro), with Reserved Font Name 'Source'.",
    licence: "OFL-1.1",
  },
  {
    name: "Nunito",
    copyright:
      "Copyright 2014 The Nunito Project Authors (https://github.com/googlefonts/nunito)",
    licence: "OFL-1.1",
  },
  {
    name: "Lilita One",
    copyright:
      'Copyright (c) 2011 Juan Montoreano (juan@remolacha.biz), with Reserved Font Names "Lilita One"',
    licence: "OFL-1.1",
  },
  {
    name: "Cascadia Code",
    copyright: "Copyright (c) 2020 Microsoft Corporation.",
    licence: "OFL-1.1",
  },
  {
    name: "Xiaolai SC",
    copyright: "Copyright (c) 2020 LXGW",
    licence: "OFL-1.1",
  },
  {
    name: "Noto Emoji (used by the font subsetting tests)",
    copyright: "Copyright 2013 Google LLC",
    licence: "OFL-1.1",
  },
  {
    name: "Comic Shanns",
    licence: "MIT",
    text: read(path.join(licences, "ComicShanns-MIT.txt")),
  },
  {
    name: "Liberation Sans 1.05",
    licence: "GPL-2.0 with font exception",
    text: [
      "Digitized data copyright (c) 2007 Ascender Corporation.",
      "Liberation is a trademark of Red Hat, Inc.",
      "Source: https://github.com/liberationfonts/liberation-fonts",
      "",
      "This font is licensed under the GNU General Public License, version 2,",
      "with the following exception:",
      "",
      "As a special exception, if you create a document which uses this font,",
      "and embed this font or unaltered portions of this font into the",
      "document, this font does not by itself cause the resulting document to",
      "be covered by the GNU General Public License. This exception does not",
      "however invalidate any other reasons why the document might be covered",
      "by the GNU General Public License. If you modify this font, you may",
      "extend this exception to your version of the font, but you are not",
      "obligated to do so. If you do not wish to do so, delete this exception",
      "statement from your version.",
      "",
      read(path.join(licences, "GPL-2.0.txt")),
    ].join("\n"),
  },
];

const block = (text) => [
  "```text",
  text.replace(/\r\n?/g, "\n").trim(),
  "```",
  "",
];

const fontSections = fonts.map(({ name, copyright, licence, text }) =>
  [
    `### ${name}`,
    "",
    `- Licence: ${licence}`,
    "",
    ...block(
      text ??
        `${copyright}\n\nThis Font Software is licensed under the SIL Open Font License, Version 1.1.\nThe full licence text is at the end of the fonts section.`,
    ),
  ].join("\n"),
);

const packageSections = packages
  .toSorted((a, b) => a.name.localeCompare(b.name))
  .map(({ name, version, license, licenseText, noticeText, repository }) =>
    [
      `### ${name} ${version}`,
      "",
      `- Licence: ${license ?? "see text below"}`,
      ...(repository ? [`- Source: ${repository}`] : []),
      "",
      ...block(noticeText ? `${licenseText}\n\n${noticeText}` : licenseText),
    ].join("\n"),
  );

fs.writeFileSync(
  path.join(root, "THIRD_PARTY_NOTICES.md"),
  [
    "# Third-party notices",
    "",
    "Solvey Whiteboard is based on [Excalidraw](https://github.com/excalidraw/excalidraw)",
    "(MIT licence, see LICENSE). It also includes the following fonts and",
    "packages, each listed with its licence.",
    "",
    "## Fonts",
    "",
    ...fontSections,
    "### SIL Open Font License 1.1",
    "",
    ...block(ofl),
    "## Packages",
    "",
    ...packageSections,
  ].join("\n"),
);

console.log(
  `Wrote ${fonts.length} font and ${packages.length} package notices to THIRD_PARTY_NOTICES.md`,
);
