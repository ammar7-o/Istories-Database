# Istories Database

A browsable database of Istories stories, with a lightweight Google Drive-style
file manager for exploring the collection.

**Live site:** <https://ammar7-o.github.io/Istories-Database/>

## Features

- **Folder-by-folder browsing** — open a folder to see only its folders and files.
- **Breadcrumbs and back navigation** — move around like a normal file manager.
- **Global search** — search every visible file and folder at once.
- **File cards** — see file size and last-modified date at a glance.
- **Copy URL** — every JavaScript file has a button that copies its full public
  URL, for example:
  `https://ammar7-o.github.io/Istories-Database/English/ZAmericanEnglish/level%201/grammar-level1.js`
- **Open in Istories** — every JavaScript file also has an **Open** button that
  launches the story in the Istories reader:
  `https://ammar7-o.github.io/Istories-V/main/index.html?story=<encoded file URL>`
- **No content preview** — this is a browser for the database, not an editor.

### How the Open button works

The **Open** button links to:

```text
https://ammar7-o.github.io/Istories-V/main/index.html?story=<encoded public file URL>
```

The file URL is encoded once as a normal URL, then encoded again because it is
placed inside the `story` query parameter. A space in a folder name therefore
becomes `%2520` inside the final link, for example:

```text
https://ammar7-o.github.io/Istories-V/main/index.html?story=https%3A%2F%2Fammar7-o.github.io%2FIstories-Database%2FEnglish%2FZAmericanEnglish%2Flevel%25201%2Freading-level1.js
```

### Keyboard shortcuts

| Key | Action |
| --- | --- |
| `/` | Focus the search box |
| `Esc` | Clear the search or the current selection |

## Project structure

```text
.
├── English/
│   └── ZAmericanEnglish/
│       └── level 1/
│           ├── conversation-level1.js
│           ├── grammar-level1.js
│           ├── phonetics-level1.js
│           ├── reading-level1.js
│           ├── Vocabulary-level1.js
│           └── writing-level1.js
├── core/
│   ├── app.js          # file-browser logic
│   ├── files.js        # generated file tree (do not edit)
│   └── styles.css      # file-browser styles
├── converter/          # story conversion tools and prompts
├── index.html          # file-browser entry point
├── tree.sh             # rebuilds core/files.js
└── README.md
```

## Use the file browser

Open the live site or `index.html` directly in a modern browser. No server or
build step is required.

The browser hides app/build files so only database content is shown:

- `core/`
- `converter/`
- `README.md`
- `index.html`
- `tree.sh`

To change that list, edit `HIDDEN_TOP_LEVEL` in `tree.sh`.

## Rebuild the file tree

`tree.sh` scans the project and writes `core/files.js`, the file tree used by
the browser. Run it after adding, renaming or removing database files:

```bash
./tree.sh
```

The copy buttons use the GitHub Pages base URL by default, and the **Open**
buttons use the Istories reader URL. If either site moves, override them when
rebuilding:

```bash
SITE_BASE_URL="https://example.com/my-repo/" \
VIEWER_URL="https://example.com/Istories-V/main/index.html" \
./tree.sh
```

`tree.sh` uses Python 3 to generate the JSON manifest safely.

## Requirements

- Python 3
- A modern browser (Firefox, Chrome, Edge or Safari)
