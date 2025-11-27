import mongoose, { Document, Schema } from 'mongoose';
import { IPermission } from './Permission';

/**
 * @swagger
 * components:
 *   schemas:
 *     Role:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated role ID
 *         name:
 *           type: string
 *           description: Role name
 *           example: "Admin"
 *         description:
 *           type: string
 *           description: Role description
 *           example: "Administrator with full system access"
 *         permissions:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Permission'
 *           description: Array of permissions assigned to this role
 *         isActive:
 *           type: boolean
 *           description: Whether the role is active
 *           default: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

export interface IRole extends Document {
  name: string;
  description?: string;
  permissions: IPermission['_id'][];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const roleSchema = new Schema<IRole>(
  {
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
      type: Schema.Types.ObjectId,
      ref: 'Permission'
    }],
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

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
roleSchema.pre(/^find/, function(next) {
  const options = (this as any).getOptions?.();
  if (options?.skipPopulate) {
    return next();
  }
  
  (this as any).populate({
    path: 'permissions',
    select: 'name resource action description'
  });
  
  next();
});

// Static method to create default roles
roleSchema.statics.getDefaultRoles = function() {
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
roleSchema.methods.hasPermission = function(resource: string, action: string): boolean {
  if (!this.permissions || this.permissions.length === 0) return false;
  
  return this.permissions.some((permission: IPermission) => 
    permission.resource === resource && 
    (permission.action === action || permission.action === 'manage')
  );
};

export const Role = mongoose.model<IRole>('Role', roleSchema);