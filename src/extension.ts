import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

let panel: vscode.WebviewPanel | undefined;
let debounceTimer: ReturnType<typeof setTimeout> | undefined;

export function activate(context: vscode.ExtensionContext) {
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
        vscode.window.onDidChangeActiveTextEditor(() => pushContent())
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
    panel.webview.html = buildHtml(context, panel.webview);
    panel.onDidDispose(() => { panel = undefined; }, null, context.subscriptions);
    pushContent();
}

function pushContent() {
    if (!panel) return;
    const editor = vscode.window.activeTextEditor;
    panel.webview.postMessage({ type: 'render', content: editor ? editor.document.getText() : '' });
}

function buildHtml(context: vscode.ExtensionContext, webview: vscode.Webview): string {
    const media = path.join(context.extensionPath, 'media');
    const toUri = (file: string) => webview.asWebviewUri(vscode.Uri.file(path.join(media, file))).toString();

    let html = fs.readFileSync(path.join(media, 'nmd.html'), 'utf8');
    const csp = `default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' ${webview.cspSource}; style-src 'unsafe-inline'; img-src ${webview.cspSource} data: blob:; connect-src ${webview.cspSource}; font-src ${webview.cspSource};`;

    html = html
        .replace('https://nmd-local/shiki.js', toUri('shiki.bundle.js'))
        .replace('https://nmd-local/onig.wasm', toUri('onig.wasm'))
        .replace('https://nmd-local/mermaid.js', toUri('mermaid.min.js'))
        .replace('<head>', `<head>\n<meta http-equiv="Content-Security-Policy" content="${csp}">`)
        .replace('</body>', `<script>\nwindow.addEventListener('message', e => {\n    if (e.data && e.data.type === 'render') renderMarkdown(e.data.content);\n});\n</script>\n</body>`);

    return html;
}

export function deactivate() {}
