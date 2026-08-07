import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { Clause } from '../schema/index.js';

/**
 * Single-table read layer. See docs/adr/0003-dynamodb-single-table.md.
 *
 * IMPORTANT: this API is a BUILD-TIME artifact source, not a live classroom dependency.
 * The web tier reads static bundles and never touches DynamoDB. Least-privilege IAM should
 * reflect that: the export role reads, the publish role writes, the web tier has no access.
 *
 * All reads are Query. Never Scan.
 */

const TABLE = process.env['CIVICS_TABLE'] ?? 'access-to-civics';

const doc = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

export async function getClausesForState(state: string, limit = 200): Promise<Clause[]> {
  const out = await doc.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
      ExpressionAttributeValues: {
        ':pk': `STATE#${state.toUpperCase()}`,
        ':sk': 'CLAUSE#',
      },
      Limit: limit,
    }),
  );
  return (out.Items ?? []) as Clause[];
}

/**
 * The Mirror card query — how every state handled one topic.
 * GSI1 is the whole game.
 */
export async function compareTopicAcrossStates(topic: string, limit = 60): Promise<Clause[]> {
  const out = await doc.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'gsi1pk = :pk',
      ExpressionAttributeValues: { ':pk': `TOPIC#${topic.toUpperCase()}` },
      Limit: limit,
    }),
  );
  return (out.Items ?? []) as Clause[];
}

export async function getClauseVersions(baseUrnValue: string): Promise<Clause[]> {
  const out = await doc.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI2',
      KeyConditionExpression: 'gsi2pk = :pk',
      ExpressionAttributeValues: { ':pk': `URN#${baseUrnValue}` },
      ScanIndexForward: false,
    }),
  );
  return (out.Items ?? []) as Clause[];
}
