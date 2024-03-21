const { IGUser } = require(`facebook-nodejs-business-sdk`);
const fs = require(`fs`);
const path = require(`path`);
require(`dotenv`).config({ path: path.resolve(__dirname, `../.env`) });

const access_token = process.env.facebook_access_token;
const id = `17841452095786675`;

const api = require(`facebook-nodejs-business-sdk`).FacebookAdsApi.init(
    access_token
);
const showDebuggingInfo = true;

if (showDebuggingInfo) {
    api.setDebug(false);
}

const logApiCallResult = (apiCallName /*, data*/) => {
    console.log(apiCallName);
    if (showDebuggingInfo) {
        console.log(`Debugging info:`, showDebuggingInfo);
        // console.log('Data:', JSON.stringify(data));
    }
};

const getFeeds = async userId => {
    try {
        const fields = [
            `id`,
            `media_url`,
            `permalink`,
            `thumbnail_url`,
            `caption`,
            `timestamp`,
        ];
        const params = { user_id: userId };

        const user = new IGUser(userId);
        const feeds = await user.getMedia(fields, params);

        logApiCallResult(`We are calling for the feed`, feeds);

        fs.writeFileSync(
            `Posts_Instagram.json`,
            JSON.stringify(feeds, null, 2)
        );
        console.log(`Feeds saved to data.json`);
    } catch (error) {
        console.error(`Error fetching feeds:`, error);
    }
};

getFeeds(id);
