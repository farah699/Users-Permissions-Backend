import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { IRole } from './Role';

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - email
 *         - firstName
 *         - lastName
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated user ID
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *           example: "john.doe@example.com"
 *         firstName:
 *           type: string
 *           description: User's first name
 *           example: "John"
 *         lastName:
 *           type: string
 *           description: User's last name
 *           example: "Doe"
 *         roles:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Role'
 *           description: Array of roles assigned to this user
 *         isActive:
 *           type: boolean
 *           description: Whether the user account is active
 *           default: true
 *         isEmailVerified:
 *           type: boolean
 *           description: Whether the user's email is verified
 *           default: false
 *         lastLogin:
 *           type: string
 *           format: date-time
 *           description: User's last login timestamp
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     UserCreate:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - firstName
 *         - lastName
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           minLength: 8
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         roles:
 *           type: array
 *           items:
 *             type: string
 */

export interface IUser extends Document {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  roles: IRole['_id'][];
  isActive: boolean;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  refreshTokens: string[];
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  comparePassword(password: string): Promise<boolean>;
  generateAccessToken(): string;
  generateRefreshToken(): string;
  generateEmailVerificationToken(): string;
  generatePasswordResetToken(): string;
  hasPermission(resource: string, action: string): Promise<boolean>;
  getFullName(): string;
}

const userSchema = new Schema<IUser>(
  {
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
      type: Schema.Types.ObjectId,
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
  },
  {
    timestamps: true,
    toJSON: { 
      virtuals: true,
      transform: function(doc: any, ret: any) {
        if (ret.password) delete ret.password;
        if (ret.refreshTokens) delete ret.refreshTokens;
        if (ret.emailVerificationToken) delete ret.emailVerificationToken;
        if (ret.passwordResetToken) delete ret.passwordResetToken;
        return ret;
      }
    },
    toObject: { virtuals: true }
  }
);

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ roles: 1 });
userSchema.index({ emailVerificationToken: 1 });
userSchema.index({ passwordResetToken: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  
  try {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Pre-populate roles when finding users
userSchema.pre(/^find/, function(next) {
  const options = (this as any).getOptions?.();
  if (options?.skipPopulate) {
    return next();
  }
  
  (this as any).populate({
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
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Instance method to generate access token
userSchema.methods.generateAccessToken = function(): string {
  try {
    const payload = { 
      id: this._id.toString(),
      email: this.email,
      roles: this.roles
    };
    return (jwt as any).sign(payload, process.env.JWT_ACCESS_SECRET, { 
      expiresIn: '15m' 
    });
  } catch (error) {
    throw new Error('Failed to generate access token');
  }
};

// Instance method to generate refresh token
userSchema.methods.generateRefreshToken = function(): string {
  try {
    const payload = { id: this._id.toString() };
    return (jwt as any).sign(payload, process.env.JWT_REFRESH_SECRET, { 
      expiresIn: '7d' 
    });
  } catch (error) {
    throw new Error('Failed to generate refresh token');
  }
};

// Instance method to generate email verification token
userSchema.methods.generateEmailVerificationToken = function(): string {
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
userSchema.methods.generatePasswordResetToken = function(): string {
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
userSchema.methods.hasPermission = async function(resource: string, action: string): Promise<boolean> {
  await this.populate('roles');
  
  if (!this.roles || this.roles.length === 0) return false;
  
  for (const role of this.roles) {
    if (!role.isActive) continue;
    
    await role.populate('permissions');
    
    if (role.permissions && role.permissions.some((permission: any) => 
      permission.resource === resource && 
      (permission.action === action || permission.action === 'manage')
    )) {
      return true;
    }
  }
  
  return false;
};

// Instance method to get full name
userSchema.methods.getFullName = function(): string {
  return `${this.firstName} ${this.lastName}`;
};

export const User = mongoose.model<IUser>('User', userSchema);