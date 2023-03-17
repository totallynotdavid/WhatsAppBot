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

async function paperKeyword(message, stringifyMessage, robotEmoji) {
  const keywords = stringifyMessage[1];
  try {
    const response = await searchByKeyword(keywords);
    if (response) {
      message.reply(`${robotEmoji} Resultados:\n\n${response}`);
    } else {
      message.reply("No se han encontrado artículos.");
    }
  } catch (error) {
    console.log("Error buscando papers:", error);
    message.reply("Ha ocurrido un error al buscar los artículos.");
  }
}

async function searchByKeyword(keywords, maxResults = 5) {
  const api = "https://api.semanticscholar.org/graph/v1/paper/search";
  const query = {
    query: keywords,
    fields: "paperId,title,authors"
  };

  let response = null;
  try {
    response = await request(api, query);
  } catch (error) {
    console.log("error", error);
  }

  if (response && response.data && response.data.length > 0) {
    return formatResponse(response.data.slice(0, maxResults));
  } else {
    return "No se han encontrado artículos.";
  }
}

function formatResponse(results) {
  return results
    .map((result, index) => {
      const maxAuthors = 2;
      const authors = result.authors.slice(0, maxAuthors).map(author => author.name);
      const authorString =
        authors.length === result.authors.length
          ? authors.join(", ")
          : `${authors.join(", ")} et al.`;
      return `${index + 1}. *${result.title}* de _${authorString}_`;
    })
    .join("\n\n");
}

async function request(api, query) {
  try {
    const queryString = Object.entries(query)
      .map(([key, value]) => `${key}=${value}`)
      .join("&");
    const url = `${api}?${queryString}`;
    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });
    return await response.json();
  } catch (error) {
    throw error;
  }
}

module.exports = {
  getPdfLink,
	paperKeyword,
};
