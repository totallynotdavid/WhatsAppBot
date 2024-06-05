const fetch = require("node-fetch");

const BASE_DOMAIN = "https://api.semanticscholar.org";

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

async function getDoi(paperId) {
    try {
        const response = await fetchFromApi(`/graph/v1/paper/${paperId}`, {
            fields: "externalIds",
        });
        return response.externalIds ? response.externalIds.DOI : null;
    } catch (error) {
        console.error(`Error getting DOI:`, error);
        return null;
    }
}

async function searchPapersByKeywords(keywords, maxResults = 5) {
    try {
        const response = await fetchFromApi("/graph/v1/paper/search", {
            query: encodeURIComponent(keywords.trim().replace(/\s\s+/g, " ")),
            fields: "paperId,title,authors,year,journal",
        });

        return response.data && response.data.length > 0
            ? formatPapersResponse(response.data.slice(0, maxResults))
            : "No se han encontrado artículos.";
    } catch (error) {
        console.error(`Error searching papers by keywords:`, error);
        return "No se han encontrado artículos.";
    }
}

async function formatPapersResponse(papers) {
    const formattedPapers = await Promise.all(
        papers.map(async (paper, index) => {
            const authors = paper.authors
                .slice(0, 2)
                .map(author => author.name);
            const authorString =
                authors.length === paper.authors.length
                    ? authors.join(", ")
                    : `${authors.join(", ")} et al.`;
            const doi = await getDoi(paper.paperId);

            return `${index + 1}. *${paper.title}* (${
                paper.year
            }) de _${authorString}_ ${
                paper.journal?.name ? `publicado en ${paper.journal.name}` : ""
            } ${doi ? `(DOI: https://doi.org/${doi})` : ""}`;
        })
    );

    return formattedPapers.join("\n\n");
}

async function searchAuthorRecentPapers(authorQuery, maxResults = 5) {
    try {
        const response = await fetchFromApi("/graph/v1/author/search", {
            query: encodeURIComponent(authorQuery),
            fields: "papers,papers.paperId,papers.externalIds,papers.title,papers.year",
        });

        if (response.data && response.data.length > 0) {
            const author = response.data[0];
            const recentPapers = author.papers
                .sort((a, b) => b.year - a.year)
                .slice(0, maxResults);

            return recentPapers.map(paper => ({
                title: paper.title,
                year: paper.year,
                doi: paper.externalIds?.DOI || null,
            }));
        }

        return [];
    } catch (error) {
        console.error(`Error searching author's recent papers:`, error);
        return [];
    }
}

async function handleSearchPapersByKeywords(
    stringifyMessage,
    message,
    query,
    robotEmoji
) {
    if (stringifyMessage.length < 2) {
        message.reply(`${robotEmoji} ¿De qué tema quieres buscar?`);
        return;
    }

    if (stringifyMessage.length > 2) {
        message.reply(
            `${robotEmoji} Por favor, introduce una sola palabra clave.`
        );
        return;
    }

    try {
        const results = await searchPapersByKeywords(query);
        message.reply(`${robotEmoji} Resultados:\n\n${results}`);
    } catch (error) {
        message.reply(`Ha ocurrido un error al buscar los artículos.`);
    }
}

async function handleSearchAuthor(message, authorQuery, robotEmoji) {
    if (authorQuery.trim().length < 2) {
        message.reply(`${robotEmoji} ¿De qué autor quieres buscar?`);
        return;
    }

    try {
        const papers = await searchAuthorRecentPapers(authorQuery);
        if (papers.length > 0) {
            const paperList = papers
                .map(
                    (paper, index) =>
                        `${index + 1}. *${paper.title}* (${paper.year})${
                            paper.doi
                                ? ` (DOI: https://doi.org/${paper.doi})`
                                : ""
                        }`
                )
                .join("\n\n");
            message.reply(
                `${robotEmoji} Últimos artículos de ${authorQuery}:\n\n${paperList}`
            );
        } else {
            message.reply(
                `${robotEmoji} No se encontraron artículos recientes para ${authorQuery}.`
            );
        }
    } catch (error) {
        message.reply(
            `Ha ocurrido un error al buscar los artículos recientes.`
        );
    }
}

module.exports = {
    handleSearchPapersByKeywords,
    handleSearchAuthor,
};
