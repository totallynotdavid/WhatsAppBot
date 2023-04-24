const https = require('https');
const path = require('path');
const fs = require('fs');
const util = require('util');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const pageId = '104949204450480';
/* 
For testing use: 
https://developers.facebook.com/tools/debug/accesstoken/ 
https://developers.facebook.com/tools/explorer/
*/
const accessToken = process.env.facebook_access_token; 

if (!accessToken) {
  console.error('Access token not found. Please check your .env file.');
  process.exit(1);
}

const writeFile = util.promisify( fs.writeFile );

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode < 200 || response.statusCode >= 300) {
        return reject(new Error(`Request Failed. Status Code: ${response.statusCode}`));
      }
      resolve(response);
    }).on('error', (error) => {
      reject(error);
    });
  });
}

async function fetchPagePosts(pageId, accessToken) {
  const url = `https://graph.facebook.com/v16.0/${pageId}?fields=id,name,posts&access_token=${accessToken}`;

  // eslint-disable-next-line no-useless-catch
  try {
    const response = await get(url);
    const data = await new Promise((resolve, reject) => {
      let rawData = '';

      response.on('data', (chunk) => {
        rawData += chunk;
      });

      response.on('end', () => {
        try {
          const result = JSON.parse(rawData);
          if (result.error) {
            reject(new Error(result.error.message));
          } else {
            resolve(result);
          }
        } catch (err) {
          reject(err);
        }
      });
    });

    return data;
  } catch (error) {
    throw error;
  }
}

(async () => {
  try {
    console.log('Fetching posts from page...');
    const pageData = await fetchPagePosts(pageId, accessToken);
    console.log('Page ID:', pageData.id);
    console.log('Page Name:', pageData.name);
    console.log('Posts:');
    const posts = pageData.posts.data.map((post) => {
      console.log('Post ID:', post.id);
      console.log('Created Time:', post.created_time);
      console.log('Message:', post.message);
      console.log('-------');
      return post;
    });

    await writeFile('data.json', JSON.stringify({ posts }, null, 2));
    console.log('Feeds saved to data.json');
  } catch (error) {
    console.error('Error:', error.message || error);
  }
})();