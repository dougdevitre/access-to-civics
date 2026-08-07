#!/usr/bin/env node
/**
 * Ingest CLI.
 *
 *   npm run ingest -- --state MO --dry-run   # fetch + verify, writes nothing
 *   npm run ingest -- --state MO --write     # verify, then publish data/published/<st>.json
 *
 * The published corpus diff is reviewed like any other change — the words in it are the
 * words a child will read, so the PR diff is the human-review step.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Gloss, isPublishable } from '../schema/index.js';
import { getAdapter, registeredStates } from './adapters/registry.js';
import { verifyExtraction, corpusChecksum } from './pipeline/verify.js';

interface Args { state?: string; dryRun: boolean; write: boolean }

function parseArgs(argv: string[]): Args {
  const args: Args = { dryRun: false, write: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--state') {
      const value = argv[++i];
      if (value !== undefined) args.state = value;
    } else if (argv[i] === '--dry-run') args.dryRun = true;
    else if (argv[i] === '--write') args.write = true;
  }
  return args;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (!args.state) {
    console.error(`Usage: ingest --state <XX> [--dry-run]`);
    console.error(`Registered adapters: ${registeredStates().join(', ') || 'none'}`);
    process.exitCode = 2;
    return;
  }

  const adapter = getAdapter(args.state);
  console.log(`[ingest] ${adapter.state} from ${adapter.sourceRoot}`);

  const docs = await adapter.fetch();
  const toc = await adapter.tableOfContents(docs);
  const clauses = await adapter.extract(docs);

  const result = verifyExtraction(clauses, toc, docs);
  for (const issue of result.issues) {
    console[issue.severity === 'error' ? 'error' : 'warn'](
      `  [${issue.severity}] ${issue.code}: ${issue.detail}`,
    );
  }

  const checksum = corpusChecksum(clauses);
  console.log(`[ingest] ${clauses.length} clauses, checksum ${checksum}`);

  if (!result.ok) {
    console.error('[ingest] verification failed — nothing published');
    process.exitCode = 1;
    return;
  }
  if (args.dryRun || !args.write) {
    console.log('[ingest] verification passed; pass --write to publish data/published/');
    return;
  }

  // L2 glosses ship only if frozen and reviewed (docs/07-roadmap.md gloss-freeze gate).
  const glossFile = `data/seed/${adapter.state.toLowerCase()}/glosses.json`;
  const glosses: Gloss[] = [];
  if (existsSync(glossFile)) {
    for (const raw of JSON.parse(readFileSync(glossFile, 'utf8')).glosses ?? []) {
      const gloss = Gloss.parse(raw);
      if (!isPublishable(gloss)) {
        console.error(`[ingest] unpublishable gloss for ${gloss.clause_urn} — review and freeze it first`);
        process.exitCode = 1;
        return;
      }
      glosses.push(gloss);
    }
  }

  const out = `data/published/${adapter.state.toLowerCase()}.json`;
  mkdirSync('data/published', { recursive: true });
  writeFileSync(
    out,
    JSON.stringify(
      {
        $comment:
          'Published clause corpus (L1). Text is verbatim from the cited official source, ' +
          'traceable via source_sha256 to the raw page in data/raw/. Review the diff — these ' +
          'are the words a child reads.',
        state: adapter.state,
        built_at: new Date().toISOString(),
        checksum,
        clauses,
        glosses,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(`[ingest] wrote ${out}`);
}

main().catch((err: unknown) => {
  console.error(`[ingest] ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
