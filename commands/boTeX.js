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

async function transformLatexToImage(message, client, MessageMedia, query) {
  const latexCode = query;

  try {
    const latexDocument = latexTemplate.replace('%s', latexCode);
    fs.writeFileSync(path.join(__dirname, '..', 'img', 'input.tex'), latexDocument);

    await executeCommand(`pdflatex -output-directory=${path.join(__dirname, '..', 'img', 'output')} -jobname=latex ${path.join(__dirname, '..', 'img', 'input.tex')}`);

    if (!fs.existsSync(path.join(__dirname, '..', 'img', 'output'))) {
      fs.mkdirSync(path.join(__dirname, '..', 'img', 'output'));
    }

    await executeCommand(
      `convert -density 300 -trim -background white -alpha remove ${path.join(__dirname, '..', 'img', 'output', 'latex.pdf')} -quality 100 ${path.join(__dirname, '..', 'img', 'output', 'latex.png')}`
    );

    const img = fs.readFileSync(path.join(__dirname, '..', 'img', 'output', 'latex.png'));
    const media = new MessageMedia('image/png', img.toString('base64'));
    await client.sendMessage(message.from, media, {
      caption: 'Here is your LaTeX equation as an image:',
    });
  } catch (error) {
    console.error('Error:', error);
    message.reply('An error occurred while generating the image.');
  }
}

function executeCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('Error:', error);
        console.error('Output:', stdout);
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
