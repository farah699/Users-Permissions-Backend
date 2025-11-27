"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const database_1 = require("./config/database");
const errorHandler_1 = require("./middleware/errorHandler");
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const roles_1 = __importDefault(require("./routes/roles"));
const permissions_1 = __importDefault(require("./routes/permissions"));
const audit_1 = __importDefault(require("./routes/audit"));
// Load environment variables
dotenv_1.default.config();
console.log('🔧 Starting application...');
console.log('🔧 NODE_ENV:', process.env.NODE_ENV);
console.log('🔧 PORT:', process.env.PORT);
console.log('🔧 MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');
console.log('🔧 JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
// Log MongoDB URI for debugging (hide password)
if (process.env.MONGODB_URI) {
    const hiddenUri = process.env.MONGODB_URI.replace(/:[^:@]*@/, ':***@');
    console.log('🔧 MongoDB URI pattern:', hiddenUri);
}
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Trust proxy for Railway/production
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
    console.log('🔧 Trust proxy enabled for production');
}
// Connect to database (with bypass for Railway)
console.log('🔧 Connecting to database...');
if (process.env.SKIP_MONGODB === 'true') {
    console.log('⚠️ Skipping MongoDB connection for Railway debugging');
}
else {
    (0, database_1.connectDB)().catch(err => {
        console.error('❌ Failed to connect to MongoDB, but continuing...', err.message);
    });
}
// Security middleware
app.use((0, helmet_1.default)());
// CORS configuration with dynamic origin validation
const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin)
            return callback(null, true);
        // List of allowed origins
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:3001',
        ];
        // Add environment-specific origins
        if (process.env.FRONTEND_URL) {
            allowedOrigins.push(process.env.FRONTEND_URL);
        }
        if (process.env.CORS_ORIGIN) {
            allowedOrigins.push(...process.env.CORS_ORIGIN.split(',').map(o => o.trim()));
        }
        // Auto-allow Vercel deployments
        const isVercelDomain = origin.includes('.vercel.app') ||
            origin.includes('.vercel.com') ||
            origin.includes('users-permissions-frontend');
        // Auto-allow Railway/Render/Netlify domains for testing
        const isValidDeployment = origin.includes('.railway.app') ||
            origin.includes('.render.com') ||
            origin.includes('.netlify.app') ||
            origin.includes('.herokuapp.com');
        if (allowedOrigins.includes(origin) || isVercelDomain || isValidDeployment) {
            callback(null, true);
        }
        else {
            console.log(`🚫 CORS blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'), false);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count']
};
app.use((0, cors_1.default)(corsOptions));
// Rate limiting with Railway proxy support
const limiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);
// Logging
if (process.env.NODE_ENV !== 'test') {
    app.use((0, morgan_1.default)('combined'));
}
// Body parsing middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Swagger documentation
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Users & Permissions Management API',
            version: '1.0.0',
            description: 'A comprehensive RBAC system with user management',
        },
        servers: [
            {
                url: `http://localhost:${PORT}`,
                description: 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
    },
    apis: ['./src/routes/*.ts', './src/models/*.ts'],
};
const specs = (0, swagger_jsdoc_1.default)(options);
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(specs));
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV
    });
});
// API Routes
app.use('/api/auth', auth_1.default);
app.use('/api/users', users_1.default);
app.use('/api/roles', roles_1.default);
app.use('/api/permissions', permissions_1.default);
app.use('/api/audit', audit_1.default);
// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ message: 'Route not found' });
});
// Global error handler
app.use(errorHandler_1.errorHandler);
// Start server
if (process.env.NODE_ENV !== 'test') {
    console.log('🔧 Starting server on port', PORT);
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📚 API Documentation available at http://localhost:${PORT}/api-docs`);
        console.log('✅ Application startup completed successfully!');
    });
}
exports.default = app;
//# sourceMappingURL=server.js.map