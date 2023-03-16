const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { pipeline } = require('stream');

const sciHub_baseURL = 'https://sci-hub.mksa.top/';
const iframeRegex = /<iframe src="(.*?)"(?:.*?)>/;

async function getPdfLink(message, client, MessageMedia, stringifyMessage) {
  const link = stringifyMessage[1];

  try {
    const response = await fetch(`${sciHub_baseURL}${link}`);
    const html = await response.text();
    const match = iframeRegex.exec(html);
    const pdfLink = match?.[1] ? match[1].startsWith('http') ? match[1] : `http:${match[1]}` : null;

    if (pdfLink) {
      const pdfFilename = await downloadPdf(pdfLink, link);
      const media = await MessageMedia.fromFilePath(path.join(__dirname, '../pdf', pdfFilename));
      await client.sendMessage(message.id.remote, media, {
        caption: 'PDF file',
      });

      fs.unlinkSync(path.join(__dirname, '../pdf', pdfFilename));
    } else {
      message.reply('🤖 No hemos podido encontrar el PDF de este artículo.');
    }
  } catch (error) {
    console.error(error);
  }
}

async function downloadPdf(pdfLink, link) {
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const sanitizedLink = link.replace(/\//g, '_');
  const outputFilename = `${sanitizedLink}_${timestamp}.pdf`;

  const response = await fetch(pdfLink);

  if (!response.ok) {
    throw new Error(`Failed to download PDF: ${response.status} ${response.statusText}`);
  }

  const fileStream = fs.createWriteStream(path.join(__dirname, '../pdf', outputFilename));

  return new Promise((resolve, reject) => {
    pipeline(response.body, fileStream, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve(outputFilename);
      }
    });
  });
}

module.exports = {
  getPdfLink,
};
