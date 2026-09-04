const sdk = require("node-appwrite");
const crypto = require("crypto");

const { Client, Account, Storage, TablesDB, ID, Query, InputFile } = sdk;

const MAX_FILE_SIZE = 1024 * 1024;
const MAX_FILES = 950;
const IP_UPLOAD_LIMIT = 3;
const ACCOUNT_UPLOAD_LIMIT = 25;
const IP_DOWNLOAD_LIMIT = 5;
const IP_VIEW_LIMIT = 10;
const WINDOW_MS = 60 * 60 * 1000;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-appwrite-user-jwt",
  "Access-Control-Max-Age": "86400"
};

function json(res, data, status = 200) {
  return res.json(data, status, CORS_HEADERS);
}

function fail(res, message, status = 400, extra = {}) {
  return json(res, { message, ...extra }, status);
}

function hash(value) {
  return crypto.createHash("sha256")
    .update(`${process.env.RATE_LIMIT_SALT || ""}:${value}`)
    .digest("hex");
}

function hourWindow() {
  return Math.floor(Date.now() / WINDOW_MS);
}

function validTxtName(name) {
  return typeof name === "string"
    && name.length >= 1
    && name.length <= 100
    && /\.txt$/i.test(name)
    && !name.includes("/")
    && !name.includes("\\")
    && !name.includes("\0");
}

function safeName(name) {
  return name
    .replace(/[^a-zA-Z0-9._ -]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100) || "file.txt";
}

function isUtf8Text(buffer) {
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    return true;
  } catch {
    return false;
  }
}

function getEnv(name, ...aliases) {
  for (const key of [name, ...aliases]) {
    if (process.env[key]) return process.env[key];
  }
  return "";
}

async function authenticate(jwt) {
  if (!jwt) return null;

  const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT ||
    "https://sgp.cloud.appwrite.io/v1";
  const project = process.env.APPWRITE_FUNCTION_PROJECT_ID ||
    "6a8c8d1a002284d11da6";

  const userClient = new Client()
    .setEndpoint(endpoint)
    .setProject(project)
    .setJWT(jwt);

  const userAccount = new Account(userClient);
  return await userAccount.get();
}

async function fileNameExists(storage, bucketId, name) {
  const target = String(name).normalize("NFKC").toLocaleLowerCase();
  let offset = 0;

  while (true) {
    const result = await storage.listFiles({
      bucketId,
      queries: [Query.limit(100), Query.offset(offset)]
    });

    for (const file of result.files || []) {
      const current = String(file.name || "").normalize("NFKC").toLocaleLowerCase();
      if (current === target) return true;
    }

    if (!result.files || result.files.length < 100) return false;
    offset += 100;
  }
}

