// Categories of descriptive words
const conditions = [
    'under-exposed',
    'over-exposed',
    'perfectly lit',
    'softly lit',
    'backlit',
    'silhouetted',
];
const mediums = [
    'vintage film',
    'sharp digital',
    'soft focus',
    'grainy film',
    'high-definition',
    'low fidelity',
];
const timesOfDay = [
    'night',
    'day',
    'twilight',
    'dawn',
    'dusk',
    'midday sun',
    'golden hour',
    'blue hour',
];
const atmospheres = [
    'mysterious',
    'tranquil',
    'ominous',
    'serene',
    'melancholic',
    'joyful',
    'tense',
];
const styles = [
    'high contrast',
    'minimalist',
    'noir',
    'surrealist',
    'impressionist',
    'pop art',
    'documentary style',
    'vibrant color',
    'monochrome',
    'sepia tone',
];
const details = [
    'against a dramatic backdrop',
    'in a bustling scene',
    'with a touch of motion blur',
    'capturing a fleeting moment',
    'highlighting intricate detail',
    'casting long shadows',
    'reflecting vibrant colors',
    'immersed in soft hues',
];
const environments = [
    'in a bustling city',
    'in a quiet countryside',
    'under a starry sky',
    'on a sunlit beach',
    'in a cozy home',
    'in a crowded market',
    'at the edge of a forest',
    'by a tranquil river',
];
const shotTypes = [
    'extreme close up',
    'close up',
    'medium shot',
    'full shot',
    'long shot',
    'wide shot',
    'overhead shot',
    'point of view shot',
    'low angle shot',
    'high angle shot',
];

const PROMPT_TEMPLATES = {
    normal:
    '[input], [environment], [shot_type], captured on [medium], [condition], during [times_of_day], evoking a [atmosphere] mood, shot in [style], [detail]',
};

function getRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getPromptTemplateIndex() {
    // Currently, this only returns 'normal'. In a more complete implementation, this would decide which template to use based on the application's needs.
    return 'normal';
}

async function improvePrompt(prompt) {
    let index = getPromptTemplateIndex();
    let text = PROMPT_TEMPLATES[index]
        .replace('[input]', prompt)
        .replace('[environment]', getRandomElement(environments))
        .replace('[shot_type]', getRandomElement(shotTypes))
        .replace('[medium]', getRandomElement(mediums))
        .replace('[condition]', getRandomElement(conditions))
        .replace('[times_of_day]', getRandomElement(timesOfDay))
        .replace('[atmosphere]', getRandomElement(atmospheres))
        .replace('[style]', getRandomElement(styles))
        .replace('[detail]', getRandomElement(details));

    return text;
}

module.exports = { improvePrompt };
