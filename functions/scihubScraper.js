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