async function main({ req, res, log }) {
  // Direct Function domains receive browser preflight requests before POST.
  if (req.method === "OPTIONS") {
    return res.text("", 204, CORS_HEADERS);
  }

  if (req.method !== "POST") {
    return fail(res, "Method not allowed.", 405);
  }

  const body = req.bodyJson || {};
  const injectedUserId = req.headers["x-appwrite-user-id"];
  const jwt = req.headers["x-appwrite-user-jwt"] ||
    req.headers.authorization?.replace(/^Bearer\s+/i, "") ||
    body.jwt;
  let user;

  try {
    user = await authenticate(jwt);
  } catch (e) {
    log(`JWT authentication failed: ${e.message}`);
    return fail(res, "Authentication required. Please sign in again.", 401);
  }

  if (!user) return fail(res, "Authentication required. Please sign in again.", 401);

  if (injectedUserId && user.$id !== injectedUserId) {
    log("Authenticated user ID did not match Appwrite injected user ID.");
    return fail(res, "Authentication required. Please sign in again.", 401);
  }

  const action = body.action;

  const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT || "https://sgp.cloud.appwrite.io/v1";
  const project = process.env.APPWRITE_FUNCTION_PROJECT_ID;
  const functionKey = process.env.APPWRITE_FUNCTION_API_KEY;
  const bucketId = process.env.BUCKET_ID;
  const databaseId = getEnv("RATE_DATABASE_ID", "DATABASE_ID");
  const tableId = getEnv("RATE_TABLE_ID", "RATE_COLLECTION_ID", "TABLE_ID");
  const salt = process.env.RATE_LIMIT_SALT;

  if (!functionKey || !project || !bucketId) {
    log("Missing required Function environment variables.");
    return fail(res, "Server configuration is incomplete.", 500);
  }

  if (!databaseId || !tableId || !salt) {
    log("Missing RATE database/table/salt environment variables.");
    return fail(res, "Rate-limit storage is not configured.", 500);
  }

  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(project)
    .setKey(functionKey);

  const storage = new Storage(client);
  const tablesDB = new TablesDB(client);
  const userId = user.$id;
  const ip = req.headers["x-appwrite-client-ip"] || "unknown";
  const window = String(hourWindow());
  const ipHash = hash(ip);

  async function eventsFor(field, value, actionName) {
    const result = await tablesDB.listRows({
      databaseId,
      tableId,
      queries: [
        Query.equal(field, value),
        Query.equal("window", window),
        Query.equal("action", actionName),
        Query.limit(100)
      ],
      total: false
    });
    return result.rows || [];
  }

  async function recordUnique(key, actionName, extra = {}) {
    const rowId = hash(key).slice(0, 36);

    try {
      await tablesDB.createRow({
        databaseId,
        tableId,
        rowId,
        data: {
          rateKey: key,
          action: actionName,
          ipHash,
          accountId: userId,
          fileId: extra.fileId || "",
          window,
          createdAt: new Date().toISOString()
        }
      });
      return { created: true, rowId };
    } catch (e) {
      if (e.code === 409 || String(e.message || "").toLowerCase().includes("already exists")) {
        return { created: false, rowId };
      }
      throw e;
    }
  }

  async function enforceUploadLimits() {
    const ipRows = await eventsFor("ipHash", ipHash, "upload");
    if (ipRows.length >= IP_UPLOAD_LIMIT) {
      throw Object.assign(new Error("Upload limit reached: 3 uploads per IP per hour."), { status: 429 });
    }

    const accountRows = await eventsFor("accountId", userId, "upload");
    if (accountRows.length >= ACCOUNT_UPLOAD_LIMIT) {
      throw Object.assign(new Error("Upload limit reached: 25 uploads per account per hour."), { status: 429 });
    }
  }

  async function enforceUniqueAction(fileId, actionName, limit) {
    const key = `${ip}:${actionName}:${fileId}:${window}`;
    const reservation = await recordUnique(key, actionName, { fileId });

    if (!reservation.created) return;

    const rows = await eventsFor("ipHash", ipHash, actionName);
    if (rows.length > limit) {
      try {
        await tablesDB.deleteRow({
          databaseId,
          tableId,
          rowId: reservation.rowId
        });
      } catch {}

      throw Object.assign(
        new Error(actionName === "view"
          ? "View limit reached: 10 distinct files per IP per hour."
          : "Download limit reached: 5 distinct files per IP per hour."),
        { status: 429 }
      );
    }
  }

  try {
    if (action === "list") {
      const result = await storage.listFiles({
        bucketId,
        queries: [Query.orderDesc("$createdAt"), Query.limit(MAX_FILES)],
        total: true
      });

      return json(res, {
        total: result.total,
        files: (result.files || []).map(file => ({
          id: file.$id,
          name: file.name,
          size: file.sizeOriginal,
          mimeType: file.mimeType,
          createdAt: file.$createdAt
        }))
      });
    }

    if (action === "upload") {
      const name = typeof body.name === "string" ? body.name.normalize("NFKC") : body.name;
      const data = body.data;

      if (!validTxtName(name)) {
        return fail(res, "Only safe .txt filenames are allowed.", 400);
      }

      if (typeof data !== "string" || !data) {
        return fail(res, "Missing file data.", 400);
      }

      let buffer;
      try {
        buffer = Buffer.from(data, "base64");
      } catch {
        return fail(res, "Invalid file data.", 400);
      }

      if (!buffer.length) return fail(res, "Empty files are not allowed.", 400);
      if (buffer.length > MAX_FILE_SIZE) return fail(res, "File exceeds the 1 MB limit.", 413);
      if (!isUtf8Text(buffer)) return fail(res, "The file must contain valid UTF-8 text.", 400);

      const current = await storage.listFiles({
        bucketId,
        queries: [Query.limit(1)],
        total: true
      });

      if (current.total >= MAX_FILES) {
        return fail(res, "Drive capacity reached. The administrator must remove a file before another upload.", 409);
      }

      if (await fileNameExists(storage, bucketId, name)) {
        return fail(res, `A file named "${name}" already exists. Choose another name.`, 409);
      }

      await enforceUploadLimits();

      // One row contains both ipHash and accountId, so it counts once for
      // both the per-IP and per-account upload quotas.
      await recordUnique(
        `${ip}:upload:${userId}:${Date.now()}:${crypto.randomUUID()}`,
        "upload"
      );

      const file = await storage.createFile({
        bucketId,
        fileId: ID.unique(),
        file: InputFile.fromBuffer(buffer, safeName(name), "text/plain")
      });

      return json(res, {
        file: {
          id: file.$id,
          name: file.name,
          size: file.sizeOriginal,
          createdAt: file.$createdAt
        }
      }, 201);
    }

    if (action === "view" || action === "download") {
      const fileId = body.fileId;
      if (typeof fileId !== "string" || !/^[a-zA-Z0-9._-]{1,36}$/.test(fileId)) {
        return fail(res, "Invalid file.", 400);
      }

      const file = await storage.getFile({ bucketId, fileId });
      if (!/\.txt$/i.test(file.name) || file.sizeOriginal > MAX_FILE_SIZE) {
        return fail(res, "This file is not available.", 404);
      }

      if (action === "view") {
        await enforceUniqueAction(fileId, "view", IP_VIEW_LIMIT);
      } else {
        await enforceUniqueAction(fileId, "download", IP_DOWNLOAD_LIMIT);
      }

      const content = action === "view"
        ? await storage.getFileView({ bucketId, fileId })
        : await storage.getFileDownload({ bucketId, fileId });

      return json(res, {
        name: file.name,
        mimeType: "text/plain",
        data: Buffer.from(content).toString("base64")
      });
    }

    return fail(res, "Unknown action.", 400);
  } catch (e) {
    log(`Error: ${e.stack || e.message}`);
    return fail(res, e.message || "Server error.", e.status || 500);
  }
}

module.exports = async (context) => main(context);
