function logFunctionCall(message, fn) {
  return function(...args) {
    message.react('✅');
    return fn(...args);
  }
}

module.exports = logFunctionCall;