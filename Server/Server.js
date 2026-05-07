require('dotenv').config();
process.env.TZ = 'Europe/London';

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const routes = require('./Routes');
const Login = require('./API/Auth/Login');
const Check_Login = require('./Middlewares/Check_Login');
const authorize = require('./Middlewares/Authorize');
const sanitizeRequest = require('./Middlewares/Sanitize_Request');
const BackupRoutes = require('./Config/Backup');
const Search = require('./Config/Search');
require('./Config/Database');

const app = express();
const PORT = process.env.PORT || 9000;
const NODE_ENV = process.env.NODE_ENV || 'development';

const REQUIRED_ENV_KEYS = ['MONGO_URI'];
const missingEnvKeys = REQUIRED_ENV_KEYS.filter((key) => !String(process.env[key] || '').trim());
if (missingEnvKeys.length) {
    console.error(`❌ Missing required env keys: ${missingEnvKeys.join(', ')}`);
    process.exit(1);
}

if (!String(process.env.JWT_SECRET || '').trim()) {
    if (NODE_ENV === 'production') {
        console.error('❌ JWT_SECRET is required in production.');
        process.exit(1);
    }

    process.env.JWT_SECRET = 'dev-insecure-jwt-secret-change-me';
    console.warn('⚠️ JWT_SECRET not set. Using development fallback secret.');
}

if (NODE_ENV === 'production' && String(process.env.JWT_SECRET || '').trim().length < 32) {
    console.error('❌ JWT_SECRET must be at least 32 characters in production.');
    process.exit(1);
}

app.disable('x-powered-by');

const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 180,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many login attempts. Please wait and try again.' },
});

app.use(globalLimiter);

// Request timeout
app.use((req, res, next) => {
    req.setTimeout(600000);
    next();
});

// Static files
app.use(express.static('Assets'));
app.use('/api/Images', express.static(path.join(__dirname, 'Assets/Images')));

// Security & CORS
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            'img-src': ["'self'", 'data:', 'blob:'],
        },
    },
}));

app.use(compression({ threshold: 1024 }));

const allowedOrigins = String(process.env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(cors({
    origin(origin, callback) {
        if (!allowedOrigins.length && NODE_ENV !== 'production') return callback(null, true);
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Origin not allowed by CORS policy'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-Request-At'],
    credentials: true,
    optionsSuccessStatus: 200,
    exposedHeaders: ['Authorization'],
}));

// Middleware
app.use(morgan('dev'));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(sanitizeRequest);

// Routes
app.get('/favicon.ico', (_, res) => res.sendStatus(204));
app.get('/', (_, res) => res.send('✅ Server Running Successfully...'));
app.use('/login', loginLimiter, Login);
app.use('/api', Check_Login, routes);
app.use('/db', Check_Login, authorize('Admin'), BackupRoutes);
app.use('/search', Check_Login, authorize('Admin', 'Management'), Search);

// 404 handler
app.use((req, res) => res.status(404).json({ error: 'Not Found' }));

// Error handler
app.use((err, req, res, next) => {
    if (err.code === 'ECONNRESET') {
        console.log('⚠️ Client connection reset');
        return res.sendStatus(499);
    }

    if (err?.name === 'VersionError') {
        return res.status(409).json({
            error: 'This record was updated by another user. Refresh and try again.',
        });
    }

    if (err?.code === 11000) {
        const field = Object.keys(err.keyPattern || {})[0] || 'field';
        return res.status(409).json({ error: `${field} already exists.` });
    }

    if (err?.name === 'CastError') {
        return res.status(400).json({ error: 'Invalid request data.' });
    }

    console.error(err.stack || err);
    res.status(500).json({
        error: NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
    });
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`🚀 Server is running at http://localhost:${PORT}`);
});

// Handle connection errors
server.on('connection', (socket) => {
    socket.on('error', (err) => {
        if (err.code === 'ECONNRESET') console.log('⚠️ Client connection reset');
    });
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Server shutting down...');
    process.exit(0);
});

process.on('unhandledRejection', (reason) => {
    console.error('❌ Unhandled Rejection:', reason);
});
