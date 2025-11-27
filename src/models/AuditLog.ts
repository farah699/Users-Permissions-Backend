import mongoose, { Document, Schema, Model } from 'mongoose';
import { IUser } from './User';

/**
 * @swagger
 * components:
 *   schemas:
 *     AuditLog:
 *       type: object
 *       required:
 *         - action
 *         - resource
 *         - resourceId
 *         - userId
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated audit log ID
 *         action:
 *           type: string
 *           description: Action performed
 *           enum: [create, read, update, delete, login, logout, assign_role, remove_role]
 *           example: "update"
 *         resource:
 *           type: string
 *           description: Resource affected
 *           example: "user"
 *         resourceId:
 *           type: string
 *           description: ID of the affected resource
 *         userId:
 *           type: string
 *           description: ID of the user who performed the action
 *         userEmail:
 *           type: string
 *           description: Email of the user who performed the action
 *         changes:
 *           type: object
 *           description: Details of what changed (for update actions)
 *         metadata:
 *           type: object
 *           description: Additional metadata about the action
 *         ipAddress:
 *           type: string
 *           description: IP address from which the action was performed
 *         userAgent:
 *           type: string
 *           description: User agent string
 *         createdAt:
 *           type: string
 *           format: date-time
 */

export interface IAuditLog extends Document {
  action: 'create' | 'read' | 'update' | 'delete' | 'login' | 'logout' | 'assign_role' | 'remove_role' | 'permission_change';
  resource: string;
  resourceId: string;
  userId: IUser['_id'];
  userEmail: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface IAuditLogModel extends Model<IAuditLog> {
  createLog(data: Partial<IAuditLog>): Promise<IAuditLog | null>;
  getRecentActivity(limit?: number): Promise<IAuditLog[]>;
  getUserActivity(userId: string, limit?: number): Promise<IAuditLog[]>;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
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
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required']
    },
    userEmail: {
      type: String,
      required: [true, 'User email is required'],
      lowercase: true
    },
    changes: {
      type: Schema.Types.Mixed,
      default: undefined
    },
    metadata: {
      type: Schema.Types.Mixed,
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
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for efficient querying
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ resourceId: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

// TTL index to automatically delete old logs after 1 year (optional)
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

// Static method to create audit log
auditLogSchema.statics.createLog = async function(data: Partial<IAuditLog>) {
  try {
    const auditLog = new this(data);
    await auditLog.save();
    return auditLog;
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw error to prevent audit logging from breaking main functionality
    return null;
  }
};

// Static method to get recent activity
auditLogSchema.statics.getRecentActivity = function(limit = 50) {
  return this.find()
    .populate('userId', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

// Static method to get user activity
auditLogSchema.statics.getUserActivity = function(userId: string, limit = 50) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

export const AuditLog = mongoose.model<IAuditLog, IAuditLogModel>('AuditLog', auditLogSchema);