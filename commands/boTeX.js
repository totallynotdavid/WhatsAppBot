const fs = require(`fs`).promises;
const path = require(`path`);
const { execFile } = require(`child_process`);
const util = require(`util`);
const execFilePromise = util.promisify(execFile);
const os = require(`os`);

const latexTemplate = `
\\documentclass[preview,border=2pt,convert={density=300,outext=.png}]{standalone}
\\usepackage{amsmath}
\\usepackage{amsfonts}
\\usepackage{physics}
\\usepackage{bm}
\\begin{document}
\\begin{align*}
%s
\\end{align*}
\\end{document}
`;

async function cleanUp() {
    const folderPath = path.join(__dirname, `..`, `img`);

    try {
        const files = await fs.readdir(folderPath);

        await Promise.all(
            files.map(file => fs.unlink(path.join(folderPath, file)))
        );
    } catch (error) {
        console.error(`Error cleaning up /img/ folder:`, error);
    }
}

async function transformLatexToImage(
    message,
    client,
    MessageMedia,
    query,
    robotEmoji
) {
    const latexCode = query;

    try {
        const latexDocument = latexTemplate.replace(`%s`, latexCode);
        const writePath = path.join(__dirname, `..`, `img`, `input.tex`);
        await fs.writeFile(writePath, latexDocument);

        await execFilePromise(`pdflatex`, [
            `-output-directory=` + path.join(__dirname, `..`, `img`),
            `-jobname=latex`,
            writePath,
        ]);

        const pdfPath = path.join(__dirname, `..`, `img`, `latex.pdf`);

        await fs.access(pdfPath);

        const pngPath = path.join(__dirname, `..`, `img`, `latex.png`);
        const convertCommand = os.platform() === `win32` ? `magick` : `convert`;
        const args = [
            `-density`,
            `300`,
            `-trim`,
            `-background`,
            `white`,
            `-gravity`,
            `center`,
            `-extent`,
            `120%x180%`,
            `-alpha`,
            `remove`,
            pdfPath,
            `-quality`,
            `100`,
            `-define`,
            `png:color-type=2`,
            pngPath,
        ];

        if (os.platform() === `win32`) {
            await execFilePromise(`magick`, [`convert`, ...args]);
        } else {
            await execFilePromise(convertCommand, args);
        }

        // We have to make sure the PNG file exists
        await fs.access(pngPath);

        const media = MessageMedia.fromFilePath(pngPath);
        await client.sendMessage(message.id.remote, media, {
            caption: `${robotEmoji} Generado por boTeX`,
        });

        await cleanUp();
    } catch (error) {
        console.error(`Error:`, error);
        message.reply(
            `${robotEmoji} Houston, tenemos un problema. No se pudo transformar el código LaTeX a imagen.`
        );
    }
}

function handleLatexToImage(
    stringifyMessage,
    message,
    client,
    MessageMedia,
    robotEmoji
) {
    if (stringifyMessage.length > 1) {
        const query = stringifyMessage.slice(1).join(` `);
        const beginRegex = /\\begin\{[a-z]*\}/g;
        if (beginRegex.test(query)) {
            message.reply(
                `${robotEmoji} No es necesario usar \\begin{document} ni \\end{document} o similares.`
            );
        }
        transformLatexToImage(message, client, MessageMedia, query, robotEmoji);
    }
}

module.exports = {
    handleLatexToImage,
};
