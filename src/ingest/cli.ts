#!/usr/bin/env node
/**
 * Ingest CLI.
 *
 *   npm run ingest -- --state MO --dry-run
 *
 * --dry-run fetches and verifies but writes nothing. Use it by default; a real publish
 * requires a human to review the diff against the previous crawl.
 */
import { getAdapter, registeredStates } from './adapters/registry.js';
import { verifyExtraction, corpusChecksum } from './pipeline/verify.js';

interface Args { state?: string; dryRun: boolean }

function parseArgs(argv: string[]): Args {
  const args: Args = { dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--state') {
      const value = argv[++i];
      if (value !== undefined) args.state = value;
    } else if (argv[i] === '--dry-run') args.dryRun = true;
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

  console.log(`[ingest] ${clauses.length} clauses, checksum ${corpusChecksum(clauses)}`);

  if (!result.ok) {
    console.error('[ingest] verification failed — nothing published');
    process.exitCode = 1;
    return;
  }
  if (args.dryRun) {
    console.log('[ingest] dry run, nothing written');
    return;
  }

  throw new Error('Publish path not implemented — requires human diff review. See docs/07-roadmap.md');
}

main().catch((err: unknown) => {
  console.error(`[ingest] ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
