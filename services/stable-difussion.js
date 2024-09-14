const fetch = require(`node-fetch`);
const fs = require(`fs`).promises;
const path = require(`path`);
require(`dotenv`).config({ path: path.resolve(__dirname, `../../.env`) });

const engineId = `stable-diffusion-512-v2-1`;
const apiHost = `https://api.stability.ai`;
const apiKey = process.env.STABILITY_API_KEY;

if (!apiKey) throw new Error(`Missing Stability API key.`);

// Styles given by Stable Diffusion API
const stylePresets = [
    `enhance`,
    `anime`,
    `photographic`,
    `digital-art`,
    `comic-book`,
    `fantasy-art`,
    `line-art`,
    `analog-film`,
    `neon-punk`,
    `isometric`,
    `low-poly`,
    `origami`,
    `modeling-compound`,
    `cinematic`,
    `3d-model`,
    `pixel-art`,
    `tile-texture`,
];

async function fetchImageAndWriteToFile(prompt) {
    const stylePreset =
        stylePresets[Math.floor(Math.random() * stylePresets.length)];

    const response = await fetch(
        `${apiHost}/v1/generation/${engineId}/text-to-image`,
        {
            method: `POST`,
            headers: {
                "Content-Type": `application/json`,
                "Accept": `application/json`,
                "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                text_prompts: [
                    {
                        text: prompt,
                        weight: 0.5,
                    },
                ],
                cfg_scale: 7, // How much do we stick to the prompt
                clip_guidance_preset: `FAST_BLUE`,
                style_preset: stylePreset,
                height: 512,
                width: 512,
                samples: 1, // Amount of images to generate
                steps: 30,
            }),
        }
    );

    if (!response.ok) {
        throw new Error(`Non-200 response: ${response.statusText}`);
    }

    const responseJSON = await response.json();

    if (!responseJSON.artifacts || !Array.isArray(responseJSON.artifacts)) {
        throw new Error(`Unexpected responseJSON structure`);
    }

    const paths = [];
    await Promise.all(
        responseJSON.artifacts.map(async (artifact, i) => {
            const imageData = artifact.base64;
            const base64Data = imageData.replace(
                /^data:image\/jpeg;base64,/,
                ``
            );
            const filename = path.resolve(
                __dirname,
                `..`,
                `..`,
                `img`,
                `artifact-${i}.jpg`
            );
            await fs.writeFile(filename, base64Data, `base64`);
            paths.push(path.resolve(filename));
        })
    );

    return paths;
}

module.exports = { fetchImageAndWriteToFile };
