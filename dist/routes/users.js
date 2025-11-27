"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const User_1 = require("../models/User");
const Role_1 = require("../models/Role");
const auth_1 = require("../middleware/auth");
const schemas_1 = require("../validation/schemas");
const router = express_1.default.Router();
// Apply authentication to all routes
router.use(auth_1.authenticate);
/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users with pagination and filtering
 *     tags: [Users]
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
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [firstName, lastName, email, createdAt]
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of users
 */
router.get('/', (0, auth_1.authorize)('user', 'read'), (0, auth_1.auditLog)('read', 'user'), async (req, res) => {
    try {
        const { error, value } = schemas_1.paginationSchema.validate(req.query);
        if (error) {
            console.error('Users validation error:', error.details[0].message);
            console.error('Query params:', req.query);
            res.status(400).json({
                success: false,
                message: error.details[0].message
            });
            return;
        }
        const { page, limit, search, sortBy, sortOrder, isActive } = value;
        // Build query
        const query = {};
        if (isActive !== undefined) {
            query.isActive = isActive;
        }
        if (search) {
            query.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        // Build sort
        const sort = {};
        if (sortBy) {
            sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
        }
        else {
            sort.createdAt = -1; // Default sort by creation date, newest first
        }
        // Execute query
        const skip = (page - 1) * limit;
        const [users, total] = await Promise.all([
            User_1.User.find(query)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .populate('roles', 'name description isActive'),
            User_1.User.countDocuments(query)
        ]);
        const totalPages = Math.ceil(total / limit);
        res.json({
            success: true,
            data: {
                users,
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
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users'
        });
    }
});
/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
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
 *         description: User details
 *       404:
 *         description: User not found
 */
router.get('/:id', (0, auth_1.authorizeResourceOwnership)('user'), (0, auth_1.auditLog)('read', 'user'), async (req, res) => {
    try {
        const { error, value } = schemas_1.objectIdSchema.validate(req.params.id);
        if (error) {
            res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
            return;
        }
        const user = await User_1.User.findById(value)
            .populate('roles', 'name description permissions isActive');
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found'
            });
            return;
        }
        res.json({
            success: true,
            data: user
        });
    }
    catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user'
        });
    }
});
/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserCreate'
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: User already exists
 */
router.post('/', (0, auth_1.authorize)('user', 'create'), (0, auth_1.auditLog)('create', 'user'), async (req, res) => {
    try {
        const { error, value } = schemas_1.createUserSchema.validate(req.body);
        if (error) {
            res.status(400).json({
                success: false,
                message: error.details[0].message
            });
            return;
        }
        const { email, password, firstName, lastName, roles } = value;
        // Check if user already exists
        const existingUser = await User_1.User.findOne({ email });
        if (existingUser) {
            res.status(409).json({
                success: false,
                message: 'User with this email already exists'
            });
            return;
        }
        // Validate roles if provided
        if (roles && roles.length > 0) {
            const validRoles = await Role_1.Role.find({ _id: { $in: roles }, isActive: true });
            if (validRoles.length !== roles.length) {
                res.status(400).json({
                    success: false,
                    message: 'One or more roles are invalid or inactive'
                });
                return;
            }
        }
        // Create user
        const user = new User_1.User({
            email,
            password,
            firstName,
            lastName,
            roles: roles || [],
            isEmailVerified: false // In a real app, you'd send verification email
        });
        await user.save();
        // Populate roles for response
        await user.populate('roles', 'name description isActive');
        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: user
        });
    }
    catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create user'
        });
    }
});
/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user
 *     tags: [Users]
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
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               roles:
 *                 type: array
 *                 items:
 *                   type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated successfully
 *       404:
 *         description: User not found
 */
