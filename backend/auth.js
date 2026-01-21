const crypto = require('crypto');
const db = require('./database');

class Auth {
    constructor() {
        this.sessionDuration = 24 * 60 * 60 * 1000; // 24 hours
    }

    generateSessionId() {
        return crypto.randomBytes(32).toString('hex');
    }

    async login(username, password) {
        const isValid = await db.verifyAdmin(username, password);
        if (!isValid) return null;

        const sessionId = this.generateSessionId();
        const expiresAt = new Date(Date.now() + this.sessionDuration);
        
        await db.createSession(sessionId, 1, expiresAt.toISOString());
        
        return {
            sessionId,
            expiresAt
        };
    }

    async validateSession(sessionId) {
        if (!sessionId) return false;
        
        const session = await db.getSession(sessionId);
        return !!session;
    }

    async logout(sessionId) {
        await db.deleteSession(sessionId);
    }

    requireAuth(req, res, next) {
        const sessionId = req.cookies?.sessionId || req.headers['x-session-id'];
        
        this.validateSession(sessionId).then(isValid => {
            if (isValid) {
                next();
            } else {
                res.status(401).json({ error: 'Authentication required' });
            }
        }).catch(err => {
            res.status(500).json({ error: 'Server error' });
        });
    }
}

module.exports = new Auth();