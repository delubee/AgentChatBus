#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, context } from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const extensionRoot = path.resolve(__dirname, '..');
const outDir = path.join(extensionRoot, 'out');
const watchMode = process.argv.includes('--watch');

function git(args) {
  try {
    return execFileSync('git', args, { cwd: extensionRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

// Read by src/buildInfo.ts to tell fork builds apart from marketplace releases.
// out/ is excluded from the dirty check because it is tracked build output that every build rewrites.
const buildInfo = {
  commit: git(['rev-parse', '--short', 'HEAD']),
  branch: git(['rev-parse', '--abbrev-ref', 'HEAD']).replace(/^HEAD$/, ''),
  dirty: git(['status', '--porcelain', '--', ':(top)', ':(top,exclude)vscode-agentchatbus/out']) !== '',
};

const buildOptions = {
  define: { __ACB_BUILD_INFO__: JSON.stringify(buildInfo) },
  absWorkingDir: extensionRoot,
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  external: ['vscode'],
  minify: true,
  legalComments: 'none',
  logLevel: 'info',
  charset: 'utf8',
};

const entryBuilds = [
  {
    ...buildOptions,
    entryPoints: ['src/extension.ts'],
    outfile: 'out/extension.js',
  },
  {
    ...buildOptions,
    entryPoints: ['src/views/chatPanelHtml.ts'],
    outfile: 'out/views/chatPanelHtml.js',
  },
  {
    ...buildOptions,
    entryPoints: ['src/logic/testExports.ts'],
    outfile: 'out/logic/testExports.js',
  },
];

async function prepareOutDir() {
  if (existsSync(outDir)) {
    await rm(outDir, { recursive: true, force: true });
  }
  await mkdir(outDir, { recursive: true });
}

async function main() {
  await prepareOutDir();

  if (watchMode) {
    for (const options of entryBuilds) {
      const ctx = await context(options);
      await ctx.watch();
    }
    console.log('[build:extension] watching for changes...');
    return;
  }

  for (const options of entryBuilds) {
    await build(options);
  }
  console.log('[build:extension] bundled extension host and test-compatible helpers into out/');
  console.log(`[build:extension] build info: ${JSON.stringify(buildInfo)}`);
}

main().catch((error) => {
  console.error('[build:extension] failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
