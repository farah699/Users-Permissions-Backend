import express, { Request, Response } from 'express';
import { Permission } from '../models/Permission';
import { Role } from '../models/Role';
import { authenticate, authorize, auditLog } from '../middleware/auth';
import { 
  createPermissionSchema, 
  paginationSchema, 
  objectIdSchema 
} from '../validation/schemas';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * @swagger
 * /api/permissions:
 *   get:
 *     summary: Get all permissions with pagination and filtering
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: resource
 *         schema:
 *           type: string
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *           enum: [create, read, update, delete, manage]
 *     responses:
 *       200:
 *         description: List of permissions
 */
router.get(
  '/',
  authorize('permission', 'read'),
  auditLog('read', 'permission'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { error, value } = paginationSchema.validate(req.query);
      if (error) {
        res.status(400).json({
          success: false,
          message: error.details[0].message
        });
        return;
      }

      const { page, limit, search } = value;
      const { resource, action } = req.query;

      // Build query
      const query: any = {};

      if (resource) {
        query.resource = resource;
      }

      if (action) {
        query.action = action;
      }

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { resource: { $regex: search, $options: 'i' } }
        ];
      }

      // Execute query
      const skip = (page - 1) * limit;

      const [permissions, total] = await Promise.all([
        Permission.find(query)
          .sort({ resource: 1, action: 1 })
          .skip(skip)
          .limit(limit),
        Permission.countDocuments(query)
      ]);

      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: {
          permissions,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        }
      });
    } catch (error) {
      console.error('Get permissions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch permissions'
      });
    }
  }
);

/**
 * @swagger
 * /api/permissions/grouped:
 *   get:
 *     summary: Get permissions grouped by resource
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Permissions grouped by resource
 */
router.get(
  '/grouped',
  authorize('permission', 'read'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const permissions = await Permission.find().sort({ resource: 1, action: 1 });

      // Group permissions by resource
      const grouped = permissions.reduce((acc: any, permission) => {
        if (!acc[permission.resource]) {
          acc[permission.resource] = [];
        }
        acc[permission.resource].push(permission);
        return acc;
      }, {});

      res.json({
        success: true,
        data: grouped
      });
    } catch (error) {
      console.error('Get grouped permissions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch grouped permissions'
      });
    }
  }
);

/**
 * @swagger
 * /api/permissions/{id}:
 *   get:
 *     summary: Get permission by ID
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Permission details
 *       404:
 *         description: Permission not found
 */
router.get(
  '/:id',
  authorize('permission', 'read'),
  auditLog('read', 'permission'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { error, value } = objectIdSchema.validate(req.params.id);
      if (error) {
        res.status(400).json({
          success: false,
          message: 'Invalid permission ID'
        });
        return;
      }

      const permission = await Permission.findById(value);

      if (!permission) {
        res.status(404).json({
          success: false,
          message: 'Permission not found'
        });
        return;
      }

      // Get roles that have this permission
      const roles = await Role.find({ 
        permissions: value,
        isActive: true 
      }).select('name description');

      res.json({
        success: true,
        data: {
          permission,
          roles
        }
      });
    } catch (error) {
      console.error('Get permission error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch permission'
      });
    }
  }
);

/**
 * @swagger
 * /api/permissions:
 *   post:
 *     summary: Create a new permission
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - resource
 *               - action
 *             properties:
 *               name:
 *                 type: string
 *               resource:
 *                 type: string
 *               action:
 *                 type: string
 *                 enum: [create, read, update, delete, manage]
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Permission created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Permission already exists
 */
router.post(
  '/',
  authorize('permission', 'manage'),
  auditLog('create', 'permission'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { error, value } = createPermissionSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          message: error.details[0].message
        });
        return;
      }

      const { name, resource, action, description } = value;

      // Check if permission with same name exists
      const existingPermissionByName = await Permission.findOne({ name });
      if (existingPermissionByName) {
        res.status(409).json({
          success: false,
          message: 'Permission with this name already exists'
        });
        return;
      }

      // Check if permission with same resource+action exists
      const existingPermissionByResourceAction = await Permission.findOne({ 
        resource, 
        action 
      });
      if (existingPermissionByResourceAction) {
        res.status(409).json({
          success: false,
          message: `Permission for ${action} on ${resource} already exists`
        });
        return;
      }

      // Create permission
      const permission = new Permission({
        name,
        resource,
        action,
        description
      });

      await permission.save();

      res.status(201).json({
        success: true,
        message: 'Permission created successfully',
        data: permission
      });
    } catch (error) {
      console.error('Create permission error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create permission'
      });
    }
  }
);

