const UrlHandler = require("./urlHandler");
const MediaConverter = require("./mediaConverter");
const path = require("path");
const fs = require("fs").promises;
const { v4: uuidv4 } = require("uuid");

const env = process.env.NODE_ENV || "dev";
const config = require(`../config.${env}.js`);
const { TEMP_DIR, STICKER_AUTHOR, SENDER_NAME_MIN_LENGTH } = config;

class StickerHandler {
    static async handleMediaToSticker(
        chat,
        message,
        senderName,
        senderNumber,
        robotEmoji,
        stringifyMessage,
        MessageMedia,
        url = null
    ) {
        try {
            let mediaSticker;

            if (url) {
                mediaSticker = await this.handleExternalUrl(url, MessageMedia);
            } else if (message.hasQuotedMsg) {
                const quotedMessage = await message.getQuotedMessage();
                if (!quotedMessage.hasMedia) {
                    await message.reply(
                        `${robotEmoji} The quoted message doesn't contain any media.`
                    );
                    return;
                }
                mediaSticker = await quotedMessage.downloadMedia();
            } else if (message.hasMedia) {
                mediaSticker = await message.downloadMedia();
            } else {
                await message.reply(
                    `${robotEmoji} You forgot to attach an image or provide a URL.`
                );
                return;
            }

            await this.convertToSticker(
                chat,
                message,
                mediaSticker,
                senderName,
                senderNumber,
                robotEmoji
            );
        } catch (error) {
            console.error("Error in handleMediaToSticker:", error);
            await message.reply(
                `${robotEmoji} An error occurred while processing your request.`
            );
        }
    }

    static async handleExternalUrl(url, MessageMedia) {
        console.log("the url is", url);
        const tempDir = path.join(TEMP_DIR, uuidv4());
        await fs.mkdir(tempDir, { recursive: true });

        try {
            const directUrl = await UrlHandler.getDirectMediaUrl(url);
            console.log("the direct url is", directUrl);
            const mediaBuffer = await UrlHandler.downloadMedia(directUrl);
            console.log("the media buffer size is", mediaBuffer.length);
            const inputPath = path.join(
                tempDir,
                "input" + path.extname(directUrl)
            );
            await fs.writeFile(inputPath, mediaBuffer);
            console.log("the input file is saved at", inputPath);

            return MessageMedia.fromFilePath(inputPath);
        } catch (error) {
            console.error("Error in handleExternalUrl:", error);
            throw error;
        } finally {
            await fs.rm(tempDir, { recursive: true, force: true });
        }
    }

    static async convertToSticker(
        chat,
        message,
        mediaSticker,
        senderName,
        senderNumber,
        robotEmoji
    ) {
        try {
            senderName = this.validateSenderName(senderName, senderNumber);
            await chat.sendMessage(mediaSticker, {
                sendMediaAsSticker: true,
                stickerName: senderName,
                stickerAuthor: STICKER_AUTHOR,
            });
            await message.reply(`${robotEmoji} Sticker on the way!`);
        } catch (error) {
            console.error("Error converting to sticker:", error);
            await message.reply(
                `${robotEmoji} There was an error trying to convert this media to a sticker.`
            );
        }
    }

    static async handleStickerToMedia(
        chat,
        message,
        senderName,
        robotEmoji,
        stringifyMessage,
        MessageMedia
    ) {
        try {
            if (stringifyMessage.length !== 1) {
                await message.reply(
                    `${robotEmoji} Just reply to a sticker with the command, no need for additional text.`
                );
                return;
            }

            const quotedMsg = await message.getQuotedMessage();
            if (!quotedMsg || quotedMsg.type !== "sticker") {
                await message.reply(
                    `${robotEmoji} Please reply to a sticker message.`
                );
                return;
            }

            const stickerMedia = await quotedMsg.downloadMedia();
            const tempDir = path.join(TEMP_DIR, uuidv4());
            await fs.mkdir(tempDir, { recursive: true });

            try {
                const inputPath = path.join(tempDir, "input.webp");
                await fs.writeFile(inputPath, stickerMedia.data, "base64");

                const isAnimated =
                    await MediaConverter.isAnimatedWebp(inputPath);
                let outputPath, caption;

                if (isAnimated) {
                    outputPath = path.join(tempDir, "output.mp4");
                    await MediaConverter.animatedWebpToVideo(
                        inputPath,
                        outputPath
                    );
                    caption = `${robotEmoji} Animated sticker converted to video. Requested by ${senderName}.`;
                } else {
                    outputPath = path.join(tempDir, "output.png");
                    await MediaConverter.webpToImage(inputPath, outputPath);
                    caption = `${robotEmoji} Sticker converted to image. Requested by ${senderName}.`;
                }

                const media = MessageMedia.fromFilePath(outputPath);
                await chat.sendMessage(media, { caption });
            } finally {
                await fs.rm(tempDir, { recursive: true, force: true });
            }
        } catch (error) {
            console.error("Error in handleStickerToMedia:", error);
            await message.reply(
                `${robotEmoji} An error occurred while processing the sticker.`
            );
        }
    }

    static validateSenderName(senderName, senderNumber) {
        senderName = senderName.trim();
        if (
            senderName.length < SENDER_NAME_MIN_LENGTH ||
            !/\S/.test(senderName)
        ) {
            const match = senderNumber.match(/(^|[^])\d+/);
            return `+${match ? match[0] : ""}, you need a name to use stickers`;
        }
        return senderName;
    }
}

module.exports = StickerHandler;
