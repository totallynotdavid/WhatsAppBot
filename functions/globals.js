const ownerNumber = process.env.ADMIN_NUMBER;

// Load config file based on environment
const env = process.env.NODE_ENV || `dev`;
const config = require(`../config.${env}.js`);

let prefix = config.command_prefix;
let prefix_admin = config.admin_command_prefix;
let robotEmoji = config.robotEmoji;
let paidUsers = [];
let physicsUsers = [];
let premiumGroups = [];

// User and admin commands
const commands = {
    help: `help`,
    sticker: `sticker`,
    toimage: `toimage`,
    url: `url`,
    spot: `spot`,
    letra: `letra`,
    say: `say`,
    cae: `cae`,
    fromis: `fromis`,
    w: `w`,
    yt: `yt`,
    play: `play`,
    watch: `watch`,
    test: `test`,
    doi: `doi`,
    tex: `tex`,
    paper: `paper`,
    author: `author`,
    doc: `doc`,
    drive: `drive`,
    chat: `chat`,
    edit: `edit`,
    t: `t`,
};

const adminCommands = {
    help: `help`,
    todos: `todos`,
    ban: `ban`,
    bot: `bot`,
    del: `del`,
    join: `join`,
    addgroup: `addgroup`,
    add: `add`,
    addpremium: `addpremium`,
    refresh: `refresh`,
    promote: `promote`,
    demote: `demote`,
    close: `close`,
    open: `open`,
    chat: `chat`,
    resumen: `resumen`,
    imagine: `imagine`,
    subscription: `subscription`,
    global: `global`,
};

module.exports = {
    prefix,
    prefix_admin,
    ownerNumber,
    robotEmoji,
    paidUsers,
    physicsUsers,
    premiumGroups,
    commands,
    adminCommands,
};
