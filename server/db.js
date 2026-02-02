const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Could not connect to database', err);
    } else {
        console.log('Connected to SQLite database');
    }
});

const query = (text, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(text, params, (err, rows) => {
            if (err) {
                console.error("Query Error:", err.message, text);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

const run = (text, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(text, params, function (err) {
            if (err) {
                console.error("Run Error:", err.message, text);
                reject(err);
            } else {
                // Return context similar to pg-result if needed, or consistent object
                resolve({ changes: this.changes, lastID: this.lastID, rows: [] });
            }
        });
    });
};

const get = (text, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(text, params, (err, row) => {
            if (err) {
                console.error("Get Error:", err.message, text);
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
};

// Compatibility wrapper for "pool" if referenced elsewhere (unlikely, but safe to mock)
const pool = {
    end: () => db.close()
};

module.exports = {
    query,
    run,
    get,
    pool
};
