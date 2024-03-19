const { translate } = require('@vitalets/google-translate-api');

async function translateText(textToBeTranslated, targetLang = 'en') {
    const { text } = await translate(textToBeTranslated, {
        from: 'es',
        to: targetLang,
    });
    return text;
}

module.exports = { translateText };
