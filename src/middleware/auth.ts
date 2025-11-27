import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { AuditLog } from '../models/AuditLog';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

export interface JWTPayload {
  id: string;
  email: string;
  roles: string[];
  iat: number;
  exp: number;
}

// Middleware to protect routes - requires valid JWT token
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Access token required' });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as JWTPayload;
      
      // Get user from database
      const user = await User.findById(decoded.id);
      
      if (!user || !user.isActive) {
        res.status(401).json({ message: 'User not found or inactive' });
        return;
      }

      req.user = user;
      next();
    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        res.status(401).json({ message: 'Token expired' });
        return;
      } else if (jwtError instanceof jwt.JsonWebTokenError) {
        res.status(401).json({ message: 'Invalid token' });
        return;
      }
      throw jwtError;
    }
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ message: 'Authentication failed' });
  }
};

// Middleware to check if user has required permission
export const authorize = (resource: string, action: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const hasPermission = await req.user.hasPermission(resource, action);

      if (!hasPermission) {
        // Log unauthorized access attempt
        await AuditLog.createLog({
          action: 'read',
          resource: 'unauthorized_access',
          resourceId: req.path,
          userId: req.user._id,
          userEmail: req.user.email,
          metadata: {
            requiredResource: resource,
            requiredAction: action,
            path: req.path,
            method: req.method
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });

        res.status(403).json({ 
          message: 'Insufficient permissions',
          required: { resource, action }
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({ message: 'Authorization check failed' });
    }
  };
};

// Middleware to check if user has any of the specified roles
export const requireRoles = (roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      await req.user.populate('roles');

      const userRoleNames = req.user.roles.map((role: any) => role.name);
      const hasRequiredRole = roles.some(role => userRoleNames.includes(role));

      if (!hasRequiredRole) {
        res.status(403).json({ 
          message: 'Insufficient role permissions',
          required: roles,
          userRoles: userRoleNames
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Role authorization error:', error);
      res.status(500).json({ message: 'Role authorization check failed' });
    }
  };
};

// Middleware to allow access only to own resources or if user has manage permission
export const authorizeResourceOwnership = (resource: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const resourceId = req.params.id || req.params.userId;
      
      // Check if user is accessing their own resource
      if (resourceId === req.user._id.toString()) {
        return next();
      }

      // Check if user has manage permission for the resource
      const hasManagePermission = await req.user.hasPermission(resource, 'manage');
      
      if (!hasManagePermission) {
        res.status(403).json({ 
          message: 'Can only access your own resources or need manage permission',
          resource 
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Resource ownership authorization error:', error);
      res.status(500).json({ message: 'Resource ownership check failed' });
    }
  };
};

// Optional middleware - allows access without token but populates user if token is present
export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as JWTPayload;
      const user = await User.findById(decoded.id);
      
      if (user && user.isActive) {
        req.user = user;
      }
    } catch (jwtError) {
      // Silently fail for optional auth
    }

    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
};

// Middleware to create audit log for requests
export const auditLog = (action: string, resource: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Store original res.json to capture response
      const originalJson = res.json;
      
      res.json = function(data: any) {
        // Create audit log after successful response
        if (req.user && res.statusCode < 400) {
          const resourceId = req.params.id || req.params.userId || req.body.id || 'unknown';
          
          AuditLog.createLog({
            action: action as any,
            resource,
            resourceId,
            userId: req.user._id,
            userEmail: req.user.email,
            metadata: {
              method: req.method,
              path: req.path,
              statusCode: res.statusCode,
              responseData: action === 'read' ? undefined : data // Don't log read responses to save space
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
          });
        }
        
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Audit log middleware error:', error);
      next();
    }
  };
};