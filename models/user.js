const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    User: String,
    Reminder: { type: String, defualt: null }
})

module.exports = mongoose.model("userInfo", userSchema);