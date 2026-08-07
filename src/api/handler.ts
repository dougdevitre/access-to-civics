import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { compareTopicAcrossStates, getClausesForState } from './repo.js';

/**
 * Build-time / authoring API. Not called from a classroom session.
 *
 * GET /states/{state}/clauses
 * GET /topics/{topic}/compare
 */
export async function handler(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> {
  try {
    const { state, topic } = event.pathParameters ?? {};

    if (state) return ok(await getClausesForState(state));
    if (topic) return ok(await compareTopicAcrossStates(topic));

    return fail(404, 'No route matched.');
  } catch (err: unknown) {
    console.error('handler error', err);
    return fail(500, 'Request could not be completed.');
  }
}

function ok(body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=3600' },
    body: JSON.stringify(body),
  };
}

function fail(statusCode: number, message: string): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ error: message }),
  };
}
