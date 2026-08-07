# Infrastructure

CDK stack. Deliberately small: the classroom experience is static files, so most of the
surface area is the build-time pipeline.

## Resources

| Resource | Purpose | Notes |
|---|---|---|
| S3 `raw-corpus` | L0 immutable source documents | Versioning on, deny-delete bucket policy |
| S3 `bundles` | Published per-state static bundles | Public read via CloudFront only |
| DynamoDB `access-to-civics` | L1/L2 clause + gloss store | 2 GSIs, on-demand billing |
| Lambda `authoring-api` | Build-time reads | Not reachable from the web tier |
| CloudFront + S3 | The game itself | No API origin |

## IAM

Three roles, least privilege:

- `ingest-publish` — write to raw-corpus and DynamoDB. Never read bundles.
- `bundle-export` — read DynamoDB, write bundles. Never write DynamoDB.
- `authoring-api` — read DynamoDB only.

The web tier has **no IAM identity at all**, because it makes no AWS calls.

## Secrets

SSM SecureString or env vars. Never hardcoded, never in the bundle.
