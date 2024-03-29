const fs = require(`fs`);
const path = require(`path`);
const fetch = require(`node-fetch`);
const { pipeline } = require(`stream`);

const sciHub_baseURL = `https://pismin.com/`;

async function getPdfLink(
    message,
    client,
    MessageMedia,
    stringifyMessage,
    robotEmoji
) {
    const link = stringifyMessage[1];
    const response = await fetch(`${sciHub_baseURL}${link}`);
    const html = await response.text();

    const citationDiv = /<div\s+id="citation"[^>]*>(.*?)<\/div>/s.exec(html);
    let paperTitle = null;

    if (citationDiv && citationDiv[1]) {
        const titleMatch = /<i>(.*?)<\/i>/s.exec(citationDiv[1]);
        paperTitle = titleMatch ? titleMatch[1].trim() : null;
    }

    // Find the div with id="article"
    const articleDiv = /<div\s+id="article">(.*?)<\/div>/s.exec(html);

    if (articleDiv && articleDiv[1]) {
        // Find the embed tag with id="pdf" inside the article div
        const pdfEmbedTag =
            /<embed\s+type="application\/pdf"\s+src="(.*?)"\s+id="pdf"/s.exec(
                articleDiv[1]
            );

        if (pdfEmbedTag && pdfEmbedTag[1]) {
            const pdfLink = pdfEmbedTag[1];
            const pdfFilename = await downloadPdf(pdfLink, link);
            const media = await MessageMedia.fromFilePath(
                path.join(__dirname, `../pdf`, pdfFilename)
            );
            const caption = paperTitle
                ? `${robotEmoji} El artículo que encontré es: *${paperTitle}*`
                : `${robotEmoji} Aquí está tu artículo.`;
            await client.sendMessage(message.id.remote, media, { caption });
            fs.unlinkSync(path.join(__dirname, `../pdf`, pdfFilename));
        } else {
            message.reply(
                `${robotEmoji} No hemos podido encontrar el PDF de este artículo.`
            );
        }
    } else {
        message.reply(
            `${robotEmoji} No hemos podido encontrar el PDF de este artículo.`
        );
    }
}

