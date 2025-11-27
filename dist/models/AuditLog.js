"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLog = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const auditLogSchema = new mongoose_1.Schema({
    action: {
        type: String,
        required: [true, 'Action is required'],
        enum: ['create', 'read', 'update', 'delete', 'login', 'logout', 'assign_role', 'remove_role', 'permission_change']
    },
    resource: {
        type: String,
        required: [true, 'Resource is required'],
        trim: true,
        lowercase: true
    },
    resourceId: {
        type: String,
        required: [true, 'Resource ID is required']
    },
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required']
    },
    userEmail: {
        type: String,
        required: [true, 'User email is required'],
        lowercase: true
    },
    changes: {
        type: mongoose_1.Schema.Types.Mixed,
        default: undefined
    },
    metadata: {
        type: mongoose_1.Schema.Types.Mixed,
        default: undefined
    },
    ipAddress: {
        type: String,
        trim: true
    },
    userAgent: {
        type: String,
        trim: true
    }
}, {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// Indexes for efficient querying
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ resourceId: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });
// TTL index to automatically delete old logs after 1 year (optional)
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });
// Static method to create audit log
auditLogSchema.statics.createLog = async function (data) {
    try {
        const auditLog = new this(data);
        await auditLog.save();
        return auditLog;
    }
    catch (error) {
        console.error('Failed to create audit log:', error);
        // Don't throw error to prevent audit logging from breaking main functionality
        return null;
    }
};
// Static method to get recent activity
auditLogSchema.statics.getRecentActivity = function (limit = 50) {
    return this.find()
        .populate('userId', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
};
// Static method to get user activity
auditLogSchema.statics.getUserActivity = function (userId, limit = 50) {
    return this.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
};
exports.AuditLog = mongoose_1.default.model('AuditLog', auditLogSchema);
//# sourceMappingURL=AuditLog.js.map