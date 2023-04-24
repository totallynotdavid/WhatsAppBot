const { Page } = require('facebook-nodejs-business-sdk');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const access_token = process.env.facebook_access_token;
const id = '104949204450480';

const api = require('facebook-nodejs-business-sdk').FacebookAdsApi.init(access_token);
const showDebuggingInfo = true;

if (showDebuggingInfo) {
  api.setDebug(false);
}

const logApiCallResult = (apiCallName/*, data*/) => {
  console.log(apiCallName);
  if (showDebuggingInfo) {
		console.log('Debugging info:', showDebuggingInfo);
  }
};

const getFeeds = async (pageId) => {
  try {
    const fields = [];
    const params = {};

    const page = new Page(pageId);
    const feeds = await page.getFeed(fields, params);

    logApiCallResult('We are calling for the feed', feeds);

    fs.writeFileSync('Facebook_Posts.json', JSON.stringify(feeds, null, 2));
    console.log('Feeds saved to data.json');
  } catch (error) {
    console.error('Error fetching feeds:', error);
  }
};

getFeeds(id);