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
exports.Role = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const roleSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, 'Role name is required'],
        unique: true,
        trim: true,
        maxlength: [50, 'Role name cannot exceed 50 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    permissions: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Permission'
        }],
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// Index for faster queries
roleSchema.index({ name: 1 });
roleSchema.index({ isActive: 1 });
// Virtual for user count
roleSchema.virtual('userCount', {
    ref: 'User',
    localField: '_id',
    foreignField: 'roles',
    count: true
});
// Pre-populate permissions when finding roles
roleSchema.pre(/^find/, function (next) {
    const options = this.getOptions?.();
    if (options?.skipPopulate) {
        return next();
    }
    this.populate({
        path: 'permissions',
        select: 'name resource action description'
    });
    next();
});
// Static method to create default roles
roleSchema.statics.getDefaultRoles = function () {
    return [
        {
            name: 'Super Admin',
            description: 'Full system access with all permissions',
            isActive: true
        },
        {
            name: 'Admin',
            description: 'Administrative access with most permissions',
            isActive: true
        },
        {
            name: 'Manager',
            description: 'Management access with limited permissions',
            isActive: true
        },
        {
            name: 'User',
            description: 'Basic user access with minimal permissions',
            isActive: true
        },
        {
            name: 'Guest',
            description: 'Read-only access for guests',
            isActive: true
        }
    ];
};
// Instance method to check if role has specific permission
roleSchema.methods.hasPermission = function (resource, action) {
    if (!this.permissions || this.permissions.length === 0)
        return false;
    return this.permissions.some((permission) => permission.resource === resource &&
        (permission.action === action || permission.action === 'manage'));
};
exports.Role = mongoose_1.default.model('Role', roleSchema);
//# sourceMappingURL=Role.js.map