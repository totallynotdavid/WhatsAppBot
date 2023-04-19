const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const process = require('process');
const { authenticate } = require('@google-cloud/local-auth');
const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/drive'];
const TOKEN_PATH = path.join(process.cwd(), 'fixedData', 'DRIVE_token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'fixedData', 'DRIVE_credenciales.json');

const folderId = process.env.folder_id;

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

async function searchFilesInFolders(authClient, folderIds, query/*, folderMap*/) {
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

module.exports = {
  searchFolderCache,
};