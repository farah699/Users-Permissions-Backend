"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Role_1 = require("../models/Role");
const Permission_1 = require("../models/Permission");
const User_1 = require("../models/User");
const auth_1 = require("../middleware/auth");
const schemas_1 = require("../validation/schemas");
const router = express_1.default.Router();
// Apply authentication to all routes
router.use(auth_1.authenticate);
/**
 * @swagger
 * /api/roles:
 *   get:
 *     summary: Get all roles with pagination and filtering
 *     tags: [Roles]
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
 *         name: isActive
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of roles
 */
router.get('/', (0, auth_1.authorize)('role', 'read'), (0, auth_1.auditLog)('read', 'role'), async (req, res) => {
    try {
        const { error, value } = schemas_1.paginationSchema.validate(req.query);
        if (error) {
            res.status(400).json({
                success: false,
                message: error.details[0].message
            });
            return;
        }
        const { page, limit, search, isActive } = value;
        // Build query
        const query = {};
        if (isActive !== undefined) {
            query.isActive = isActive;
        }
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        // Execute query
        const skip = (page - 1) * limit;
        const [roles, total] = await Promise.all([
            Role_1.Role.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('permissions', 'name resource action description')
                .populate('userCount'),
            Role_1.Role.countDocuments(query)
        ]);
        const totalPages = Math.ceil(total / limit);
        res.json({
            success: true,
            data: {
                roles,
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
        console.error('Get roles error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch roles'
        });
    }
});
/**
 * @swagger
 * /api/roles/{id}:
 *   get:
 *     summary: Get role by ID
 *     tags: [Roles]
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
 *         description: Role details
 *       404:
 *         description: Role not found
 */
router.get('/:id', (0, auth_1.authorize)('role', 'read'), (0, auth_1.auditLog)('read', 'role'), async (req, res) => {
    try {
        const { error, value } = schemas_1.objectIdSchema.validate(req.params.id);
        if (error) {
            res.status(400).json({
                success: false,
                message: 'Invalid role ID'
            });
            return;
        }
        const role = await Role_1.Role.findById(value)
            .populate('permissions', 'name resource action description')
            .populate('userCount');
        if (!role) {
            res.status(404).json({
                success: false,
                message: 'Role not found'
            });
            return;
        }
        res.json({
            success: true,
            data: role
        });
    }
    catch (error) {
        console.error('Get role error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch role'
        });
    }
});
/**
 * @swagger
 * /api/roles:
 *   post:
 *     summary: Create a new role
 *     tags: [Roles]
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
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Role created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Role already exists
 */
router.post('/', (0, auth_1.authorize)('role', 'create'), (0, auth_1.auditLog)('create', 'role'), async (req, res) => {
    try {
        const { error, value } = schemas_1.createRoleSchema.validate(req.body);
        if (error) {
            res.status(400).json({
                success: false,
                message: error.details[0].message
            });
            return;
        }
        const { name, description, permissions } = value;
        // Check if role already exists
        const existingRole = await Role_1.Role.findOne({ name });
        if (existingRole) {
            res.status(409).json({
                success: false,
                message: 'Role with this name already exists'
            });
            return;
        }
        // Validate permissions if provided
        if (permissions && permissions.length > 0) {
            const validPermissions = await Permission_1.Permission.find({
                _id: { $in: permissions }
            });
            if (validPermissions.length !== permissions.length) {
                res.status(400).json({
                    success: false,
                    message: 'One or more permissions are invalid'
                });
                return;
            }
        }
        // Create role
        const role = new Role_1.Role({
            name,
            description,
            permissions: permissions || []
        });
        await role.save();
        // Populate permissions for response
        await role.populate('permissions', 'name resource action description');
        res.status(201).json({
            success: true,
            message: 'Role created successfully',
            data: role
        });
    }
    catch (error) {
        console.error('Create role error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create role'
        });
    }
});
/**
 * @swagger
 * /api/roles/{id}:
 *   put:
 *     summary: Update role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Role updated successfully
 *       404:
 *         description: Role not found
 */
