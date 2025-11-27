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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jwt = __importStar(require("jsonwebtoken"));
const userSchema = new mongoose_1.Schema({
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            'Please provide a valid email address'
        ]
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters long'],
        select: false // Don't include password in queries by default
    },
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    roles: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Role'
        }],
    isActive: {
        type: Boolean,
        default: true
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    refreshTokens: [{
            type: String
        }],
    lastLogin: Date
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: function (doc, ret) {
            if (ret.password)
                delete ret.password;
            if (ret.refreshTokens)
                delete ret.refreshTokens;
            if (ret.emailVerificationToken)
                delete ret.emailVerificationToken;
            if (ret.passwordResetToken)
                delete ret.passwordResetToken;
            return ret;
        }
    },
    toObject: { virtuals: true }
});
// Indexes
userSchema.index({ email: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ roles: 1 });
userSchema.index({ emailVerificationToken: 1 });
userSchema.index({ passwordResetToken: 1 });
// Virtual for full name
userSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`;
});
// Pre-save middleware to hash password
userSchema.pre('save', async function (next) {
    if (!this.isModified('password') || !this.password)
        return next();
    try {
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
        this.password = await bcryptjs_1.default.hash(this.password, saltRounds);
        next();
    }
    catch (error) {
        next(error);
    }
});
// Pre-populate roles when finding users
userSchema.pre(/^find/, function (next) {
    const options = this.getOptions?.();
    if (options?.skipPopulate) {
        return next();
    }
    this.populate({
        path: 'roles',
        select: 'name description permissions isActive',
        populate: {
            path: 'permissions',
            select: 'name resource action description'
        }
    });
    next();
});
// Instance method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcryptjs_1.default.compare(candidatePassword, this.password);
};
// Instance method to generate access token
userSchema.methods.generateAccessToken = function () {
    try {
        const payload = {
            id: this._id.toString(),
            email: this.email,
            roles: this.roles
        };
        return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
            expiresIn: '15m'
        });
    }
    catch (error) {
        throw new Error('Failed to generate access token');
    }
};
// Instance method to generate refresh token
userSchema.methods.generateRefreshToken = function () {
    try {
        const payload = { id: this._id.toString() };
        return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
            expiresIn: '7d'
        });
    }
    catch (error) {
        throw new Error('Failed to generate refresh token');
    }
};
// Instance method to generate email verification token
userSchema.methods.generateEmailVerificationToken = function () {
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    this.emailVerificationToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
    this.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    return token;
};
// Instance method to generate password reset token
userSchema.methods.generatePasswordResetToken = function () {
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
    this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    return token;
};
// Instance method to check if user has specific permission
userSchema.methods.hasPermission = async function (resource, action) {
    await this.populate('roles');
    if (!this.roles || this.roles.length === 0)
        return false;
    for (const role of this.roles) {
        if (!role.isActive)
            continue;
        await role.populate('permissions');
        if (role.permissions && role.permissions.some((permission) => permission.resource === resource &&
            (permission.action === action || permission.action === 'manage'))) {
            return true;
        }
    }
    return false;
};
// Instance method to get full name
userSchema.methods.getFullName = function () {
    return `${this.firstName} ${this.lastName}`;
};
exports.User = mongoose_1.default.model('User', userSchema);
//# sourceMappingURL=User.js.map