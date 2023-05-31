const fetch = require('node-fetch');

async function getWikiArticle(message, query, languageCode, senderName, client, MessageMedia) {
  try {
    const wikipediaApiUrl = `https://${languageCode}.wikipedia.org/api/rest_v1/page/summary/${query}`;
    const apiResponse = await fetch(wikipediaApiUrl);
    const apiData = await apiResponse.json();

    const handleDisambiguation = () => {
      const disambiguationLink = apiData.content_urls.desktop.page;
      message.reply(`🤖 ${senderName}, tu búsqueda dió resultados ambiguos, puedes verlos aquí: ${disambiguationLink}`);
    }

    const handleNotFound = async () => {
      const searchApiUrl = `https://${languageCode}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${query}&format=json`;
      const searchResponse = await fetch(searchApiUrl);
      const searchData = await searchResponse.json();
      if (searchData.query.searchinfo.totalhits === 0) {
        message.reply(`🤖 ${senderName}, tu búsqueda no dió resultados.`);
      } else {
        const similarArticles = searchData.query.search;
        const firstSimilarArticleTitle = similarArticles[0].title.replace(/ /g, '_');
        message.reply(`🤖 ${senderName}, tu búsqueda no dió resultados, puedes ver artículos similares aquí: https://${languageCode.toLowerCase()}.wikipedia.org/wiki/${firstSimilarArticleTitle}`);
      }
    }

    const handleSuccess = async () => {
      const summary = `🤖 *${apiData.title}*: ${apiData.extract}`;
      if (apiData.originalimage) {
        const imageMedia = await MessageMedia.fromUrl(apiData.originalimage.source);
        client.sendMessage(message.id.remote, imageMedia, { caption: summary })
      } else {	
      message.reply(summary);
      }
    }

    switch (apiData.type) 
    {
      case 'disambiguation':
        handleDisambiguation();
        break;
      case 'https://mediawiki.org/wiki/HyperSwitch/errors/not_found':
        handleNotFound();
        break;
      default:
        handleSuccess();
    }
  } catch (err) {
    console.error(err);
  }
}

module.exports = {
	getWikiArticle,
};