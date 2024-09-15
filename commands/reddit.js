const {
    getRandomPost,
    getPostMetadata,
    getMedia,
    generateCaption,
} = require("../services/reddit");

async function handleRedditCommand(args) {
    try {
        let post;
        if (args[1].startsWith("http")) {
            post = await getPostMetadata(args[1]);
        } else {
            const subreddit = args[1];
            const timeframe = args[2] || "week";
            const validTimeframes = ["day", "week", "month", "year", "all"];

            if (!validTimeframes.includes(timeframe)) {
                throw new Error(
                    "Período de tiempo inválido. Usa day, week, month, year o all."
                );
            }

            post = await getRandomPost(subreddit, timeframe);
        }

        const media = await getMedia(post.permalink);
        const caption = generateCaption(post);

        return {
            caption,
            media,
        };
    } catch (error) {
        console.error("Error in Reddit command:", error);
        throw error;
    }
}

module.exports = { handleRedditCommand };
