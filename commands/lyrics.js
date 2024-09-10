const { getLyrics } = require(`fetch-lyrics`);
const withProxy = require(`@totallynodavid/proxy-wrapper`);

async function handleSongLyricsRequest(stringifyMessage, message, robotEmoji) {
    if (stringifyMessage.length === 1) {
        message.reply(
            `${robotEmoji} Cómo te atreves a pedirme la letra de una canción sin decirme el nombre.`
        );
    } else {
        const songName = stringifyMessage.slice(1).join(` `);
        try {
            const getLyricsWithProxy = withProxy(getLyrics);
            const songLyrics = await getLyricsWithProxy(songName);
            if (songLyrics && songLyrics.lyrics) {
                const replyMessage = `${robotEmoji} Aquí tienes la letra de la canción:\n\n*Título:* ${songLyrics.title}\n\n*Letra:*\n${songLyrics.lyrics}`;
                message.reply(replyMessage);
            } else {
                message.reply(
                    `${robotEmoji} No encontré la letra de esa canción.`
                );
            }
        } catch (error) {
            console.error(error);
            message.reply(
                `${robotEmoji} Hubo un error al buscar la letra de la canción.`
            );
        }
    }
}

module.exports = {
    handleSongLyricsRequest,
};
