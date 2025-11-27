"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLog = exports.optionalAuth = exports.authorizeResourceOwnership = exports.requireRoles = exports.authorize = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const AuditLog_1 = require("../models/AuditLog");
// Middleware to protect routes - requires valid JWT token
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ message: 'Access token required' });
            return;
        }
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        try {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_ACCESS_SECRET);
            // Get user from database
            const user = await User_1.User.findById(decoded.id);
            if (!user || !user.isActive) {
                res.status(401).json({ message: 'User not found or inactive' });
                return;
            }
            req.user = user;
            next();
        }
        catch (jwtError) {
            if (jwtError instanceof jsonwebtoken_1.default.TokenExpiredError) {
                res.status(401).json({ message: 'Token expired' });
                return;
            }
            else if (jwtError instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                res.status(401).json({ message: 'Invalid token' });
                return;
            }
            throw jwtError;
        }
    }
    catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({ message: 'Authentication failed' });
    }
};
exports.authenticate = authenticate;
// Middleware to check if user has required permission
const authorize = (resource, action) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                res.status(401).json({ message: 'Authentication required' });
                return;
            }
            const hasPermission = await req.user.hasPermission(resource, action);
            if (!hasPermission) {
                // Log unauthorized access attempt
                await AuditLog_1.AuditLog.createLog({
                    action: 'read',
                    resource: 'unauthorized_access',
                    resourceId: req.path,
                    userId: req.user._id,
                    userEmail: req.user.email,
                    metadata: {
                        requiredResource: resource,
                        requiredAction: action,
                        path: req.path,
                        method: req.method
                    },
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent')
                });
                res.status(403).json({
                    message: 'Insufficient permissions',
                    required: { resource, action }
                });
                return;
            }
            next();
        }
        catch (error) {
            console.error('Authorization error:', error);
            res.status(500).json({ message: 'Authorization check failed' });
        }
    };
};
exports.authorize = authorize;
// Middleware to check if user has any of the specified roles
const requireRoles = (roles) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                res.status(401).json({ message: 'Authentication required' });
                return;
            }
            await req.user.populate('roles');
            const userRoleNames = req.user.roles.map((role) => role.name);
            const hasRequiredRole = roles.some(role => userRoleNames.includes(role));
            if (!hasRequiredRole) {
                res.status(403).json({
                    message: 'Insufficient role permissions',
                    required: roles,
                    userRoles: userRoleNames
                });
                return;
            }
            next();
        }
        catch (error) {
            console.error('Role authorization error:', error);
            res.status(500).json({ message: 'Role authorization check failed' });
        }
    };
};
exports.requireRoles = requireRoles;
// Middleware to allow access only to own resources or if user has manage permission
const authorizeResourceOwnership = (resource) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                res.status(401).json({ message: 'Authentication required' });
                return;
            }
            const resourceId = req.params.id || req.params.userId;
            // Check if user is accessing their own resource
            if (resourceId === req.user._id.toString()) {
                return next();
            }
            // Check if user has manage permission for the resource
            const hasManagePermission = await req.user.hasPermission(resource, 'manage');
            if (!hasManagePermission) {
                res.status(403).json({
                    message: 'Can only access your own resources or need manage permission',
                    resource
                });
                return;
            }
            next();
        }
        catch (error) {
            console.error('Resource ownership authorization error:', error);
            res.status(500).json({ message: 'Resource ownership check failed' });
        }
    };
};
exports.authorizeResourceOwnership = authorizeResourceOwnership;
// Optional middleware - allows access without token but populates user if token is present
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }
        const token = authHeader.substring(7);
        try {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_ACCESS_SECRET);
            const user = await User_1.User.findById(decoded.id);
            if (user && user.isActive) {
                req.user = user;
            }
        }
        catch (jwtError) {
            // Silently fail for optional auth
        }
        next();
    }
    catch (error) {
        // Silently fail for optional auth
        next();
    }
};
exports.optionalAuth = optionalAuth;
// Middleware to create audit log for requests
const auditLog = (action, resource) => {
    return async (req, res, next) => {
        try {
            // Store original res.json to capture response
            const originalJson = res.json;
            res.json = function (data) {
                // Create audit log after successful response
                if (req.user && res.statusCode < 400) {
                    const resourceId = req.params.id || req.params.userId || req.body.id || 'unknown';
                    AuditLog_1.AuditLog.createLog({
                        action: action,
                        resource,
                        resourceId,
                        userId: req.user._id,
                        userEmail: req.user.email,
                        metadata: {
                            method: req.method,
                            path: req.path,
                            statusCode: res.statusCode,
                            responseData: action === 'read' ? undefined : data // Don't log read responses to save space
                        },
                        ipAddress: req.ip,
                        userAgent: req.get('User-Agent')
                    });
                }
                return originalJson.call(this, data);
            };
            next();
        }
        catch (error) {
            console.error('Audit log middleware error:', error);
            next();
        }
    };
};
exports.auditLog = auditLog;
//# sourceMappingURL=auth.js.map