router.put('/:id', (0, auth_1.authorize)('role', 'update'), (0, auth_1.auditLog)('update', 'role'), async (req, res) => {
    try {
        const { error: idError, value: roleId } = schemas_1.objectIdSchema.validate(req.params.id);
        if (idError) {
            res.status(400).json({
                success: false,
                message: 'Invalid role ID'
            });
            return;
        }
        const { error: bodyError, value } = schemas_1.updateRoleSchema.validate(req.body);
        if (bodyError) {
            res.status(400).json({
                success: false,
                message: bodyError.details[0].message
            });
            return;
        }
        const role = await Role_1.Role.findById(roleId);
        if (!role) {
            res.status(404).json({
                success: false,
                message: 'Role not found'
            });
            return;
        }
        // Check if name is being changed and if it's unique
        if (value.name && value.name !== role.name) {
            const existingRole = await Role_1.Role.findOne({
                name: value.name,
                _id: { $ne: roleId }
            });
            if (existingRole) {
                res.status(409).json({
                    success: false,
                    message: 'Role name already in use'
                });
                return;
            }
        }
        // Validate permissions if provided
        if (value.permissions) {
            const validPermissions = await Permission_1.Permission.find({
                _id: { $in: value.permissions }
            });
            if (validPermissions.length !== value.permissions.length) {
                res.status(400).json({
                    success: false,
                    message: 'One or more permissions are invalid'
                });
                return;
            }
        }
        // Update role
        Object.assign(role, value);
        await role.save();
        // Populate permissions for response
        await role.populate('permissions', 'name resource action description');
        res.json({
            success: true,
            message: 'Role updated successfully',
            data: role
        });
    }
    catch (error) {
        console.error('Update role error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update role'
        });
    }
});
/**
 * @swagger
 * /api/roles/{id}:
 *   delete:
 *     summary: Delete role (soft delete - deactivate)
 *     tags: [Roles]
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
 *         description: Role deactivated successfully
 *       404:
 *         description: Role not found
 *       400:
 *         description: Cannot delete role with assigned users
 */
router.delete('/:id', (0, auth_1.authorize)('role', 'delete'), (0, auth_1.auditLog)('delete', 'role'), async (req, res) => {
    try {
        const { error, value } = schemas_1.objectIdSchema.validate(req.params.id);
        if (error) {
            res.status(400).json({
                success: false,
                message: 'Invalid role ID'
            });
            return;
        }
        const role = await Role_1.Role.findById(value);
        if (!role) {
            res.status(404).json({
                success: false,
                message: 'Role not found'
            });
            return;
        }
        // Check if role is assigned to any users
        const userCount = await User_1.User.countDocuments({
            roles: value,
            isActive: true
        });
        if (userCount > 0) {
            res.status(400).json({
                success: false,
                message: `Cannot delete role. It is assigned to ${userCount} active user(s)`
            });
            return;
        }
        // Soft delete - deactivate role
        role.isActive = false;
        await role.save();
        res.json({
            success: true,
            message: 'Role deactivated successfully'
        });
    }
    catch (error) {
        console.error('Delete role error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete role'
        });
    }
});
/**
 * @swagger
 * /api/roles/{id}/permissions:
 *   put:
 *     summary: Update role permissions
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
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
 *                   type: string
 *     responses:
 *       200:
 *         description: Role permissions updated successfully
 */
router.put('/:id/permissions', (0, auth_1.authorize)('role', 'update'), (0, auth_1.auditLog)('permission_change', 'role'), async (req, res) => {
    try {
        const { error: idError, value: roleId } = schemas_1.objectIdSchema.validate(req.params.id);
        if (idError) {
            res.status(400).json({
                success: false,
                message: 'Invalid role ID'
            });
            return;
        }
        const permissionsValidation = schemas_1.updateRoleSchema.extract('permissions').validate(req.body.permissions);
        if (permissionsValidation.error) {
            res.status(400).json({
                success: false,
                message: permissionsValidation.error.details[0].message
            });
            return;
        }
        const { permissions } = req.body;
        const role = await Role_1.Role.findById(roleId);
        if (!role) {
            res.status(404).json({
                success: false,
                message: 'Role not found'
            });
            return;
        }
        // Validate permissions
        if (permissions && permissions.length > 0) {
            const validPermissions = await Permission_1.Permission.find({
                _id: { $in: permissions }
            });
            if (validPermissions.length !== permissions.length) {
                res.status(400).json({
                    success: false,
                    message: 'One or more permissions are invalid'
                });
                return;
            }
        }
        // Store old permissions for audit
        const oldPermissions = role.permissions;
        // Update permissions
        role.permissions = permissions || [];
        await role.save();
        // Populate permissions for response
        await role.populate('permissions', 'name resource action description');
        res.json({
            success: true,
            message: 'Role permissions updated successfully',
            data: role
        });
    }
    catch (error) {
        console.error('Update role permissions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update role permissions'
        });
    }
});
/**
 * @swagger
 * /api/roles/{id}/users:
 *   get:
 *     summary: Get users assigned to role
 *     tags: [Roles]
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
 *         description: List of users with this role
 */
router.get('/:id/users', (0, auth_1.authorize)('role', 'read'), async (req, res) => {
    try {
        const { error, value } = schemas_1.objectIdSchema.validate(req.params.id);
        if (error) {
            res.status(400).json({
                success: false,
                message: 'Invalid role ID'
            });
            return;
        }
        const role = await Role_1.Role.findById(value);
        if (!role) {
            res.status(404).json({
                success: false,
                message: 'Role not found'
            });
            return;
        }
        const users = await User_1.User.find({ roles: value })
            .select('firstName lastName email isActive createdAt')
            .sort({ firstName: 1 });
        res.json({
            success: true,
            data: {
                role: {
                    _id: role._id,
                    name: role.name,
                    description: role.description
                },
                users,
                userCount: users.length
            }
        });
    }
    catch (error) {
        console.error('Get role users error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch role users'
        });
    }
});
exports.default = router;
//# sourceMappingURL=roles.js.map