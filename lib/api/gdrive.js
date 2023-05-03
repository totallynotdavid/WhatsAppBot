const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const process = require('process');
const { authenticate } = require('@google-cloud/local-auth');
const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/drive'];
const TOKEN_PATH = path.join(process.cwd(), 'data', 'driveToken.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'data', 'driveCredentials.json');

const folderId = process.env.folder_id;

async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.promises.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    const client = await google.auth.fromJSON(credentials);
    client.setCredentials({
      refresh_token: credentials.refresh_token,
      access_token: credentials.access_token,
      expiry_date: credentials.expiry_date,
    });
    return { client, expiry_date: credentials.expiry_date };
  } catch (err) {
    return null;
  }
}

async function saveCredentials(client) {
  const content = await fs.promises.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
    access_token: client.credentials.access_token,
    expiry_date: client.credentials.expiry_date,
  });
  await fs.promises.writeFile(TOKEN_PATH, payload);
}

async function authorize() {
  let authData = await loadSavedCredentialsIfExist();
  if (authData && authData.expiry_date && authData.expiry_date > Date.now() + 60 * 1000) {
    return authData.client;
  }

  const client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });

  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

async function getAllFolders(authClient) {
  const drive = google.drive({ version: 'v3', auth: authClient });
  const folders = [];
  let pageToken;

  do {
    const res = await drive.files.list({
      pageSize: 1000,
      pageToken,
      q: 'mimeType=\'application/vnd.google-apps.folder\' and trashed=false',
      fields: 'nextPageToken, files(id, name, parents)',
    });

    folders.push(...res.data.files);
    pageToken = res.data.nextPageToken;
  } while (pageToken);

  return new Map(folders.map((folder) => [folder.id, folder]));
}

async function buildFolderTree(folderMap, folderId) {
  const folderIds = [];
  const processFolder = (id) => {
    folderIds.push(id);
    for (const [key, folder] of folderMap.entries()) {
      if (folder.parents && folder.parents.includes(id)) {
        processFolder(key);
      }
    }
  };
  processFolder(folderId);
  return folderIds;
}

function chunkArray(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

function escapeSingleQuotes(str) {
  return str.replace(/'/g, '\\\'');
}

async function searchFilesInFolders(authClient, folderIds, query) {
  const drive = google.drive({ version: 'v3', auth: authClient });
  const files = [];
  const escapedQuery = escapeSingleQuotes(query);
  const folderIdChunks = chunkArray(folderIds, 5); // Adjust the chunk size to ensure the query string is within the limit

  for (const chunk of folderIdChunks) {
    const parentQueries = chunk.map((id) => `'${id}' in parents`).join(' or ');

    let pageToken;
    do {
      const queryString = `(${parentQueries}) and mimeType != 'application/vnd.google-apps.folder' and fullText contains '${escapedQuery}' and trashed = false`;

      const res = await drive.files.list({
        pageSize: 1000,
        pageToken,
        q: queryString,
        fields: 'nextPageToken, files(id, name, parents, webViewLink)',
      });

      files.push(...res.data.files);
      pageToken = res.data.nextPageToken;
    } while (pageToken);
  }

  if (files.length === 0) {
    console.log('No se encontraron archivos.');
    return;
  }

  return files;
}

class FolderCache {
  constructor() {
    this.folderMap = null;
    this.scheduleRefresh();
  }

  async load(authClient) {
    this.folderMap = await getAllFolders(authClient);
  }

  async search(folderId, query, authClient) {
    if (!this.folderMap) {
      await this.load(authClient);
    }
    const folderIds = await buildFolderTree(this.folderMap, folderId);
    return searchFilesInFolders(authClient, folderIds, query/*, this.folderMap*/);
  }

  scheduleRefresh() {
    const oneDay = 24 * 60 * 60 * 1000;
    setTimeout(async () => {
      console.log('Estamos actualizando la caché...');
      try {
        const authClient = await authorize();
        await this.load(authClient);
        console.log('La caché se actualizó correctamente.');
      } catch (error) {
        console.error('Hubo un error al actualizar la caché:', error);
      }
      this.scheduleRefresh();
    }, oneDay);
  }
}

const folderCache = new FolderCache();

async function searchFolderCache(query) {
  try {
    const authClient = await authorize();
    return await folderCache.search(folderId, query, authClient);
  } catch (error) {
    console.error('Error buscando en la caché:', error);
  }
}

async function downloadFilesFromGoogleDrive(query) {
  const realFileId = extractFileIdFromDriveLink(query);

  try {
    const authClient = await authorize();
    const service = google.drive({ version: 'v3', auth: authClient });

    const fileMetadata = await service.files.get({
      fileId: realFileId,
      fields: 'webContentLink',
    });

    const response = await fetch(fileMetadata.data.webContentLink, {
      headers: {
        'Authorization': `Bearer ${authClient.credentials.access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Error downloading file: ${response.statusText}`);
    }

    const pdfDir = '../../pdf';
    await fs.promises.mkdir(pdfDir, { recursive: true });
    const filePath = path.join(__dirname, pdfDir, `${realFileId}.pdf`);
		console.log('The file will be saved in:', filePath)

    const fileStream = fs.createWriteStream(filePath);
    await new Promise((resolve, reject) => {
      response.body.pipe(fileStream);
      response.body.on('error', reject);
      fileStream.on('finish', resolve);
    });

    return filePath;
  } catch (err) {
    console.error('Error downloading file:', err);
    throw err;
  }
}

function extractFileIdFromDriveLink(link) {
  const fileIdRegex = /[-\w]{25,}/;
  const match = fileIdRegex.exec(link);
  return match ? match[0] : null;
}

module.exports = {
  searchFolderCache,
	downloadFilesFromGoogleDrive,
};