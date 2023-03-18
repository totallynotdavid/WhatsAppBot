const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

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
  try {
    const folderPath = path.join(__dirname, '..', 'img');
    const files = fs.readdirSync(folderPath);

    for (const file of files) {
      fs.unlinkSync(path.join(folderPath, file));
    }

  } catch (error) {
    console.error('Error cleaning up /img/ folder:', error);
  }
}

async function transformLatexToImage(message, client, MessageMedia, query, robotEmoji) {
  const latexCode = query;

  try {
    const latexDocument = latexTemplate.replace('%s', latexCode);
    fs.writeFileSync(path.join(__dirname, '..', 'img', 'input.tex'), latexDocument);

    await executeCommand(`pdflatex -output-directory=${path.join(__dirname, '..', 'img')} -jobname=latex ${path.join(__dirname, '..', 'img', 'input.tex')}`);

    await executeCommand(
			`convert -density 300 -trim -background white -gravity center -extent 120%x180% -alpha remove ${path.join(__dirname, '../img/latex.pdf')} -quality 100 -define png:color-type=2 ${path.join(__dirname, '../img/latex.png')}`
		);

    const media = MessageMedia.fromFilePath(path.join(__dirname, '..', 'img', 'latex.png'));
    await client.sendMessage(message.id.remote, media, {
      caption: `${robotEmoji} Generado por boTeX`,
    });

		// Call the cleanUp function after sending the image
    await cleanUp();
  } catch (error) {
    console.error('Error:', error);
    message.reply(`${robotEmoji} Houston, tenemos un problema. No se pudo transformar el código LaTeX a imagen.`);
  }
}

function executeCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('Error executing command:', command);
        console.error('Error:', error);
        console.error('Output:', stdout);
        console.error('Error output:', stderr);
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}

module.exports = {
  transformLatexToImage,
};
