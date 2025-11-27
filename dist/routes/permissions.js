"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Permission_1 = require("../models/Permission");
const Role_1 = require("../models/Role");
const auth_1 = require("../middleware/auth");
const schemas_1 = require("../validation/schemas");
const router = express_1.default.Router();
// Apply authentication to all routes
router.use(auth_1.authenticate);
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
router.get('/', (0, auth_1.authorize)('permission', 'read'), (0, auth_1.auditLog)('read', 'permission'), async (req, res) => {
    try {
        const { error, value } = schemas_1.paginationSchema.validate(req.query);
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
        const query = {};
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
            Permission_1.Permission.find(query)
                .sort({ resource: 1, action: 1 })
                .skip(skip)
                .limit(limit),
            Permission_1.Permission.countDocuments(query)
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
    }
    catch (error) {
        console.error('Get permissions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch permissions'
        });
    }
});
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
router.get('/grouped', (0, auth_1.authorize)('permission', 'read'), async (req, res) => {
    try {
        const permissions = await Permission_1.Permission.find().sort({ resource: 1, action: 1 });
        // Group permissions by resource
        const grouped = permissions.reduce((acc, permission) => {
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
    }
    catch (error) {
        console.error('Get grouped permissions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch grouped permissions'
        });
    }
});
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
router.get('/:id', (0, auth_1.authorize)('permission', 'read'), (0, auth_1.auditLog)('read', 'permission'), async (req, res) => {
    try {
        const { error, value } = schemas_1.objectIdSchema.validate(req.params.id);
        if (error) {
            res.status(400).json({
                success: false,
                message: 'Invalid permission ID'
            });
            return;
        }
        const permission = await Permission_1.Permission.findById(value);
        if (!permission) {
            res.status(404).json({
                success: false,
                message: 'Permission not found'
            });
            return;
        }
        // Get roles that have this permission
        const roles = await Role_1.Role.find({
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
    }
    catch (error) {
        console.error('Get permission error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch permission'
        });
    }
});
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
router.post('/', (0, auth_1.authorize)('permission', 'manage'), (0, auth_1.auditLog)('create', 'permission'), async (req, res) => {
    try {
        const { error, value } = schemas_1.createPermissionSchema.validate(req.body);
        if (error) {
            res.status(400).json({
                success: false,
                message: error.details[0].message
            });
            return;
        }
        const { name, resource, action, description } = value;
        // Check if permission with same name exists
        const existingPermissionByName = await Permission_1.Permission.findOne({ name });
        if (existingPermissionByName) {
            res.status(409).json({
                success: false,
                message: 'Permission with this name already exists'
            });
            return;
        }
        // Check if permission with same resource+action exists
        const existingPermissionByResourceAction = await Permission_1.Permission.findOne({
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
        const permission = new Permission_1.Permission({
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
    }
    catch (error) {
        console.error('Create permission error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create permission'
        });
    }
});
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
router.post('/bulk', (0, auth_1.authorize)('permission', 'manage'), (0, auth_1.auditLog)('create', 'permission'), async (req, res) => {
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
        const validationErrors = [];
        const validPermissions = [];
        for (let i = 0; i < permissions.length; i++) {
            const { error, value } = schemas_1.createPermissionSchema.validate(permissions[i]);
            if (error) {
                validationErrors.push(`Permission ${i + 1}: ${error.details[0].message}`);
            }
            else {
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
        const existingNames = await Permission_1.Permission.find({
            name: { $in: validPermissions.map(p => p.name) }
        }).distinct('name');
        const existingResourceActions = await Permission_1.Permission.find({
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
        const createdPermissions = await Permission_1.Permission.insertMany(validPermissions);
        res.status(201).json({
            success: true,
            message: `${createdPermissions.length} permissions created successfully`,
            data: createdPermissions
        });
    }
    catch (error) {
        console.error('Bulk create permissions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create permissions'
        });
    }
});
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
router.delete('/:id', (0, auth_1.authorize)('permission', 'manage'), (0, auth_1.auditLog)('delete', 'permission'), async (req, res) => {
    try {
        const { error, value } = schemas_1.objectIdSchema.validate(req.params.id);
        if (error) {
            res.status(400).json({
                success: false,
                message: 'Invalid permission ID'
            });
            return;
        }
        const permission = await Permission_1.Permission.findById(value);
        if (!permission) {
            res.status(404).json({
                success: false,
                message: 'Permission not found'
            });
            return;
        }
        // Check if permission is assigned to any roles
        const rolesCount = await Role_1.Role.countDocuments({
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
        await Permission_1.Permission.findByIdAndDelete(value);
        res.json({
            success: true,
            message: 'Permission deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete permission error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete permission'
        });
    }
});
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
router.get('/meta/resources', (0, auth_1.authorize)('permission', 'read'), async (req, res) => {
    try {
        const resources = await Permission_1.Permission.distinct('resource');
        res.json({
            success: true,
            data: resources.sort()
        });
    }
    catch (error) {
        console.error('Get resources error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch resources'
        });
    }
});
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
router.get('/meta/actions', (0, auth_1.authorize)('permission', 'read'), async (req, res) => {
    try {
        const actions = ['create', 'read', 'update', 'delete', 'manage'];
        res.json({
            success: true,
            data: actions
        });
    }
    catch (error) {
        console.error('Get actions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch actions'
        });
    }
});
exports.default = router;
//# sourceMappingURL=permissions.js.map