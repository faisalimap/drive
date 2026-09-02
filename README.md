# TXT Drive

A lightweight, public **TXT file storage and sharing demo** built with a static frontend and Appwrite.

**Live:** https://gle.qzz.io
**Portfolio:** https://faisalimap.is-a.dev/drive

## Features

* 🔐 Authentication required
* 📄 `.txt` files only
* 📦 Maximum file size: **1 MB**
* 📝 Built-in TXT file generator
* 🔎 View TXT files directly in the browser
* ⬇️ Download TXT files
* 🚫 Users cannot delete files
* 🚫 Users cannot rename files
* ⚠️ Duplicate filename detection
* 📊 Maximum **950 files** in the drive
* 📱 Responsive interface
* ☁️ Appwrite-powered authentication and storage
* 🛡️ Server-side validation and rate limiting

## Rate Limits

The service uses server-side rate limits to prevent abuse.

| Action     |                 Per IP | Per Account |
| ---------- | ---------------------: | ----------: |
| Uploads    |                 3/hour |     25/hour |
| File views | 10 distinct files/hour |   Unlimited |
| Downloads  |  5 distinct files/hour |   Unlimited |

Viewing or downloading the **same file repeatedly** does not consume additional distinct-file limits.

For uploads, both the IP and account limits apply.

## Public Demo Accounts

These accounts are intentionally provided for public demonstration:

| Account | Email          | Password   |
| ------- | -------------- | ---------- |
| acc-1   | `email@me.dev` | `12345678` |
| acc-2   | `u@t.me`       | `ux@12225` |
| acc-3   | `q@x.com`      | `ux@12225` |

These credentials are public by design and should **only** be used for the TXT Drive demo.

## Public Upload Notice

TXT Drive is a publicly available demonstration service.

Uploaded files may be accessible to other users. Only `.txt` files up to 1 MB are accepted.

Users cannot delete or rename uploaded files. The administrator may remove any file at any time.

The administrator does not review, verify, endorse, or take responsibility for content uploaded through the public demo accounts.

Do not upload:

* Personal or confidential information
* Passwords or credentials
* Private documents
* Illegal content
* Sensitive information
* Copyrighted material you do not have permission to share
* Malicious or harmful content

Use the service at your own discretion.

## Architecture

```text
Browser
   │
   ▼
TXT Drive Frontend
   │
   ▼
Appwrite Function
   │
   ├── Authentication
   ├── File validation
   ├── Duplicate checking
   ├── Rate limiting
   └── 950-file limit
   │
   ▼
Appwrite Storage
```

The frontend does not rely on client-side checks for security. Important restrictions are enforced by the backend Function.

## File Validation

Every upload is validated server-side.

The backend checks:

1. User is authenticated
2. Filename is valid
3. File extension is `.txt`
4. Actual file size is no greater than 1 MB
5. File contains valid UTF-8 text
6. Filename does not already exist
7. Drive contains fewer than 950 files
8. IP upload limit has not been reached
9. Account upload limit has not been reached

The built-in TXT editor uses the same backend upload pipeline.

## Storage

The project uses Appwrite for:

* User authentication
* File storage
* Rate-limit records

The Storage bucket should remain private. Normal users should not receive direct Storage access.

File viewing and downloading should go through the backend Function so that the server-side limits cannot simply be bypassed.

## Project Structure

```text
txt-drive/
├── index.html
├── 404.html
├── CNAME
├── README.md
└── function/
    ├── index.js
    └── package.json
```

## Deployment

### Frontend

The frontend can be hosted using GitHub Pages.

The repository uses:

```text
CNAME
```

with:

```text
gle.qzz.io
```

### Appwrite Function

The backend is deployed as an Appwrite Function.

Required environment variables:

```text
BUCKET_ID
DATABASE_ID
RATE_TABLE_ID
RATE_LIMIT_SALT
```

The Function also requires its normal Appwrite server-side credentials provided by the Appwrite Function environment.

### Appwrite Storage

Configure the storage bucket with:

```text
Maximum file size: 1 MB
Allowed extensions: txt
```

Keep the bucket private.

### Database

The rate-limit table stores server-side rate-limit records.

The table should not be directly accessible to normal users.

## Portfolio Integration

The application is designed to be embedded into the portfolio at:

```text
https://faisalimap.is-a.dev/drive
```

using an iframe pointing to:

```text
https://gle.qzz.io
```

## License

See [LICENSE](LICENSE).
