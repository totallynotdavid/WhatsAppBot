const fs = require('fs');

function logFunctionCall(message, fn) {
  const currentDate = new Date(); // Don't define this outside the function, it will be the same date for all the calls

  return function(...args) {
    message.react('✅');
    const logMessage = `[${currentDate.toLocaleString()}] ${fn.name}() called by ${message.from}: ${message.body}`;
    fs.appendFileSync('logs.txt', logMessage + '\n');
    return fn(...args);
  }
}

module.exports = logFunctionCall;