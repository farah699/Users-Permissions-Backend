import mongoose, { Document, Schema } from 'mongoose';

/**
 * @swagger
 * components:
 *   schemas:
 *     Permission:
 *       type: object
 *       required:
 *         - name
 *         - resource
 *         - action
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated permission ID
 *         name:
 *           type: string
 *           description: Human-readable permission name
 *           example: "Read Users"
 *         resource:
 *           type: string
 *           description: Resource the permission applies to
 *           example: "user"
 *         action:
 *           type: string
 *           description: Action that can be performed
 *           example: "read"
 *         description:
 *           type: string
 *           description: Optional permission description
 *           example: "Allows viewing user information"
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

export interface IPermission extends Document {
  name: string;
  resource: string; // e.g., 'user', 'role', 'permission'
  action: string;   // e.g., 'create', 'read', 'update', 'delete'
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const permissionSchema = new Schema<IPermission>(
  {
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound index for resource + action uniqueness
permissionSchema.index({ resource: 1, action: 1 }, { unique: true });

// Static method to get common permissions
permissionSchema.statics.getCommonPermissions = function() {
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

export const Permission = mongoose.model<IPermission>('Permission', permissionSchema);