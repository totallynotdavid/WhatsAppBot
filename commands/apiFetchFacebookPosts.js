const { Page } = require(`facebook-nodejs-business-sdk`);
const path = require(`path`);
require(`dotenv`).config({ path: path.resolve(__dirname, `../.env`) });

const access_token = process.env.FACEBOOK_ACCESS_TOKEN;

const api = require(`facebook-nodejs-business-sdk`).FacebookAdsApi.init(
    access_token
);
api.setDebug(false);

const getLatestPost = async pageId => {
    try {
        const fields = [
            `id`,
            `message`,
            `created_time`,
            `attachments{media,url}`,
        ];
        const params = { limit: 1 };
        const page = new Page(pageId);
        const feeds = await page.getFeed(fields, params);
        return feeds[0];
    } catch (error) {
        console.error(`Error fetching feeds:`, error);
        return null;
    }
};

module.exports = { getLatestPost };
