# NMD — Markdown Preview

A VS Code extension that renders Markdown with syntax highlighting, Mermaid diagrams, and scroll sync. All rendering runs locally — no network calls.

## Features

- **Live preview** — updates on every keystroke (300 ms debounce in panel mode)
- **Shiki syntax highlighting** — GitHub Dark theme, bundled (no CDN)
- **Code block actions** — tagged blocks get a language header, copy button,
  line numbers, and soft-wrap
- **Mermaid diagrams** — fenced ` ```mermaid ``` ` blocks render inline
- **Scroll sync** — editor scroll position mirrors to the preview panel
- **Local link navigation** — clicking relative links opens the file in VS Code
- **Front-matter acronyms** — define acronyms in YAML front matter; matching text is wrapped in `<abbr>` with tooltip
- **Warning blockquotes** — blockquote lines starting with `!` render with a red left border

## Usage

### Custom editor (default)

Opening any `.md` file uses the NMD preview as the default editor. To edit the raw Markdown, right-click the file → **Open With… → Text Editor**.

### Side-by-side panel

| Action | Shortcut |
|--------|----------|
| Toggle preview panel | `Ctrl+Shift+M` |
| Open file link in preview | click the link |

The panel tracks the active editor — switching tabs updates the preview automatically.

## Front-matter acronyms

```yaml
---
acronyms:
  API: Application Programming Interface
  SLA: Service Level Agreement
---
```

Any occurrence of `API` or `SLA` in the document body is wrapped in an `<abbr>` tag, producing an underlined tooltip on hover. Occurrences inside `<code>`, `<pre>`, or `<a>` are left untouched.

## Code blocks

Language-tagged fenced code blocks get a small header with the language name on
the left and a `Copy` button on the right. Tagged blocks also show line numbers
and soft-wrap long lines. Untagged blocks still get the `Copy` button, but no
language label or line numbers.

## Install from VSIX

```sh
code --install-extension nmd-0.2.1.vsix
```

## Development

```sh
npm install
npm run watch   # or: npm run compile
```

Press `F5` in VS Code to launch the Extension Development Host.

## Bundled libraries

- [marked](https://github.com/markedjs/marked) v15.0.12 (MIT)
- [Shiki](https://github.com/shikijs/shiki) (MIT)
- [Mermaid](https://github.com/mermaid-js/mermaid) (MIT)
