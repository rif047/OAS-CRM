require('dotenv').config();
require('./Config/Database');

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const routes = require('./Routes');
const Login = require('./API/Auth/Login');
const Check_Login = require('./Middlewares/Check_Login');
const BackupRoutes = require('./Config/Backup');
const Search = require('./Config/Search');


const app = express();
const PORT = process.env.PORT || 9000;

// Rate limiting
app.use(rateLimit({ windowMs: 60000, max: 200 }));



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
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "img-src": ["'self'", "data:", "blob:"],
        },
    },
}));



app.use(cors({
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200,
    exposedHeaders: ['Authorization']
}));




// Middleware
app.use(morgan('dev'));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));




// Routes
app.get('/favicon.ico', (_, res) => res.sendStatus(204));
app.get('/', (_, res) => res.send('✅ Server Running Successfully...'));
app.use('/login', Login);
// app.use('/api', Check_Login, routes);
app.use('/api', routes);
app.use('/db', BackupRoutes);
app.use('/search', Search);



// 404 handler
app.use((req, res) => res.status(404).json({ error: 'Not Found' }));




// Error handler
app.use((err, req, res, next) => {
    if (err.code === 'ECONNRESET') {
        console.log('⚠️ Client connection reset');
        return res.sendStatus(499);
    }

    console.error(err.stack || err);
    res.status(500).json({
        error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
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