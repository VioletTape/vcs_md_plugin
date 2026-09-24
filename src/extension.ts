import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

let panel: vscode.WebviewPanel | undefined;
let debounceTimer: ReturnType<typeof setTimeout> | undefined;
let currentFileDir: string | undefined;
let panelMediaRoot: vscode.Uri | undefined;

class NmdEditorProvider implements vscode.CustomTextEditorProvider {
    constructor(private readonly context: vscode.ExtensionContext) {}

    resolveCustomTextEditor(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel): void {
        const documentDir = document.uri.scheme === 'file'
            ? vscode.Uri.file(path.dirname(document.uri.fsPath))
            : undefined;
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.file(path.join(this.context.extensionPath, 'media')),
                ...(documentDir ? [documentDir] : []),
            ],
        };
        webviewPanel.webview.html = buildHtml(this.context, webviewPanel.webview);

        const push = () => webviewPanel.webview.postMessage({
            type: 'render',
            content: document.getText(),
            imageBase: documentDir && webviewPanel.webview.asWebviewUri(documentDir).toString() + '/',
        });
        push();

        const sub = vscode.workspace.onDidChangeTextDocument(e => { if (e.document === document) push(); });
        webviewPanel.onDidDispose(() => sub.dispose());

        webviewPanel.webview.onDidReceiveMessage(msg => {
            if (msg.type === 'openFile') {
                const dir = path.dirname(document.uri.fsPath);
                const resolved = path.isAbsolute(msg.path) ? msg.path : path.resolve(dir, msg.path);
                vscode.commands.executeCommand('vscode.open', vscode.Uri.file(resolved));
            } else if (msg.type === 'zoom' && typeof msg.zoom === 'number') {
                this.context.globalState.update('previewZoom', msg.zoom);
            }
        });
    }
}

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.window.registerCustomEditorProvider('nmd.markdownPreview', new NmdEditorProvider(context), {
            webviewOptions: { retainContextWhenHidden: true },
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('nmd.togglePreview', () => toggle(context))
    );

    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(e => {
            if (!panel) return;
            if (e.document !== vscode.window.activeTextEditor?.document) return;
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(pushContent, 300);
        })
    );

    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => { if (editor) pushContent(); })
    );

    context.subscriptions.push(
        vscode.window.onDidChangeTextEditorVisibleRanges(e => {
            if (!panel || e.textEditor !== vscode.window.activeTextEditor) return;
            const range = e.visibleRanges[0];
            if (!range) return;
            const ratio = range.start.line / Math.max(e.textEditor.document.lineCount - 1, 1);
            panel.webview.postMessage({ type: 'scroll', ratio });
        })
    );
}

function toggle(context: vscode.ExtensionContext) {
    if (panel) {
        panel.dispose();
        return;
    }
    panel = vscode.window.createWebviewPanel(
        'nmdPreview',
        'Markdown Preview',
        vscode.ViewColumn.Beside,
        {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'media'))],
            retainContextWhenHidden: true,
        }
    );
    panelMediaRoot = vscode.Uri.file(path.join(context.extensionPath, 'media'));
    panel.webview.html = buildHtml(context, panel.webview);
    panel.onDidDispose(() => { panel = undefined; panelMediaRoot = undefined; }, null, context.subscriptions);

    panel.webview.onDidReceiveMessage(msg => {
        if (msg.type === 'openFile') {
            if (!currentFileDir) return;
            const resolved = path.isAbsolute(msg.path)
                ? msg.path
                : path.resolve(currentFileDir, msg.path);
            vscode.commands.executeCommand('vscode.open', vscode.Uri.file(resolved));
        } else if (msg.type === 'zoom' && typeof msg.zoom === 'number') {
            context.globalState.update('previewZoom', msg.zoom);
        }
    }, null, context.subscriptions);

    pushContent();
}

function pushContent() {
    if (!panel) return;
    const editor = vscode.window.activeTextEditor;
    currentFileDir = editor?.document.uri.scheme === 'file'
        ? path.dirname(editor.document.uri.fsPath)
        : undefined;
    panel.webview.options = {
        enableScripts: true,
        localResourceRoots: [
            ...(panelMediaRoot ? [panelMediaRoot] : []),
            ...(currentFileDir ? [vscode.Uri.file(currentFileDir)] : []),
        ],
    };
    panel.webview.postMessage({
        type: 'render',
        content: editor ? editor.document.getText() : '',
        imageBase: currentFileDir
            ? panel.webview.asWebviewUri(vscode.Uri.file(currentFileDir)).toString() + '/'
            : undefined,
    });
}

