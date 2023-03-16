/*
const baseURL = 'https://sci-hub.mksa.top/';
const link = '10.1038/nature14539';

async function getPdfLink(baseURL, link) {
    try {
      const response = await fetch(baseURL + link);
      const html = await response.text();
      // Use a non-global regex to improve performance
      const regex = new RegExp('<iframe src="(.*?)"');
      const match = regex.exec(html);
      if (match) {
        const pdfLink = match[1].startsWith('http') ? match[1] : 'http:' + match[1];
        console.log(`The PDF link for the paper with DOI: ${link} is ${pdfLink}.`);
        return pdfLink;
      }
      return null;
    } catch (error) {
      console.error(error);
      return null;
    }
}

getPdfLink(baseURL, link);
*/

/*
async function scrapePaper(paperId, maxAttempts = 100) {
  let api = `https://api.semanticscholar.org/graph/v1/paper/${paperId}`;
  let query = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  let response = null;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      response = await fetch(api, query);

      // cool down
      await new Promise(resolve => setTimeout(resolve, 200));

      if (response.ok) {
        break;
      } else {
        console.log(`Error: ${response.status}`);
      }
    } catch (e) {
      console.log("error", e);
    }
  }

  if (response !== null) {
    response = await response.json();
    // pretty print
    console.log(JSON.stringify(response, null, 2));
  }

  return response;
}

scrapePaper("10.1038/nature14539").catch(e => console.error(e));

*/

/*
const fs = require("fs");

async function searchByKeyword(keywords) {
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

  if (response) {
    fs.writeFile("search_results.json", JSON.stringify(response, null, 2), err => {
      if (err) {
        console.log("error", err);
      } else {
        console.log("Results saved to search_results.json");
      }
    });
  }

  return response;
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

searchByKeyword("machine learning").then(response => console.log(response));
*/

/*
// Find the papers of an author using their ID
const fs = require("fs");

let api = `https://api.semanticscholar.org/graph/v1/author/`;
let query = {
  fields: "authorId,paperCount,citationCount,hIndex,name,papers.abstract,papers.title,papers.year,papers.venue,papers.fieldsOfStudy"
};

async function scrapeAuthor(authorId) {
  try {
    const searchParams = new URLSearchParams();
    for (let key in query) {
      searchParams.append(key, query[key]);
    }

    let response = await fetch(`${api}${authorId}?${searchParams.toString()}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      },
    });

    console.log(`${api}?${searchParams.toString()}`);

    if (response.status === 200) {
      let data = await response.json();
      //console.log(data);

      fs.writeFile("author_data.json", JSON.stringify(data, null, "\t"), function(err) {
        if (err) {
          console.error("There was an error writing the file", err);
        } else {
          console.log("The file was saved successfully");
        }
      });

      return data;
    } else {
      throw new Error("Response status not 200");
    }
  } catch (error) {
    console.error("error", error);
    proxy = null;
  }
}

scrapeAuthor("1741101");
*/