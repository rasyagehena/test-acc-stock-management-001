const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

class Database {
    constructor() {
        this.dbPath = path.join(__dirname, '../database/accounts.db');
        this.db = new sqlite3.Database(this.dbPath);
        this.initDatabase();
    }

    async initDatabase() {
        // Create accounts table
        await this.run(`
            CREATE TABLE IF NOT EXISTS accounts (
                id INTEGER PRIMARY KEY,
                email TEXT NOT NULL UNIQUE,
                google_password_hash TEXT NOT NULL,
                moonton_password_hash TEXT NOT NULL,
                secondary_password_hash TEXT NOT NULL,
                images TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create admin users table
        await this.run(`
            CREATE TABLE IF NOT EXISTS admin_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create sessions table
        await this.run(`
            CREATE TABLE IF NOT EXISTS sessions (
                session_id TEXT PRIMARY KEY,
                admin_id INTEGER,
                expires_at TIMESTAMP,
                FOREIGN KEY (admin_id) REFERENCES admin_users(id)
            )
        `);

        // Create default admin if not exists
        const adminExists = await this.get(
            "SELECT id FROM admin_users WHERE username = ?",
            [process.env.ADMIN_USERNAME || 'admin']
        );

        if (!adminExists) {
            const defaultPassword = 'ChangeThisPassword123!';
            const passwordHash = await bcrypt.hash(defaultPassword, 10);
            
            await this.run(
                "INSERT INTO admin_users (username, password_hash) VALUES (?, ?)",
                [process.env.ADMIN_USERNAME || 'admin', passwordHash]
            );
            console.log('Default admin user created. Change password immediately!');
        }
    }

    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve(this);
            });
        });
    }

    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    async checkIdExists(id) {
        const result = await this.get(
            "SELECT id FROM accounts WHERE id = ?",
            [id]
        );
        return !!result;
    }

    async addAccount(accountData) {
        const { id, email, google_password, moonton_password, secondary_password, images } = accountData;
        
        // Hash passwords
        const googlePasswordHash = await bcrypt.hash(google_password, 10);
        const moontonPasswordHash = await bcrypt.hash(moonton_password, 10);
        const secondaryPasswordHash = await bcrypt.hash(secondary_password, 10);

        await this.run(
            `INSERT INTO accounts (id, email, google_password_hash, moonton_password_hash, secondary_password_hash, images) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [id, email, googlePasswordHash, moontonPasswordHash, secondaryPasswordHash, JSON.stringify(images)]
        );
    }

    async getAllAccounts() {
        const accounts = await this.all(
            "SELECT id, email, images, created_at FROM accounts ORDER BY id"
        );
        
        // Parse images JSON
        return accounts.map(account => ({
            ...account,
            images: JSON.parse(account.images || '[]')
        }));
    }

    async deleteAccount(id) {
        await this.run("DELETE FROM accounts WHERE id = ?", [id]);
    }

    async verifyAdmin(username, password) {
        const admin = await this.get(
            "SELECT * FROM admin_users WHERE username = ?",
            [username]
        );
        
        if (!admin) return false;
        
        return await bcrypt.compare(password, admin.password_hash);
    }

    async createSession(sessionId, adminId, expiresAt) {
        await this.run(
            "INSERT INTO sessions (session_id, admin_id, expires_at) VALUES (?, ?, ?)",
            [sessionId, adminId, expiresAt]
        );
    }

    async getSession(sessionId) {
        return await this.get(
            "SELECT * FROM sessions WHERE session_id = ? AND expires_at > datetime('now')",
            [sessionId]
        );
    }

    async deleteSession(sessionId) {
        await this.run("DELETE FROM sessions WHERE session_id = ?", [sessionId]);
    }

    async cleanupExpiredSessions() {
        await this.run("DELETE FROM sessions WHERE expires_at <= datetime('now')");
    }
}

module.exports = new Database();