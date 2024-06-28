const mediaConverter = require(`./mediaConverter`);

async function validateAndConvertMedia(
    chat,
    mediaURL,
    message,
    MessageMedia,
    senderName,
    senderNumber,
    robotEmoji,
    localFilePath = null
) {
    try {
        if (mediaURL.endsWith(`.gifv`)) {
            mediaURL = mediaURL.replace(/\.gifv$/i, `.mp4`);
        }

        const response = await fetch(mediaURL);
        const [contentType, contentLength] = (
            response.headers.get(`content-type`) || ``
        ).split(`;`);

        if (
            response.ok &&
            contentType &&
            (contentType.startsWith(`image/`) ||
                contentType.startsWith(`video/`))
        ) {
            if (
                contentType.startsWith(`video/mp4`) &&
                contentLength &&
                parseInt(contentLength.split(`=`)[1]) > 20 * 1000
            ) {
                message.reply(
                    `${robotEmoji} Necesitas ser un usuario de pago para enviar videos de más de 20 segundos.`
                );
            } else {
                let sticker;
                if (localFilePath) {
                    sticker = await MessageMedia.fromFilePath(localFilePath);
                } else {
                    sticker = await MessageMedia.fromUrl(mediaURL);
                }
                mediaConverter.convertImageToSticker(
                    chat,
                    message,
                    sticker,
                    senderName,
                    senderNumber
                );
            }
        } else {
            message.reply(
                `${robotEmoji} Esa URL no es hacia el corazón de ella, ni siquiera es una imagen o video. Intenta de nuevo.`
            );
        }
    } catch (error) {
        console.error(error);
        message.reply(
            `${robotEmoji} Parece que algo salió mal, intenta de nuevo.`
        );
    }
}

module.exports = {
    validateAndConvertMedia,
};
