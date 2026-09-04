# TXT Drive

A lightweight **TXT-only cloud storage demo** built as a public portfolio project.

TXT Drive allows authenticated users to upload, create, view, and download text files while enforcing server-side file validation, storage limits, duplicate-name protection, and rate limiting.

**Live Demo:** `https://gle.qzz.io/`

**Portfolio:** `https://faisalimap.is-a.dev/drive`

---

## Features

* 🔐 Authentication required, no guest access
* 📄 `.txt` files only
* 📏 Maximum file size: **1 MB**
* 📦 Maximum storage: **950 files**
* ⬆️ Upload existing TXT files
* ✍️ Create TXT files directly in the browser
* 📊 Live UTF-8 byte counter while creating files
* 👀 Read-only file viewer
* ⬇️ Download files
* 🖱️ Drag-and-drop uploads
* 🔄 Refresh file list
* 🚪 Logout and session management
* 🚫 Users cannot delete or rename files
* 🛡️ Server-side validation
* 🔁 Case-insensitive duplicate filename protection
* ⚡ IP and account-based rate limiting
* ⚠️ Public-service warning before entering the application
* 👤 Public demo accounts for testing

---

## Rate Limits

TXT Drive uses multiple limits to prevent abuse.

| Action                           |     Limit |
| -------------------------------- | --------: |
| Uploads per IP                   |  3 / hour |
| Uploads per account              | 25 / hour |
| Distinct files viewed per IP     | 10 / hour |
| Distinct files downloaded per IP |  5 / hour |
| Total files                      |       950 |
| Maximum file size                |      1 MB |

Repeated views or downloads of the **same file** count only once within the applicable hourly window.

---

## Demo Accounts

The project includes public demo accounts so visitors can test the application without creating their own account.

| Account | Email          | Password   |
| ------- | -------------- | ---------- |
| acc-1   | `email@me.dev` | `12345678` |
| acc-2   | `u@t.me`       | `ux@12225` |
| acc-3   | `q@x.com`      | `ux@12225` |

These credentials are intentionally public and should **never** be used for private or sensitive information.

---

## How It Works

```text
                    ┌──────────────────┐
                    │   TXT Drive UI   │
                    │    index.html    │
                    └────────┬─────────┘
                             │
                             │ Authenticated request
                             │
                    ┌────────▼─────────┐
                    │ Appwrite Function│
                    │     Backend      │
                    └───────┬───┬──────┘
                            │   │
                ┌───────────┘   └────────────┐
                │                            │
        ┌───────▼────────┐          ┌────────▼────────┐
        │ Appwrite Auth  │          │ Appwrite Storage│
        │    / Users     │          │   Private Files │
        └────────────────┘          └─────────────────┘
                                          
                                    ┌─────────────────┐
                                    │   TablesDB      │
                                    │ Rate Limiting   │
                                    └─────────────────┘
```

The frontend communicates with an Appwrite Function rather than directly exposing privileged storage operations.

The Function is responsible for:

* Authentication
* File validation
* File size validation
* Filename validation
* Duplicate detection
* Storage operations
* Rate limiting
* Storage capacity checks

---

## Security

The frontend contains only public configuration required to communicate with Appwrite.

Privileged Appwrite credentials are **not exposed in the frontend**.

The backend validates every upload independently, meaning client-side checks are not treated as a security boundary.

### Server-side checks

Every upload is checked for:

* `.txt` extension
* Valid UTF-8 data
* Maximum 1 MB size
* Safe filename
* Duplicate filename
* Maximum file count
* IP rate limits
* Account upload limits
* Valid authenticated user

---

## Project Structure

```text
txt-drive/
│
├── index.html
├── 404.html
├── CNAME
├── README.md
│
└── function/
    ├── index.js
    ├── package.json
    └── function.tar.gz
```

### Frontend

`index.html` contains the complete TXT Drive interface, including:

* Login
* Demo accounts
* Warning popup
* File upload
* Drag and drop
* TXT creation
* File viewer
* Download controls
* Session management

### Backend

`function/index.js` contains the server-side API.

Supported operations include:

```text
list
upload
view
download
```

Users intentionally do not have delete or rename operations.

---

## Appwrite Configuration

TXT Drive uses:

* **Appwrite Authentication**
* **Appwrite Functions**
* **Appwrite Storage**
* **Appwrite TablesDB**

Required backend environment variables include:

```text
APPWRITE_FUNCTION_PROJECT_ID
APPWRITE_FUNCTION_API_ENDPOINT
APPWRITE_FUNCTION_API_KEY

BUCKET_ID

RATE_DATABASE_ID
RATE_TABLE_ID
RATE_LIMIT_SALT
```

The exact values should be configured in the Appwrite Function environment and **must not be committed to GitHub**.

---

## Running Locally

Clone the repository:

```bash
git clone https://github.com/faisalimap/drive.git
cd drive
```

Open `index.html` using a local web server.

For example:

```bash
python -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

The frontend requires the configured Appwrite project and deployed Function to be available.

---

## Deployment

### Frontend

The frontend can be deployed using GitHub Pages or another static hosting provider.

Make sure the deployed domain is added as a **Web Platform** in the Appwrite project.

### Backend

The backend is deployed as an Appwrite Function.

The deployment archive contains:

```text
index.js
package.json
```

at the archive root.

---

## Important Notice

TXT Drive is a **public demonstration project**.

Files uploaded to the service may be accessible to other authenticated users. Do not upload:

* Passwords
* API keys
* Tokens
* Personal documents
* Private information
* Confidential business data
* Sensitive credentials

Users cannot remove their own files. The administrator may remove files at any time.

---

## Technology Stack

* HTML
* JavaScript
* Tailwind CSS
* Appwrite
* Appwrite Functions
* Appwrite Storage
* Appwrite TablesDB
* GitHub Pages

---

## Purpose

TXT Drive was built as a portfolio project to demonstrate practical implementation of:

* Authentication
* Serverless backend development
* Cloud storage
* API design
* File validation
* Rate limiting
* Database operations
* Client/server security boundaries
* Static web deployment

---

## Author

**Faisal Muzaffar**

GitHub: `https://github.com/faisalimap`

Portfolio: `https://faisalimap.is-a.dev/`

---

## License

This project is provided for demonstration and portfolio purposes.
