let prefix = '!';
let prefix_admin = '@';
let robotEmoji = '🤖';
let paidUsers = [];
let physicsUsers = [];
let premiumGroups = [];

// User and admin commands
const commands  = {
  help: 'help',
  sticker: 'sticker',
  toimage: 'toimage',
  url: 'url',
  spot: 'spot',
  letra: 'letra',
  say: 'say',
  cae: 'cae',
  fromis: 'fromis',
  w: 'w',
  yt: 'yt',
  play: 'play',
  doi: 'doi',
  tex: 'tex',
  paper: 'paper',
  author: 'author',
  doc: 'doc',
  drive: 'drive',
  chat: 'chat',
  edit: 'edit',
	t: 't',
}

const adminCommands = {
  help: 'help',
  todos: 'todos',
  ban: 'ban',
  bot: 'bot',
  del: 'del',
  join: 'join',
  addgroup: 'addgroup',
  addpremium: 'addpremium',
  refresh: 'refresh',
  promote: 'promote',
  demote: 'demote',
  chat: 'chat',
  imagine: 'imagine',
};

module.exports = {
  prefix,
  prefix_admin,
  robotEmoji,
  paidUsers,
  physicsUsers,
  premiumGroups,
  commands,
  adminCommands,
};