# TXT Drive

A public, TXT-only Appwrite storage demo.

## Architecture

Browser → Appwrite Auth → Appwrite Function → Appwrite Storage + Database

The browser never receives an Appwrite API key and never directly reads/writes the storage bucket.

## Limits

- Authentication required
- `.txt` only
- 1 MiB maximum, enforced server-side
- 950 files maximum
- 3 uploads/IP/hour
- 25 uploads/account/hour
- 5 distinct files downloaded/IP/hour
- 10 distinct files viewed/IP/hour
- No user delete or rename

View/download quotas are per distinct file. Re-opening the same file does not consume another slot.

## Appwrite setup

1. Keep the existing project and storage bucket if desired.
2. Configure the bucket:
   - Maximum file size: 1 MB
   - Allowed extensions: `txt`
   - Enable antivirus if your Appwrite plan supports it
   - Do not grant public read/write access to the bucket
3. Create a database named `txt-drive-rate-limit`.
4. Create a collection named `events`.
5. Add these attributes:
   - `action`: string, 20 chars
   - `window`: integer
   - `ipHash`: string, 64 chars
   - `accountId`: string, 36 chars
   - `fileKey`: string, 36 chars
   - `createdAt`: datetime
6. Add an index for `action`, `window`, `ipHash` and another for `action`, `window`, `accountId`.
7. Create an Appwrite Function using `function/index.js`, Node.js runtime.
8. Give the function dynamic API-key scopes for:
   - Storage: read, create
   - Databases: read, create, delete
9. Add function variables:
   - `BUCKET_ID=6a8c8fe400135b0b3b9e`
   - `RATE_DATABASE_ID=<your database id>`
   - `RATE_COLLECTION_ID=<your collection id>`
   - `RATE_LIMIT_SALT=<long random secret>`
   - `APPWRITE_FUNCTION_API_ENDPOINT=https://sgp.cloud.appwrite.io/v1`
10. Set the function execute permission so authenticated users can execute it.
11. Copy the function's generated HTTPS domain into `index.html` in `FUNCTION_DOMAIN_REPLACE`.
12. Keep the function domain HTTPS-only.
13. Add `gle.qzz.io` as an allowed web platform/origin in Appwrite.
14. Put `index.html` on `gle.qzz.io`.
15. Embed that page at `faisalimap.is-a.dev/drive`.

## Important

Do not put an Appwrite API key in `index.html`.

The existing bucket should not be publicly readable/writable. All file access should pass through the function so the IP-based view/download limits cannot be bypassed by directly using Appwrite Storage URLs.

For a production-grade service, also consider a WAF/CDN rate limit in front of the function. The application-level limits here are the required portfolio-demo limits.

## Demo credentials

The login page intentionally supports visible public demo accounts. Replace the three placeholders in `index.html` with the email/password pairs of the Appwrite accounts you create. These credentials are not secrets because they are meant to be published.

## Storage permissions

Do not give the bucket `Role.any()` read access. The function is the only component that should have storage access. Users authenticate to the function, and the function uses its server-side dynamic API key to read/write the bucket.


## Appwrite Web platform

Because the production frontend is hosted at `gle.qzz.io`, add a **Web** platform in the Appwrite project with hostname:

`gle.qzz.io`

If you also test from a Vercel deployment, keep that exact Vercel hostname as another Web platform. Appwrite platform hostnames are used for CORS.

For the Function's generated domain, set its execute permission to **Any** because generated/custom Function domains execute as guests; the Function then validates the user's `x-appwrite-user-jwt` before allowing file operations.
