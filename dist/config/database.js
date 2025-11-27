"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const connectDB = async () => {
    // Skip MongoDB in production if requested
    if (process.env.SKIP_MONGODB === 'true') {
        console.log('⚠️ MongoDB connection skipped (SKIP_MONGODB=true)');
        return;
    }
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/users_permissions_db';
        await mongoose_1.default.connect(mongoURI, {
        // Remove deprecated options
        });
        console.log('✅ MongoDB Connected Successfully');
        // Handle connection events
        mongoose_1.default.connection.on('error', (error) => {
            console.error('❌ MongoDB connection error:', error);
        });
        mongoose_1.default.connection.on('disconnected', () => {
            console.warn('⚠️ MongoDB disconnected');
        });
        process.on('SIGINT', async () => {
            await mongoose_1.default.connection.close();
            console.log('🔌 MongoDB connection closed through app termination');
            process.exit(0);
        });
    }
    catch (error) {
        console.error('❌ MongoDB connection failed:', error);
        // DON'T EXIT - Continue without database in production
        if (process.env.NODE_ENV === 'production') {
            console.log('🔄 Continuing without MongoDB in production mode...');
            return;
        }
        process.exit(1);
    }
};
exports.connectDB = connectDB;
//# sourceMappingURL=database.js.map