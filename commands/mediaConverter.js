const fs = require("node:fs/promises");
const path = require("node:path");
const util = require("node:util");
const { exec } = require("node:child_process");
const { v4: uuidv4 } = require("uuid");
const ffmpeg = require("fluent-ffmpeg");

const execPromise = util.promisify(exec);
const utilities = require(`./utilities`);

async function transformMediaToSticker(
    chat,
    message,
    senderName,
    senderNumber,
    robotEmoji
) {
    if (!message.hasQuotedMsg && !message.hasMedia) {
        message.reply(
            `${robotEmoji} Tarao, te olvidaste de adjuntar la imagen.`
        );
        return;
    }

    try {
        let mediaSticker;
        if (message.hasQuotedMsg) {
            const originalQuotedMessage = await message.getQuotedMessage();

            if (!originalQuotedMessage.hasMedia) {
                message.reply(
                    `${robotEmoji} Este mensaje no contiene ninguna imagen.`
                );
                return;
            }

            mediaSticker = await originalQuotedMessage.downloadMedia();
        } else {
            mediaSticker = await message.downloadMedia();
        }
        await convertImageToSticker(
            chat,
            message,
            mediaSticker,
            senderName,
            senderNumber
        );
    } catch (error) {
        console.log(error);
    }
}

async function convertImageToSticker(
    chat,
    message,
    mediaSticker,
    senderName,
    senderNumber
) {
    try {
        senderName = senderName.trim();
        if (
            !utilities.containsVisibleChars(senderName) ||
            senderName.length < 2
        ) {
            var match = senderNumber.match(/(^|[^])\d+/);
            senderName = `+${match[0]}, necesitas un nombre para usar stickers`;
        }

        console.log("Converting to sticker");
        console.log("the sender name is: ", senderName);
        chat.sendMessage(mediaSticker, {
            sendMediaAsSticker: true,
            stickerName: `${senderName}`,
            stickerAuthor: `davibot`,
        });
        message.reply(`🤖 ¡Sticker en camino!`);
    } catch (e) {
        console.error("Error converting image to sticker:", e);
        message.reply(
            `🤖 Hubo un error al tratar de convertir esta imagen en sticker.`
        );
    }
}

async function convertQuotedStickerToMedia(
    stringifyMessage,
    message,
    MessageMedia,
    chat,
    robotEmoji,
    senderName
) {
    if (
        stringifyMessage.length === 1 &&
        message._data.quotedMsg &&
        message._data.quotedMsg.type === "sticker"
    ) {
        const tempDir = path.join(__dirname, "../media", uuidv4());
        try {
            const originalQuotedMessage = await message.getQuotedMessage();
            const mediaSticker = await originalQuotedMessage.downloadMedia();
            const isAnimated = originalQuotedMessage._data.isAnimated;

            await fs.mkdir(tempDir, { recursive: true });

            if (isAnimated) {
                const webpFilePath = path.join(tempDir, "sticker.webp");
                const framesDir = path.join(tempDir, "frames");
                const mp4FilePath = path.join(tempDir, "output.mp4");

                await fs.mkdir(framesDir, { recursive: true });
                await fs.writeFile(
                    webpFilePath,
                    Buffer.from(mediaSticker.data, "base64")
                );

                await execPromise(
                    `magick convert "${webpFilePath}" "${framesDir}/frame_%05d.png"`
                );

                console.log("Converting to mp4");
                await new Promise((resolve, reject) => {
                    console.log("Converting to mp4 2");
                    ffmpeg()
                        .input(path.join(framesDir, "frame_%05d.png"))
                        .inputFPS(25)
                        .outputOptions("-c:v", "libx264")
                        .outputOptions("-pix_fmt", "yuv420p")
                        .outputOptions(
                            "-vf",
                            "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2"
                        )
                        .outputOptions("-movflags", "+faststart")
                        .output(mp4FilePath)
                        .on("end", resolve)
                        .on("error", reject)
                        .run();
                });

                const mp4Media = await MessageMedia.fromFilePath(mp4FilePath);

                await chat.sendMessage(mp4Media, {
                    caption: `${robotEmoji} Solicitado por ${senderName}.`,
                });
            } else {
                await chat.sendMessage(mediaSticker, {
                    sendMediaAsSticker: false,
                    caption: `${robotEmoji} Solicitado por ${senderName}.`,
                });
            }
        } catch (error) {
            console.error("Error processing sticker:", error);
            await message.reply(
                `${robotEmoji} Ha ocurrido un error al procesar el sticker. Intenta de nuevo.`
            );
        } finally {
            try {
                await fs.rm(tempDir, { recursive: true, force: true });
            } catch (cleanupError) {
                console.error("Error during cleanup:", cleanupError);
            }
        }
    } else {
        await message.reply(
            `${robotEmoji} Contesta a un mensaje con un sticker. Solo usa el comando, no añadas nada más.`
        );
    }
}

module.exports = {
    transformMediaToSticker,
    convertQuotedStickerToMedia,
};