/**
 * @swagger
 * /api/permissions/bulk:
 *   post:
 *     summary: Create multiple permissions at once
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - permissions
 *             properties:
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - name
 *                     - resource
 *                     - action
 *                   properties:
 *                     name:
 *                       type: string
 *                     resource:
 *                       type: string
 *                     action:
 *                       type: string
 *                     description:
 *                       type: string
 *     responses:
 *       201:
 *         description: Permissions created successfully
 *       400:
 *         description: Validation error
 */
router.post(
  '/bulk',
  authorize('permission', 'manage'),
  auditLog('create', 'permission'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { permissions } = req.body;

      if (!Array.isArray(permissions) || permissions.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Permissions array is required and cannot be empty'
        });
        return;
      }

      // Validate each permission
      const validationErrors: string[] = [];
      const validPermissions: any[] = [];

      for (let i = 0; i < permissions.length; i++) {
        const { error, value } = createPermissionSchema.validate(permissions[i]);
        if (error) {
          validationErrors.push(`Permission ${i + 1}: ${error.details[0].message}`);
        } else {
          validPermissions.push(value);
        }
      }

      if (validationErrors.length > 0) {
        res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: validationErrors
        });
        return;
      }

      // Check for duplicates in request
      const uniqueNames = new Set(validPermissions.map(p => p.name));
      const uniqueResourceActions = new Set(validPermissions.map(p => `${p.resource}:${p.action}`));

      if (uniqueNames.size !== validPermissions.length) {
        res.status(400).json({
          success: false,
          message: 'Duplicate permission names in request'
        });
        return;
      }

      if (uniqueResourceActions.size !== validPermissions.length) {
        res.status(400).json({
          success: false,
          message: 'Duplicate resource-action combinations in request'
        });
        return;
      }

      // Check for existing permissions
      const existingNames = await Permission.find({
        name: { $in: validPermissions.map(p => p.name) }
      }).distinct('name');

      const existingResourceActions = await Permission.find({
        $or: validPermissions.map(p => ({ resource: p.resource, action: p.action }))
      }).select('resource action');

      if (existingNames.length > 0) {
        res.status(409).json({
          success: false,
          message: 'Some permission names already exist',
          existingNames
        });
        return;
      }

      if (existingResourceActions.length > 0) {
        res.status(409).json({
          success: false,
          message: 'Some resource-action combinations already exist',
          existing: existingResourceActions.map(p => `${p.resource}:${p.action}`)
        });
        return;
      }

      // Create permissions
      const createdPermissions = await Permission.insertMany(validPermissions);

      res.status(201).json({
        success: true,
        message: `${createdPermissions.length} permissions created successfully`,
        data: createdPermissions
      });
    } catch (error) {
      console.error('Bulk create permissions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create permissions'
      });
    }
  }
);

/**
 * @swagger
 * /api/permissions/{id}:
 *   delete:
 *     summary: Delete permission
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Permission deleted successfully
 *       404:
 *         description: Permission not found
 *       400:
 *         description: Cannot delete permission assigned to roles
 */
router.delete(
  '/:id',
  authorize('permission', 'manage'),
  auditLog('delete', 'permission'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { error, value } = objectIdSchema.validate(req.params.id);
      if (error) {
        res.status(400).json({
          success: false,
          message: 'Invalid permission ID'
        });
        return;
      }

      const permission = await Permission.findById(value);
      if (!permission) {
        res.status(404).json({
          success: false,
          message: 'Permission not found'
        });
        return;
      }

      // Check if permission is assigned to any roles
      const rolesCount = await Role.countDocuments({ 
        permissions: value,
        isActive: true 
      });

      if (rolesCount > 0) {
        res.status(400).json({
          success: false,
          message: `Cannot delete permission. It is assigned to ${rolesCount} active role(s)`
        });
        return;
      }

      await Permission.findByIdAndDelete(value);

      res.json({
        success: true,
        message: 'Permission deleted successfully'
      });
    } catch (error) {
      console.error('Delete permission error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete permission'
      });
    }
  }
);

/**
 * @swagger
 * /api/permissions/resources:
 *   get:
 *     summary: Get list of all resources
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of resources
 */
router.get(
  '/meta/resources',
  authorize('permission', 'read'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const resources = await Permission.distinct('resource');
      
      res.json({
        success: true,
        data: resources.sort()
      });
    } catch (error) {
      console.error('Get resources error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch resources'
      });
    }
  }
);

/**
 * @swagger
 * /api/permissions/actions:
 *   get:
 *     summary: Get list of all actions
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of actions
 */
router.get(
  '/meta/actions',
  authorize('permission', 'read'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const actions = ['create', 'read', 'update', 'delete', 'manage'];
      
      res.json({
        success: true,
        data: actions
      });
    } catch (error) {
      console.error('Get actions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch actions'
      });
    }
  }
);

export default router;