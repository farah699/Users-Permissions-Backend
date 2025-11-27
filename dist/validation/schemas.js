"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.objectIdSchema = exports.paginationSchema = exports.createPermissionSchema = exports.updateRoleSchema = exports.createRoleSchema = exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.refreshTokenSchema = exports.loginSchema = exports.changePasswordSchema = exports.updateUserSchema = exports.createUserSchema = void 0;
const joi_1 = __importDefault(require("joi"));
// User validation schemas
exports.createUserSchema = joi_1.default.object({
    email: joi_1.default.string()
        .email()
        .required()
        .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
    }),
    password: joi_1.default.string()
        .min(8)
        .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
        .required()
        .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        'any.required': 'Password is required'
    }),
    firstName: joi_1.default.string()
        .trim()
        .min(2)
        .max(50)
        .required()
        .messages({
        'string.min': 'First name must be at least 2 characters long',
        'string.max': 'First name cannot exceed 50 characters',
        'any.required': 'First name is required'
    }),
    lastName: joi_1.default.string()
        .trim()
        .min(2)
        .max(50)
        .required()
        .messages({
        'string.min': 'Last name must be at least 2 characters long',
        'string.max': 'Last name cannot exceed 50 characters',
        'any.required': 'Last name is required'
    }),
    roles: joi_1.default.array()
        .items(joi_1.default.string().hex().length(24))
        .optional()
        .messages({
        'array.base': 'Roles must be an array',
        'string.hex': 'Each role must be a valid ObjectId',
        'string.length': 'Each role must be a valid ObjectId'
    })
});
exports.updateUserSchema = joi_1.default.object({
    email: joi_1.default.string()
        .email()
        .optional()
        .messages({
        'string.email': 'Please provide a valid email address'
    }),
    firstName: joi_1.default.string()
        .trim()
        .min(2)
        .max(50)
        .optional()
        .messages({
        'string.min': 'First name must be at least 2 characters long',
        'string.max': 'First name cannot exceed 50 characters'
    }),
    lastName: joi_1.default.string()
        .trim()
        .min(2)
        .max(50)
        .optional()
        .messages({
        'string.min': 'Last name must be at least 2 characters long',
        'string.max': 'Last name cannot exceed 50 characters'
    }),
    roles: joi_1.default.array()
        .items(joi_1.default.string().hex().length(24))
        .optional()
        .messages({
        'array.base': 'Roles must be an array',
        'string.hex': 'Each role must be a valid ObjectId',
        'string.length': 'Each role must be a valid ObjectId'
    }),
    isActive: joi_1.default.boolean().optional()
});
exports.changePasswordSchema = joi_1.default.object({
    currentPassword: joi_1.default.string()
        .required()
        .messages({
        'any.required': 'Current password is required'
    }),
    newPassword: joi_1.default.string()
        .min(8)
        .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
        .required()
        .messages({
        'string.min': 'New password must be at least 8 characters long',
        'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        'any.required': 'New password is required'
    })
});
// Auth validation schemas
exports.loginSchema = joi_1.default.object({
    email: joi_1.default.string()
        .email()
        .required()
        .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
    }),
    password: joi_1.default.string()
        .required()
        .messages({
        'any.required': 'Password is required'
    })
});
exports.refreshTokenSchema = joi_1.default.object({
    refreshToken: joi_1.default.string()
        .required()
        .messages({
        'any.required': 'Refresh token is required'
    })
});
exports.forgotPasswordSchema = joi_1.default.object({
    email: joi_1.default.string()
        .email()
        .required()
        .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
    })
});
exports.resetPasswordSchema = joi_1.default.object({
    token: joi_1.default.string()
        .required()
        .messages({
        'any.required': 'Reset token is required'
    }),
    password: joi_1.default.string()
        .min(8)
        .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
        .required()
        .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        'any.required': 'Password is required'
    })
});
// Role validation schemas
exports.createRoleSchema = joi_1.default.object({
    name: joi_1.default.string()
        .trim()
        .min(2)
        .max(50)
        .required()
        .messages({
        'string.min': 'Role name must be at least 2 characters long',
        'string.max': 'Role name cannot exceed 50 characters',
        'any.required': 'Role name is required'
    }),
    description: joi_1.default.string()
        .trim()
        .max(500)
        .optional()
        .messages({
        'string.max': 'Description cannot exceed 500 characters'
    }),
    permissions: joi_1.default.array()
        .items(joi_1.default.string().hex().length(24))
        .optional()
        .messages({
        'array.base': 'Permissions must be an array',
        'string.hex': 'Each permission must be a valid ObjectId',
        'string.length': 'Each permission must be a valid ObjectId'
    })
});
exports.updateRoleSchema = joi_1.default.object({
    name: joi_1.default.string()
        .trim()
        .min(2)
        .max(50)
        .optional()
        .messages({
        'string.min': 'Role name must be at least 2 characters long',
        'string.max': 'Role name cannot exceed 50 characters'
    }),
    description: joi_1.default.string()
        .trim()
        .max(500)
        .optional()
        .allow('')
        .messages({
        'string.max': 'Description cannot exceed 500 characters'
    }),
    permissions: joi_1.default.array()
        .items(joi_1.default.string().hex().length(24))
        .optional()
        .messages({
        'array.base': 'Permissions must be an array',
        'string.hex': 'Each permission must be a valid ObjectId',
        'string.length': 'Each permission must be a valid ObjectId'
    }),
    isActive: joi_1.default.boolean().optional()
});
// Permission validation schemas
exports.createPermissionSchema = joi_1.default.object({
    name: joi_1.default.string()
        .trim()
        .min(2)
        .max(100)
        .required()
        .messages({
        'string.min': 'Permission name must be at least 2 characters long',
        'string.max': 'Permission name cannot exceed 100 characters',
        'any.required': 'Permission name is required'
    }),
    resource: joi_1.default.string()
        .trim()
        .lowercase()
        .min(2)
        .max(50)
        .required()
        .messages({
        'string.min': 'Resource name must be at least 2 characters long',
        'string.max': 'Resource name cannot exceed 50 characters',
        'any.required': 'Resource is required'
    }),
    action: joi_1.default.string()
        .valid('create', 'read', 'update', 'delete', 'manage')
        .required()
        .messages({
        'any.only': 'Action must be one of: create, read, update, delete, manage',
        'any.required': 'Action is required'
    }),
    description: joi_1.default.string()
        .trim()
        .max(500)
        .optional()
        .messages({
        'string.max': 'Description cannot exceed 500 characters'
    })
});
// Query validation schemas
exports.paginationSchema = joi_1.default.object({
    page: joi_1.default.number()
        .integer()
        .min(1)
        .default(1)
        .messages({
        'number.base': 'Page must be a number',
        'number.integer': 'Page must be an integer',
        'number.min': 'Page must be at least 1'
    }),
    limit: joi_1.default.number()
        .integer()
        .min(1)
        .max(100)
        .default(10)
        .messages({
        'number.base': 'Limit must be a number',
        'number.integer': 'Limit must be an integer',
        'number.min': 'Limit must be at least 1',
        'number.max': 'Limit cannot exceed 100'
    }),
    search: joi_1.default.string()
        .trim()
        .allow('')
        .optional()
        .messages({
        'string.base': 'Search must be a string'
    }),
    sortBy: joi_1.default.string()
        .optional()
        .messages({
        'string.base': 'Sort field must be a string'
    }),
    sortOrder: joi_1.default.string()
        .valid('asc', 'desc')
        .default('asc')
        .messages({
        'any.only': 'Sort order must be either "asc" or "desc"'
    }),
    isActive: joi_1.default.boolean()
        .optional()
        .messages({
        'boolean.base': 'isActive must be a boolean'
    })
}).unknown(true);
// ObjectId validation
exports.objectIdSchema = joi_1.default.string()
    .hex()
    .length(24)
    .required()
    .messages({
    'string.hex': 'Must be a valid ObjectId',
    'string.length': 'Must be a valid ObjectId',
    'any.required': 'ID is required'
});
//# sourceMappingURL=schemas.js.map