router.put('/:id', (0, auth_1.authorizeResourceOwnership)('user'), (0, auth_1.auditLog)('update', 'user'), async (req, res) => {
    try {
        const { error: idError, value: userId } = schemas_1.objectIdSchema.validate(req.params.id);
        if (idError) {
            res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
            return;
        }
        const { error: bodyError, value } = schemas_1.updateUserSchema.validate(req.body);
        if (bodyError) {
            res.status(400).json({
                success: false,
                message: bodyError.details[0].message
            });
            return;
        }
        const user = await User_1.User.findById(userId);
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found'
            });
            return;
        }
        // Store original values for audit
        const originalValues = {};
        const changes = {};
        // Check if email is being changed and if it's unique
        if (value.email && value.email !== user.email) {
            const existingUser = await User_1.User.findOne({
                email: value.email,
                _id: { $ne: userId }
            });
            if (existingUser) {
                res.status(409).json({
                    success: false,
                    message: 'Email already in use by another user'
                });
                return;
            }
            originalValues.email = user.email;
            changes.email = { from: user.email, to: value.email };
        }
        // Validate roles if provided
        if (value.roles) {
            const validRoles = await Role_1.Role.find({
                _id: { $in: value.roles },
                isActive: true
            });
            if (validRoles.length !== value.roles.length) {
                res.status(400).json({
                    success: false,
                    message: 'One or more roles are invalid or inactive'
                });
                return;
            }
            originalValues.roles = user.roles;
            changes.roles = { from: user.roles, to: value.roles };
        }
        // Track other changes
        ['firstName', 'lastName', 'isActive'].forEach(field => {
            if (value[field] !== undefined && value[field] !== user[field]) {
                originalValues[field] = user[field];
                changes[field] = { from: user[field], to: value[field] };
            }
        });
        // Update user
        Object.assign(user, value);
        await user.save();
        // Populate roles for response
        await user.populate('roles', 'name description isActive');
        res.json({
            success: true,
            message: 'User updated successfully',
            data: user
        });
    }
    catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user'
        });
    }
});
/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete user (soft delete - deactivate)
 *     tags: [Users]
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
 *         description: User deactivated successfully
 *       404:
 *         description: User not found
 */
router.delete('/:id', (0, auth_1.authorize)('user', 'delete'), (0, auth_1.auditLog)('delete', 'user'), async (req, res) => {
    try {
        const { error, value } = schemas_1.objectIdSchema.validate(req.params.id);
        if (error) {
            res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
            return;
        }
        const user = await User_1.User.findById(value);
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found'
            });
            return;
        }
        // Prevent self-deletion
        if (req.user && user._id.equals(req.user._id)) {
            res.status(400).json({
                success: false,
                message: 'Cannot delete your own account'
            });
            return;
        }
        // Soft delete - deactivate user
        user.isActive = false;
        user.refreshTokens = []; // Clear all sessions
        await user.save();
        res.json({
            success: true,
            message: 'User deactivated successfully'
        });
    }
    catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete user'
        });
    }
});
/**
 * @swagger
 * /api/users/{id}/activate:
 *   patch:
 *     summary: Activate user
 *     tags: [Users]
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
 *         description: User activated successfully
 */
router.patch('/:id/activate', (0, auth_1.authorize)('user', 'update'), (0, auth_1.auditLog)('update', 'user'), async (req, res) => {
    try {
        const { error, value } = schemas_1.objectIdSchema.validate(req.params.id);
        if (error) {
            res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
            return;
        }
        const user = await User_1.User.findByIdAndUpdate(value, { isActive: true }, { new: true }).populate('roles', 'name description isActive');
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found'
            });
            return;
        }
        res.json({
            success: true,
            message: 'User activated successfully',
            data: user
        });
    }
    catch (error) {
        console.error('Activate user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to activate user'
        });
    }
});
/**
 * @swagger
 * /api/users/{id}/roles:
 *   put:
 *     summary: Update user roles
 *     tags: [Users]
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
 *               - roles
 *             properties:
 *               roles:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: User roles updated successfully
 */
router.put('/:id/roles', (0, auth_1.authorize)('user', 'update'), (0, auth_1.auditLog)('assign_role', 'user'), async (req, res) => {
    try {
        const { error: idError, value: userId } = schemas_1.objectIdSchema.validate(req.params.id);
        if (idError) {
            res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
            return;
        }
        const rolesValidation = schemas_1.updateUserSchema.extract('roles').validate(req.body.roles);
        if (rolesValidation.error) {
            res.status(400).json({
                success: false,
                message: rolesValidation.error.details[0].message
            });
            return;
        }
        const { roles } = req.body;
        const user = await User_1.User.findById(userId);
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found'
            });
            return;
        }
        // Validate roles
        if (roles && roles.length > 0) {
            const validRoles = await Role_1.Role.find({
                _id: { $in: roles },
                isActive: true
            });
            if (validRoles.length !== roles.length) {
                res.status(400).json({
                    success: false,
                    message: 'One or more roles are invalid or inactive'
                });
                return;
            }
        }
        // Store old roles for audit
        const oldRoles = user.roles;
        // Update roles
        user.roles = roles || [];
        await user.save();
        // Populate roles for response
        await user.populate('roles', 'name description isActive');
        res.json({
            success: true,
            message: 'User roles updated successfully',
            data: user
        });
    }
    catch (error) {
        console.error('Update user roles error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user roles'
        });
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map