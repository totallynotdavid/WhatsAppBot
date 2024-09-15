const fs = require("fs").promises;
const path = require("path");
const fetch = require("node-fetch");

const config =
    process.env.NODE_ENV === `production`
        ? require(`../config.prod`)
        : require(`../config.dev`);
const { TEMP_DIR } = config;

async function fetchAndSaveFile(url, extension) {
    await fs.mkdir(TEMP_DIR, { recursive: true });
    const filePath = path.join(TEMP_DIR, `${Date.now()}_temp.${extension}`);
    const response = await fetch(url);
    const buffer = await response.buffer();
    await fs.writeFile(filePath, buffer);
    return filePath;
}

async function readFileAsBase64(filePath) {
    const buffer = await fs.readFile(filePath);
    return buffer.toString("base64");
}

async function cleanupTempFiles(filePaths) {
    await Promise.all(filePaths.map(filePath => fs.unlink(filePath)));
}

module.exports = { fetchAndSaveFile, readFileAsBase64, cleanupTempFiles };
