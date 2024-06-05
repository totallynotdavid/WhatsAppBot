const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const { pipeline } = require("stream");

const sciHub_baseURL = "https://pismin.com/";
const BASE_DOMAIN = "https://api.semanticscholar.org";

function extractTitle(htmlContent) {
    let decodedContent = htmlContent
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&");

    let previous;
    do {
        previous = decodedContent;
        decodedContent = decodedContent.replace(
            /<\/?(i|b|em|strong)[^>]*>/gi,
            ""
        );
        decodedContent = decodedContent.replace(/<\/?[^>]+(>|$)/g, "");
    } while (decodedContent !== previous);

    decodedContent = decodedContent.replace(/\s\s+/g, " ");
    return decodedContent.trim();
}

async function fetchFromApi(endpoint, queryParams) {
    const queryString = new URLSearchParams(queryParams).toString();
    const url = `${BASE_DOMAIN}${endpoint}?${queryString}`;

    const response = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
    }

    return response.json();
}

async function getPaperDetails(doi, fields = "") {
    const paperId = `DOI:${doi}`;
    const endpoint = `/graph/v1/paper/${paperId}`;
    try {
        const response = await fetchFromApi(endpoint, { fields });
        return response;
    } catch (error) {
        console.error("Error fetching paper details:", error);
        return null;
    }
}

function buildCaption(paperDetails, robotEmoji) {
    let caption = "";

    if (paperDetails) {
        const {
            title,
            authors: authorNames,
            year,
            abstract,
        } = {
            ...paperDetails,
            authors: paperDetails.authors.map(({ name }) => name),
        };

        if (title) {
            caption += `${robotEmoji} *Título*: ${title}\n`;
        }

        if (authorNames && authorNames.length > 0) {
            caption += `*Autor(es)*: ${authorNames.join(", ")}\n`;
        }

        if (year) {
            caption += `*Año*: ${year}\n`;
        }

        if (abstract) {
            caption += `\n*Resumen*:\n${abstract}`;
        }
    } else {
        caption = `${robotEmoji} No se encontraron detalles para este artículo.`;
    }

    return caption;
}

async function handleDoiRequest(
    message,
    client,
    MessageMedia,
    stringifyMessage,
    robotEmoji
) {
    const input = stringifyMessage[1];
    const isDOI = /^10\.\d{4,9}\/[-._;()/:A-Z0-9]+$/i.test(input);

    if (isDOI) {
        // Fetch paper details from Semantic Scholar
        const paperDetails = await getPaperDetails(
            input,
            "title,authors,year,abstract"
        );
        const caption = buildCaption(paperDetails, robotEmoji);

        try {
            const response = await fetch(`${sciHub_baseURL}${input}`);
            const html = await response.text();

            const articleDiv = /<div\s+id="article">(.*?)<\/div>/s.exec(html);

            if (articleDiv && articleDiv[1]) {
                const pdfEmbedTag =
                    /<embed\s+type="application\/pdf"\s+src="(.*?)"\s+id="pdf"/s.exec(
                        articleDiv[1]
                    );

                if (pdfEmbedTag && pdfEmbedTag[1]) {
                    const pdfLink = pdfEmbedTag[1];
                    const pdfFilename = await downloadPdf(pdfLink, input);
                    const media = await MessageMedia.fromFilePath(
                        path.join(__dirname, "../pdf", pdfFilename)
                    );
                    await client.sendMessage(message.id.remote, media, {
                        caption,
                    });
                    fs.unlinkSync(path.join(__dirname, "../pdf", pdfFilename));
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
        } catch (error) {
            message.reply(
                `${robotEmoji} Se ha producido un error al intentar obtener el artículo: ${error.message}`
            );
        }
    } else {
        // Handle regular URL
        const response = await fetch(`${sciHub_baseURL}${input}`);
        const html = await response.text();

        const citationDiv = /<div\s+id="citation"[^>]*>(.*?)<\/div>/s.exec(
            html
        );
        let paperTitle = null;

        if (citationDiv && citationDiv[1]) {
            paperTitle = extractTitle(citationDiv[1]);
        }

        const caption = paperTitle
            ? `${robotEmoji} *Metadata*: ${paperTitle}`
            : `${robotEmoji} Te adjunto el PDF del artículo.`;

        try {
            const articleDiv = /<div\s+id="article">(.*?)<\/div>/s.exec(html);

            if (articleDiv && articleDiv[1]) {
                const pdfEmbedTag =
                    /<embed\s+type="application\/pdf"\s+src="(.*?)"\s+id="pdf"/s.exec(
                        articleDiv[1]
                    );

                if (pdfEmbedTag && pdfEmbedTag[1]) {
                    const pdfLink = pdfEmbedTag[1];
                    const pdfFilename = await downloadPdf(pdfLink, input);
                    const media = await MessageMedia.fromFilePath(
                        path.join(__dirname, "../pdf", pdfFilename)
                    );
                    await client.sendMessage(message.id.remote, media, {
                        caption,
                    });
                    fs.unlinkSync(path.join(__dirname, "../pdf", pdfFilename));
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
        } catch (error) {
            message.reply(
                `${robotEmoji} Se ha producido un error al intentar obtener el artículo: ${error.message}`
            );
        }
    }
}

async function downloadPdf(pdfLink, link) {
    const timestamp = new Date().toISOString().replace(/:/g, "-");
    const sanitizedLink = link.replace(/\//g, "_");
    const outputFilename = `${sanitizedLink}_${timestamp}.pdf`;

    const response = await fetch(pdfLink);

    if (!response.ok) {
        throw new Error(
            `Failed to download PDF: ${response.status} ${response.statusText}`
        );
    }

    const fileStream = fs.createWriteStream(
        path.join(__dirname, "../pdf", outputFilename)
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

module.exports = {
    handleDoiRequest,
};
