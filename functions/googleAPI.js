const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const process = require('process');
const { authenticate } = require('@google-cloud/local-auth');
const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/drive'];
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

const folderId = process.env.FOLDER_ID;

async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
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
      q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
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

function findFolderPath(folderMap, fileId) {
  const folder = folderMap.get(fileId);
  if (!folder) {
    return '';
  }
  const parentFolderId = folder.parents ? folder.parents[0] : null;
  const parentFolderPath = parentFolderId ? findFolderPath(folderMap, parentFolderId) : '';
  return `${parentFolderPath}/${folder.name}`;
}

async function searchFilesInFolders(authClient, folderIds, query, folderMap) {
  const drive = google.drive({ version: 'v3', auth: authClient });
  const parentQueries = folderIds.map((id) => `'${id}' in parents`).join(' or ');
  const files = [];
  let pageToken;

  do {
    const res = await drive.files.list({
      pageSize: 1000,
      pageToken,
      q: `(${parentQueries}) and mimeType != 'application/vnd.google-apps.folder' and fullText contains '${query}' and trashed = false`,
      fields: 'nextPageToken, files(id, name, parents, webViewLink)',
    });

    files.push(...res.data.files);
    pageToken = res.data.nextPageToken;
  } while (pageToken);

  if (files.length === 0) {
    console.log('No se encontraron archivos.');
    return;
  }

  console.log('Files:');
  const limit = Math.min(5, files.length);
  for (let i = 0; i < limit; i++) {
    const file = files[i];
    const parentFolderId = file.parents ? file.parents[0] : null;
    const folderPath = parentFolderId ? findFolderPath(folderMap, parentFolderId) : '';
    console.log(`Path: ${folderPath}/${file.name}`);
    console.log(`Link: ${file.webViewLink}`);
    console.log(`File: ${file.name} (${file.id})\n`);
  }
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
    return searchFilesInFolders(authClient, folderIds, query, this.folderMap);
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
const query1 = '2021';
const query2 = '2022';

authorize()
  .then(async (authClient) => {
    await folderCache.search(folderId, query1, authClient);
    await folderCache.search(folderId, query2, authClient);
  })
  .catch(console.error);