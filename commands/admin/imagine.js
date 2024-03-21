const { saveImageFilesLocally } = require(`../../lib/api/bing`);
const { fetchImageAndWriteToFile } = require(`../../lib/api/stableDiffusion`);
const { improvePrompt } = require(`../../functions/promptImprover`);

// 9 out of 10 calls are made to Bing Image API
let callCounter = 0;

async function handleImagineBing(prompt) {
    const pathsFromImagesBing = await saveImageFilesLocally(prompt);
    return pathsFromImagesBing;
}

async function handleImagineStability(prompt) {
    const pathsFromImagesSA = await fetchImageAndWriteToFile(prompt);
    return pathsFromImagesSA;
}

async function handleImagine(prompt) {
    const improvedPrompt = await improvePrompt(prompt);
    callCounter++;

    try {
        if (callCounter % 5 != 0) {
            // We will use Bing for 4 out of 5 calls
            return await handleImagineBing(improvedPrompt);
        } else {
            return await handleImagineStability(improvedPrompt);
        }
    } catch (err) {
        console.error(`Error while fetching image: ${err}`);
        // If we got an error from Bing, we'll try Stability
        if (callCounter % 5 != 0) {
            try {
                return await handleImagineStability(improvedPrompt);
            } catch (err) {
                console.error(`Error while using Imagine Stability: ${err}`);
                throw err;
            }
        } else {
            throw err;
        }
    }
}

module.exports = { handleImagine };
