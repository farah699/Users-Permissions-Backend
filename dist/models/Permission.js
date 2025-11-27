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
exports.Permission = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const permissionSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, 'Permission name is required'],
        unique: true,
        trim: true,
        maxlength: [100, 'Permission name cannot exceed 100 characters']
    },
    resource: {
        type: String,
        required: [true, 'Resource is required'],
        trim: true,
        lowercase: true,
        maxlength: [50, 'Resource name cannot exceed 50 characters']
    },
    action: {
        type: String,
        required: [true, 'Action is required'],
        trim: true,
        lowercase: true,
        enum: ['create', 'read', 'update', 'delete', 'manage'],
        maxlength: [20, 'Action cannot exceed 20 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// Compound index for resource + action uniqueness
permissionSchema.index({ resource: 1, action: 1 }, { unique: true });
// Static method to get common permissions
permissionSchema.statics.getCommonPermissions = function () {
    return [
        // User permissions
        { name: 'Create Users', resource: 'user', action: 'create', description: 'Create new users' },
        { name: 'Read Users', resource: 'user', action: 'read', description: 'View user information' },
        { name: 'Update Users', resource: 'user', action: 'update', description: 'Edit user information' },
        { name: 'Delete Users', resource: 'user', action: 'delete', description: 'Remove users from system' },
        { name: 'Manage Users', resource: 'user', action: 'manage', description: 'Full user management access' },
        // Role permissions
        { name: 'Create Roles', resource: 'role', action: 'create', description: 'Create new roles' },
        { name: 'Read Roles', resource: 'role', action: 'read', description: 'View role information' },
        { name: 'Update Roles', resource: 'role', action: 'update', description: 'Edit role information' },
        { name: 'Delete Roles', resource: 'role', action: 'delete', description: 'Remove roles from system' },
        { name: 'Manage Roles', resource: 'role', action: 'manage', description: 'Full role management access' },
        // Permission permissions
        { name: 'Read Permissions', resource: 'permission', action: 'read', description: 'View available permissions' },
        { name: 'Manage Permissions', resource: 'permission', action: 'manage', description: 'Full permission management' },
        // Audit permissions
        { name: 'Read Audit Logs', resource: 'audit', action: 'read', description: 'View system audit logs' }
    ];
};
exports.Permission = mongoose_1.default.model('Permission', permissionSchema);
//# sourceMappingURL=Permission.js.map