function buildHtml(context: vscode.ExtensionContext, webview: vscode.Webview): string {
    const media = path.join(context.extensionPath, 'media');
    const toUri = (file: string) => webview.asWebviewUri(vscode.Uri.file(path.join(media, file))).toString();

    let html = fs.readFileSync(path.join(media, 'nmd.html'), 'utf8');
    const csp = `default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' ${webview.cspSource}; style-src 'unsafe-inline' ${webview.cspSource}; img-src ${webview.cspSource} data: blob:; connect-src ${webview.cspSource}; font-src ${webview.cspSource};`;
    const initialZoom = context.globalState.get<number>('previewZoom', 1.0);

    const injected = `<script>
const vscodeApi = (typeof acquireVsCodeApi !== 'undefined') ? acquireVsCodeApi() : null;
window.addEventListener('message', e => {
    const msg = e.data;
    if (!msg) return;
    if (msg.type === 'render') {
        window.__nmdImageBase = msg.imageBase;
        renderMarkdown(msg.content);
    }
    if (msg.type === 'scroll') {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        if (max > 0) window.scrollTo({ top: msg.ratio * max, behavior: 'instant' });
    }
});
if (vscodeApi) {
    document.addEventListener('click', e => {
        const a = e.target.closest('a');
        if (!a) return;
        const href = a.getAttribute('href');
        if (!href || href.startsWith('http://') || href.startsWith('https://') || href.startsWith('#')) return;
        e.preventDefault();
        vscodeApi.postMessage({ type: 'openFile', path: href });
    });
}
(function() {
    let currentZoom = ${JSON.stringify(initialZoom)};
    const savedState = vscodeApi ? vscodeApi.getState() : null;
    if (savedState && typeof savedState.zoom === 'number') {
        currentZoom = savedState.zoom;
    }
    if (currentZoom !== 1.0) {
        document.body.style.zoom = currentZoom;
    }

    const badge = document.createElement('div');
    badge.className = 'nmd-zoom-badge';
    badge.style.cssText = 'position:fixed;top:16px;right:16px;z-index:99999;padding:6px 12px;background:rgba(22,27,34,0.92);border:1px solid #30363d;border-radius:6px;color:#e6edf3;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:12px;font-weight:600;pointer-events:none;opacity:0;transition:opacity 0.15s ease-out;box-shadow:0 4px 12px rgba(0,0,0,0.4);';
    document.documentElement.appendChild(badge);

    let badgeTimer = null;
    function showBadge(text) {
        badge.textContent = text;
        badge.style.opacity = '1';
        clearTimeout(badgeTimer);
        badgeTimer = setTimeout(() => {
            badge.style.opacity = '0';
        }, 900);
    }

    function updateZoom(newZoom, anchorX, anchorY) {
        const clamped = Math.min(Math.max(newZoom, 0.3), 5.0);
        const rounded = Math.round(clamped * 1000) / 1000;
        if (Math.abs(rounded - currentZoom) < 0.001) return;

        const oldZoom = currentZoom;
        currentZoom = rounded;

        const scrollX = window.scrollX;
        const scrollY = window.scrollY;

        document.body.style.zoom = currentZoom;

        if (typeof anchorX === 'number' && typeof anchorY === 'number') {
            const newScrollX = (scrollX + anchorX) * (currentZoom / oldZoom) - anchorX;
            const newScrollY = (scrollY + anchorY) * (currentZoom / oldZoom) - anchorY;
            window.scrollTo(Math.max(0, newScrollX), Math.max(0, newScrollY));
        }

        showBadge(Math.round(currentZoom * 100) + '%');

        if (vscodeApi) {
            vscodeApi.setState({ ...vscodeApi.getState(), zoom: currentZoom });
            vscodeApi.postMessage({ type: 'zoom', zoom: currentZoom });
        }
    }

    window.addEventListener('wheel', (e) => {
        if (!e.ctrlKey && !e.metaKey) return;
        e.preventDefault();

        let delta = -e.deltaY;
        if (e.deltaMode === 1) delta *= 33;
        else if (e.deltaMode === 2) delta *= 100;

        const change = Math.max(Math.min(delta * 0.0015, 0.25), -0.25);
        updateZoom(currentZoom * (1 + change), e.clientX, e.clientY);
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
        if (!e.ctrlKey && !e.metaKey) return;
        if (e.key === '0' || e.code === 'Digit0' || e.code === 'Numpad0') {
            e.preventDefault();
            updateZoom(1.0, window.innerWidth / 2, window.innerHeight / 2);
        } else if (e.key === '=' || e.key === '+' || e.code === 'Equal' || e.code === 'NumpadAdd') {
            e.preventDefault();
            updateZoom(currentZoom * 1.15, window.innerWidth / 2, window.innerHeight / 2);
        } else if (e.key === '-' || e.key === '_' || e.code === 'Minus' || e.code === 'NumpadSubtract') {
            e.preventDefault();
            updateZoom(currentZoom / 1.15, window.innerWidth / 2, window.innerHeight / 2);
        }
    });
})();
</script>`;

    html = html
        .replace('https://nmd-local/shiki.js', toUri('shiki.bundle.js'))
        .replace('https://nmd-local/onig.wasm', toUri('onig.wasm'))
        .replace('https://nmd-local/mermaid.js', toUri('mermaid.min.js'))
        .replace('https://nmd-local/katex.css', toUri('katex.min.css'))
        .replace('https://nmd-local/katex.js', toUri('katex.bundle.js'))
        .replace('<head>', `<head>\n<meta http-equiv="Content-Security-Policy" content="${csp}">`)
        .replace('</body>', `${injected}\n</body>`);

    return html;
}

export function deactivate() {}
