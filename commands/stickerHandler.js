const url = require("node:url");
const regex = require(`../functions/regex`);
const { validateAndConvertMedia } = require(`./urlHandler`);

const allowedRedditHosts = [`www.reddit.com`, `reddit.com`];

/*
    Test case for Reddit, Imgur and general URL checks with regex:
        - Youtube: https://www.reddit.com/r/neverchangejapan/comments/12spx82/ningen_isu_ringo_no_namida_a_metal_song_about_an/
        - Imagen: https://www.reddit.com/r/unixporn/comments/12ruaq1/xperia_10_iii_w_sailfish_w_arch_my_mobile_office/
        - Video: https://www.reddit.com/r/blackmagicfuckery/comments/12sex2d/pool_black_magic/
*/
async function handleStickerURL(
    stringifyMessage,
    message,
    robotEmoji,
    reddit,
    chat,
    MessageMedia,
    senderName,
    senderNumber
) {
    if (stringifyMessage.length !== 2) {
        message.reply(`${robotEmoji} URL, solo la URL.`);
        message.react(`⚠️`);
    } else {
        let stickerURL = stringifyMessage[1];

        if (
            !(
                regex.websiteAllowedRegex.test(stickerURL) ||
                regex.urlRegex.test(stickerURL) ||
                regex.imageOrVideoRegex.test(stickerURL)
            )
        ) {
            message.reply(
                `${robotEmoji} URL inválida, por favor verifica y vuelve a enviarlo. Solo se aceptan imágenes y videos.`
            );
            return;
        }

        stickerURL = stickerURL.replace(/\.gifv$/i, `.mp4`); // Fix for Imgur links

        try {
            const stickerURL_test = new url(stickerURL);
            const isRedditUrl = allowedRedditHosts.includes(
                stickerURL_test.host
            );

            if (isRedditUrl) {
                const { mediaURL: redditMediaURL, media } =
                    await reddit.handleRedditMedia(
                        stickerURL,
                        message,
                        robotEmoji
                    );
                if (!redditMediaURL) {
                    return;
                }

                if (media.is_video) {
                    const localFilePath = await reddit.saveRedditVideo(media);
                    await validateAndConvertMedia(
                        chat,
                        redditMediaURL,
                        message,
                        MessageMedia,
                        senderName,
                        senderNumber,
                        robotEmoji,
                        localFilePath
                    );
                } else {
                    await validateAndConvertMedia(
                        chat,
                        redditMediaURL,
                        message,
                        MessageMedia,
                        senderName,
                        senderNumber,
                        robotEmoji
                    );
                }
            } else {
                await validateAndConvertMedia(
                    chat,
                    stickerURL,
                    message,
                    MessageMedia,
                    senderName,
                    senderNumber,
                    robotEmoji
                );
            }
        } catch (error) {
            console.error(`Error parsing URL:`, error);
            message.reply(
                `${robotEmoji} URL inválida, por favor verifica y vuelve a enviarlo.`
            );
        }
    }
}

module.exports = {
    handleStickerURL,
};
