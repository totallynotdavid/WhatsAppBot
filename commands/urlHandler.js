const fetch = require("node-fetch");
const { URL } = require("url");

const env = process.env.NODE_ENV || "dev";
const config = require(`../config.${env}.js`);
const { ALLOWED_REDDIT_HOSTS } = config;

class UrlHandler {
    static async getDirectMediaUrl(url) {
        if (this.isImgurUrl(url)) {
            return this.getImgurDirectUrl(url);
        } else if (this.isRedditUrl(url)) {
            return this.getRedditDirectUrl(url);
        }
        return url; // Return as-is if not a special case
    }

    static isImgurUrl(url) {
        return url.includes("imgur.com");
    }

    static isRedditUrl(url) {
        const { hostname } = new URL(url);
        return ALLOWED_REDDIT_HOSTS.includes(hostname);
    }

    static async getImgurDirectUrl(url) {
        // Implement Imgur-specific logic
        return url; //.replace(/\.(gifv|mp4)$/, ".gif");
    }

    static async getRedditDirectUrl(url) {
        // Implement Reddit-specific logic
        // This is a placeholder and should be replaced with actual Reddit API calls
        return url;
    }

    static async downloadMedia(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch URL: ${response.statusText}`);
        }
        return await response.buffer();
    }
}

module.exports = UrlHandler;
