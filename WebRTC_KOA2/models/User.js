const db = require('../db');

module.exports = db.defineModel('user', {
    name: db.STRING(64),
    passwd: db.STRING(256),
    ip: db.STRING(64),
    port: db.INTEGER,
    state: db.INTEGER,
    last_time: db.DATE
});