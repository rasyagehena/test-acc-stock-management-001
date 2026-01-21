const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const db = require('./database');
const auth = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "blob:"]
        }
    }
}));

app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? 'https://yourdomain.com' : 'http://localhost:3000',
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_DIR || './backend/uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: parseInt(process.env.MAX_IMAGE_SIZE) || 5 * 1024 * 1024, // 5MB
        files: parseInt(process.env.MAX_IMAGES_PER_ACCOUNT) || 40
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Serve static files
app.use('/uploads', express.static(uploadDir));
app.use(express.static(path.join(__dirname, '../frontend')));

// Authentication middleware
const requireAuth = (req, res, next) => {
    const sessionId = req.cookies.sessionId || req.headers['x-session-id'];
    
    auth.validateSession(sessionId).then(isValid => {
        if (isValid) {
            next();
        } else {
            if (req.path.startsWith('/api')) {
                res.status(401).json({ error: 'Authentication required' });
            } else {
                res.redirect('/login.html');
            }
        }
    });
};

// API Routes
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const session = await auth.login(username, password);
        
        if (session) {
            res.cookie('sessionId', session.sessionId, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 24 * 60 * 60 * 1000 // 24 hours
            });
            
            res.json({ success: true, sessionId: session.sessionId });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/logout', requireAuth, async (req, res) => {
    const sessionId = req.cookies.sessionId || req.headers['x-session-id'];
    await auth.logout(sessionId);
    res.clearCookie('sessionId');
    res.json({ success: true });
});

// Check ID availability
app.get('/api/check-id/:id', requireAuth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const exists = await db.checkIdExists(id);
        res.json({ available: !exists });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Add new account
app.post('/api/accounts', requireAuth, upload.array('images', 40), async (req, res) => {
    try {
        const { id, email, google_password, moonton_password, secondary_password } = req.body;
        
        // Validate required fields
        if (!id || !email || !google_password || !moonton_password || !secondary_password) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        // Check ID uniqueness
        const idExists = await db.checkIdExists(parseInt(id));
        if (idExists) {
            return res.status(400).json({ error: 'ID already exists' });
        }
        
        // Process uploaded images
        const images = req.files ? req.files.map(file => file.filename) : [];
        
        // Add to database
        await db.addAccount({
            id: parseInt(id),
            email,
            google_password,
            moonton_password,
            secondary_password,
            images
        });
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error adding account:', error);
        res.status(500).json({ error: 'Failed to add account' });
    }
});

// Get all accounts
app.get('/api/accounts', requireAuth, async (req, res) => {
    try {
        const accounts = await db.getAllAccounts();
        res.json(accounts);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete account
app.delete('/api/accounts/:id', requireAuth, async (req, res) => {
    try {
        await db.deleteAccount(parseInt(req.params.id));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Serve frontend pages
app.get('/', (req, res) => {
    res.redirect('/index.html');
});

app.get('/add-account', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/add-account.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large' });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ error: 'Too many files' });
        }
    }
    
    res.status(500).json({ error: 'Something went wrong' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    
    // Cleanup expired sessions every hour
    setInterval(() => {
        db.cleanupExpiredSessions();
    }, 60 * 60 * 1000);
});