async function downloadPdf(pdfLink, link) {
    const timestamp = new Date().toISOString().replace(/:/g, `-`);
    const sanitizedLink = link.replace(/\//g, `_`);
    const outputFilename = `${sanitizedLink}_${timestamp}.pdf`;

    const response = await fetch(pdfLink);

    if (!response.ok) {
        throw new Error(
            `Failed to download PDF: ${response.status} ${response.statusText}`
        );
    }

    const fileStream = fs.createWriteStream(
        path.join(__dirname, `../pdf`, outputFilename)
    );

    return new Promise((resolve, reject) => {
        pipeline(response.body, fileStream, error => {
            if (error) {
                reject(error);
            } else {
                resolve(outputFilename);
            }
        });
    });
}

async function getDoi(paperId) {
    const api = `https://api.semanticscholar.org/graph/v1/paper/${paperId}`;
    const query = {
        fields: `externalIds`,
    };

    try {
        const response = await request(api, query);
        return response.externalIds ? response.externalIds.DOI : null;
    } catch (error) {
        console.log(`Error getting DOI:`, error);
        return null;
    }
}

async function paperKeyword(message, query, robotEmoji) {
    const keywords = query;
    try {
        const response = await searchByKeyword(keywords);

        if (response) {
            message.reply(`${robotEmoji} Resultados:\n\n${response}`);
        } else {
            message.reply(`${robotEmoji} No se han encontrado artículos.`);
        }
    } catch (error) {
        message.reply(`Ha ocurrido un error al buscar los artículos.`);
    }
}

async function searchByKeyword(keywords, maxResults = 5) {
    const api = `https://api.semanticscholar.org/graph/v1/paper/search`;
    const formattedKeywords = keywords.trim().replace(/\s\s+/g, ` `);

    const query = {
        query: encodeURIComponent(formattedKeywords),
        fields: `paperId,title,authors,year,journal`,
    };

    let response = null;
    try {
        response = await request(api, query);
    } catch (error) {
        console.log(`error`, error);
    }

    if (response && response.data && response.data.length > 0) {
        return formatResponse(response.data.slice(0, maxResults));
    } else {
        return `No se han encontrado artículos.`;
    }
}

async function authorRecentPapers(message, authorQuery, robotEmoji) {
    try {
        const papers = await getAuthorRecentPapers(authorQuery);
        if (papers.length > 0) {
            const paperList = papers
                .map(
                    (paper, index) =>
                        `${index + 1}. *${paper.title}* ${
                            paper.year ? `(${paper.year})` : ``
                        }${
                            paper.doi
                                ? ` (DOI: https://doi.org/${paper.doi})`
                                : ``
                        }`
                )
                .join(`\n\n`);
            message.reply(
                `${robotEmoji} Últimos artículos de ${authorQuery}:\n\n${paperList}`
            );
        } else {
            message.reply(
                `${robotEmoji} No se encontraron artículos recientes para ${authorQuery}.`
            );
        }
    } catch (error) {
        console.log(`Error al buscar artículos recientes:`, error);
        message.reply(
            `Ha ocurrido un error al buscar los artículos recientes.`
        );
    }
}

async function getAuthorRecentPapers(authorQuery, maxResults = 5) {
    const api = `https://api.semanticscholar.org/graph/v1/author/search`;
    const query = {
        query: encodeURIComponent(authorQuery),
        fields: `papers,papers.paperId,papers.externalIds,papers.title,papers.year`, // papers(paperId,title,year,externalIds)
    };

    const response = await request(api, query);

    if (response && response.data && response.data.length > 0) {
        const author = response.data[0];
        const sortedPapers = author.papers.sort((a, b) => b.year - a.year);
        const recentPapers = sortedPapers.slice(0, maxResults);
        return recentPapers.map(paper => ({
            title: paper.title,
            year: paper.year,
            doi: paper.externalIds ? paper.externalIds.DOI : null,
        }));
    } else {
        return [];
    }
}

async function formatResponse(results) {
    const formattedResults = await Promise.all(
        results.map(async (result, index) => {
            const maxAuthors = 2;
            const authors = result.authors
                .slice(0, maxAuthors)
                .map(author => author.name);
            const authorString =
                authors.length === result.authors.length
                    ? authors.join(`, `)
                    : `${authors.join(`, `)} et al.`;

            const doi = await getDoi(result.paperId);

            return `${index + 1}. *${result.title}* (${
                result.year
            }) de _${authorString}_ ${
                result.journal && result.journal.name
                    ? `publicado en ${result.journal.name}`
                    : ``
            } ${doi ? `(DOI: https://doi.org/${doi})` : ``}`;
        })
    );

    return formattedResults.join(`\n\n`);
}

async function request(api, query) {
    const queryString = Object.entries(query)
        .map(([key, value]) => `${key}=${value}`)
        .join(`&`);
    const url = `${api}?${queryString}`;
    const response = await fetch(url, {
        method: `GET`,
        headers: { "Content-Type": `application/json` },
    });
    return await response.json();
}

function handleSearchPapersByKeywords(
    stringifyMessage,
    message,
    query,
    robotEmoji
) {
    if (stringifyMessage.length >= 2) {
        paperKeyword(message, query, robotEmoji);
    } else {
        message.reply(`${robotEmoji} ¿De qué tema quieres buscar?`);
    }
}

function handleSearchAuthor(stringifyMessage, message, query, robotEmoji) {
    if (stringifyMessage.length >= 2) {
        authorRecentPapers(message, query, robotEmoji);
    } else {
        message.reply(`${robotEmoji} ¿De qué autor quieres buscar?`);
    }
}

function handleDoiRequest(
    message,
    client,
    MessageMedia,
    stringifyMessage,
    robotEmoji
) {
    if (stringifyMessage.length === 2) {
        getPdfLink(message, client, MessageMedia, stringifyMessage, robotEmoji);
        return;
    } else {
        message.reply(
            `${robotEmoji} Adjunta el DOI de la publicación que quieres descargar.`
        );
    }
}

module.exports = {
    getPdfLink,
    paperKeyword,
    authorRecentPapers,
    handleSearchPapersByKeywords,
    handleSearchAuthor,
    handleDoiRequest,
};
