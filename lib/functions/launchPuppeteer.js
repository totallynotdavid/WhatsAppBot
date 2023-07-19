const os = require('os');

const puppeteerConfig = () => {
  const platform = os.platform();

  switch (platform) {
    case 'win32':
      // console.log('Windows detected. Running in non-headless mode for easier debugging.');
      return {
        headless: false,
        executablePath: 'C:/Users/david/AppData/Local/Google/Chrome/Application/chrome.exe',
      };
    case 'linux':
      // console.log('Linux detected. Running in headless mode for improved performance in production.');
      return {
        headless: true,
        executablePath: './node_modules/puppeteer/.local-chromium/linux-982053/chrome-linux/chrome',
      };
    default:
      throw new Error(`Unsupported (and untested) platform: ${platform}`);
  }
};

module.exports = puppeteerConfig;