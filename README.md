# NMD — Markdown Preview

A VS Code extension that renders Markdown with syntax highlighting, Mermaid diagrams, and scroll sync. All rendering runs locally — no network calls.

## Features

- **Live preview** — updates on every keystroke (300 ms debounce in panel mode)
- **Shiki syntax highlighting** — GitHub Dark theme, bundled (no CDN)
- **Code block actions** — tagged blocks get a language header, copy button,
  line numbers, and soft-wrap
- **Mermaid diagrams** — fenced ` ```mermaid ``` ` blocks render inline
- **100% Offline KaTeX Math** — inline (`$\rightarrow$`, `$E = mc^2$`), block (`$$...$$`), and GitLab-style (```math) math with bundled vector fonts and zero network requests
- **Scroll sync** — editor scroll position mirrors to the preview panel
- **Local link navigation** — clicking relative links opens the file in VS Code
- **Front-matter acronyms** — define acronyms in YAML front matter; matching text is wrapped in `<abbr>` with tooltip
- **Warning blockquotes** — blockquote lines starting with `!` render with a red left border
- **Zoom & scaling** — `Ctrl + MouseWheel` or trackpad pinch zooms preview content smoothly with cursor anchoring; `Ctrl+0` resets, `Ctrl+=`/`Ctrl+-` adjusts zoom

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

## Offline LaTeX / KaTeX Math

NMD embeds the complete KaTeX engine along with all math vector fonts offline:

- **Inline Math:** `$E = mc^2$` or `$\rightarrow$`
- **Display Blocks:**
  ```markdown
  $$
  \int_{0}^{\infty} e^{-x^2} dx = \frac{\sqrt{\pi}}{2}
  $$
  ```
- **GitLab Fenced Blocks:**
  ````markdown
  ```math
  \sum_{i=1}^n i = \frac{n(n+1)}{2}
  ```
  ````

Currency expressions like `$50 bucks and $100` and inline code snippets like `` `$x$` `` remain literal text and are never falsely parsed as math.

## Zoom & scaling

The preview supports independent zooming without affecting VS Code's overall UI zoom:

| Action | Input |
|---|---|
| Zoom in / out | `Ctrl + MouseWheel` (or trackpad pinch) |
| Step zoom in | `Ctrl + =` / `Ctrl + +` |
| Step zoom out | `Ctrl + -` |
| Reset to 100% | `Ctrl + 0` |

- **Cursor anchoring** — content under the mouse cursor remains stationary while zooming.
- **Visual badge** — a floating percentage pill appears in the top-right corner and fades out automatically.
- **Session persistence** — the zoom factor is remembered across tabs and restored across VS Code restarts.
- **Bounds** — clamped between 30% and 500%.

## Install from VSIX

```sh
code --install-extension nmd-1.1.0.vsix
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
- [KaTeX](https://github.com/KaTeX/KaTeX) (MIT)
