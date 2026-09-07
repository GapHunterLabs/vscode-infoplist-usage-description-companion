import * as vscode from 'vscode';
import { findUsedApiSignals, parsePlistKeys, findMissingUsageDescriptions } from './usageCheck';

let diagnostics: vscode.DiagnosticCollection;

async function findInfoPlist(): Promise<vscode.Uri | undefined> {
  const matches = await vscode.workspace.findFiles('**/Info.plist', '**/{Pods,DerivedData,node_modules}/**', 5);
  return matches[0];
}

async function refreshWorkspace(): Promise<void> {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) return;

  const plistUri = await findInfoPlist();
  if (!plistUri) {
    diagnostics.clear();
    return;
  }

  const sourceFiles = await vscode.workspace.findFiles(
    '**/*.{swift,m,mm}',
    '**/{Pods,DerivedData,node_modules,.build}/**',
    5000,
  );

  const usedSignals = new Set<string>();
  for (const uri of sourceFiles) {
    let text: string;
    try {
      text = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8');
    } catch {
      continue;
    }
    for (const signal of findUsedApiSignals(text)) usedSignals.add(signal);
  }

  let plistText: string;
  try {
    plistText = Buffer.from(await vscode.workspace.fs.readFile(plistUri)).toString('utf8');
  } catch {
    return;
  }
  const plistKeys = parsePlistKeys(plistText);
  const missing = findMissingUsageDescriptions(usedSignals, plistKeys);

  diagnostics.clear();
  if (missing.length === 0) return;

  const diags = missing.map((m) => {
    const range = new vscode.Range(0, 0, 0, Number.MAX_SAFE_INTEGER);
    const diagnostic = new vscode.Diagnostic(
      range,
      `Your code appears to use ${m.signal}-related APIs, but Info.plist has none of the required keys: ${m.acceptableKeys.join(' or ')}. This is a common cause of App Store Connect rejection.`,
      vscode.DiagnosticSeverity.Warning,
    );
    diagnostic.source = 'Info.plist Usage Description Companion';
    return diagnostic;
  });
  diagnostics.set(plistUri, diags);
}

export function activate(context: vscode.ExtensionContext): void {
  diagnostics = vscode.languages.createDiagnosticCollection('infoPlistUsageDescriptionCompanion');
  context.subscriptions.push(diagnostics);

  void refreshWorkspace();

  const watcher = vscode.workspace.createFileSystemWatcher('**/{*.swift,*.m,*.mm,Info.plist}');
  context.subscriptions.push(
    watcher,
    watcher.onDidChange(() => void refreshWorkspace()),
    watcher.onDidCreate(() => void refreshWorkspace()),
    watcher.onDidDelete(() => void refreshWorkspace()),
    vscode.commands.registerCommand('infoPlistUsageDescriptionCompanion.rescan', () => void refreshWorkspace()),
  );
}

export function deactivate(): void {
  diagnostics?.dispose();
}
