const fetch = require("node-fetch");
const MediaDownloader = require("@totallynodavid/downloader");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs").promises;
const path = require("path");

const API_BASE = "https://www.reddit.com/r";

async function getRandomPost(subreddit, timeframe = "week") {
    try {
        const response = await fetch(
            `${API_BASE}/${subreddit}/top.json?t=${timeframe}&limit=100`
        );
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const posts = data.data.children.filter(post => !post.data.over_18);

        if (posts.length === 0) {
            throw new Error(
                `No se encontraron publicaciones en r/${subreddit}`
            );
        }

        const randomPost = posts[Math.floor(Math.random() * posts.length)].data;
        return {
            title: randomPost.title,
            author: randomPost.author,
            subreddit: randomPost.subreddit,
            score: randomPost.score,
            num_comments: randomPost.num_comments,
            permalink: `https://reddit.com${randomPost.permalink}`,
            url: randomPost.url,
            timeframe: timeframe,
            selftext: randomPost.selftext,
        };
    } catch (error) {
        console.error("Error fetching from Reddit:", error);
        throw error;
    }
}

async function getPostMetadata(url) {
    try {
        const apiUrl = `${url.replace(/\/$/, "")}.json`;
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const post = data[0].data.children[0].data;

        return {
            title: post.title,
            author: post.author,
            subreddit: post.subreddit,
            score: post.score,
            num_comments: post.num_comments,
            permalink: `https://reddit.com${post.permalink}`,
            url: post.url,
            selftext: post.selftext,
        };
    } catch (error) {
        console.error("Error fetching post metadata:", error);
        throw error;
    }
}

async function getMedia(url) {
    try {
        const media = await MediaDownloader(url);

        if (media.urls.length > 0) {
            const processedUrls = await Promise.all(
                media.urls.map(processMediaUrl)
            );
            return {
                urls: processedUrls.filter(url => url !== null),
                count: processedUrls.filter(url => url !== null).length,
            };
        }

        return media;
    } catch (error) {
        console.error("Error downloading or processing media:", error);
        throw error;
    }
}

async function processMediaUrl(url) {
    if (url.endsWith(".gif")) {
        return await convertGifToMp4(url);
    }
    return url;
}

async function convertGifToMp4(gifUrl) {
    const tempDir = path.join(__dirname, "../media");
    await fs.mkdir(tempDir, { recursive: true });

    const gifPath = path.join(tempDir, `${Date.now()}_temp.gif`);
    const mp4Path = path.join(tempDir, `${Date.now()}_temp.mp4`);

    try {
        const response = await fetch(gifUrl);
        const buffer = await response.buffer();
        await fs.writeFile(gifPath, buffer);

        await new Promise((resolve, reject) => {
            ffmpeg(gifPath)
                .outputOptions("-movflags faststart")
                .outputOptions("-pix_fmt yuv420p")
                .outputOptions("-vf scale=trunc(iw/2)*2:trunc(ih/2)*2")
                .toFormat("mp4")
                .on("end", () => resolve())
                .on("error", err => reject(err))
                .save(mp4Path);
        });

        const mp4Buffer = await fs.readFile(mp4Path);
        const base64Mp4 = mp4Buffer.toString("base64");

        await fs.unlink(gifPath);
        await fs.unlink(mp4Path);

        return `data:video/mp4;base64,${base64Mp4}`;
    } catch (error) {
        console.error("Error converting GIF to MP4:", error);
        return null;
    }
}

function generateCaption(post) {
    const {
        title,
        author,
        subreddit,
        score,
        num_comments,
        permalink,
        timeframe,
        selftext,
    } = post;
    const displayTitle = title ? title.trim() : "Publicación sin título";
    let caption = `*${displayTitle}*\n\nPublicado por u/${author} en r/${subreddit}\n👍 ${score} | 💬 ${num_comments}\n`;

    if (timeframe) {
        caption += `Periodo: ${timeframe}\n`;
    }

    if (selftext) {
        const truncatedText =
            selftext.length > 100
                ? selftext.substring(0, 97) + "..."
                : selftext;
        caption += `\n${truncatedText}\n`;
    }

    caption += `\n${permalink}`;
    return caption;
}

module.exports = { getRandomPost, getPostMetadata, getMedia, generateCaption };
