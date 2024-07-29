const path = require("node:path");

module.exports = {
    command_prefix: `/`,
    admin_command_prefix: `#`,
    robotEmoji: `🤖`,
    // openai config
    MAX_USER_MSG_LENGTH: 600,
    MAX_TOKENS: 800,
    MAX_CONVERSATION_LENGTH: 5000,

    // mediaConverter config
    TEMP_DIR: path.join(__dirname, "./media"),
    SENDER_NAME_MIN_LENGTH: 2,
    MAX_VIDEO_LENGTH_SECONDS: 20,
    ALLOWED_REDDIT_HOSTS: [
        "reddit.com",
        "www.reddit.com",
        "i.redd.it",
        "v.redd.it",
    ],
    STICKER_AUTHOR: "davibot",
    VIDEO_SCALE: "512:512",
    FFMPEG_OPTIONS: [
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-vf",
        "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2",
        "-movflags",
        "+faststart",
    ],
};
