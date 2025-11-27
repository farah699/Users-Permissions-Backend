import express, { Request, Response } from 'express';
import { AuditLog } from '../models/AuditLog';
import { authenticate, authorize } from '../middleware/auth';
import { paginationSchema, objectIdSchema } from '../validation/schemas';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * @swagger
 * /api/audit:
 *   get:
 *     summary: Get audit logs with pagination and filtering
 *     tags: [Audit]
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
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *           enum: [create, read, update, delete, login, logout, assign_role, remove_role, permission_change]
 *       - in: query
 *         name: resource
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: List of audit logs
 */
router.get(
  '/',
  authorize('audit', 'read'),
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

      const { page, limit } = value;
      const { userId, action, resource, startDate, endDate } = req.query;

      // Build query
      const query: any = {};

      if (userId) {
        const userIdValidation = objectIdSchema.validate(userId);
        if (userIdValidation.error) {
          res.status(400).json({
            success: false,
            message: 'Invalid user ID'
          });
          return;
        }
        query.userId = userId;
      }

      if (action) {
        query.action = action;
      }

      if (resource) {
        query.resource = resource;
      }

      // Date range filtering
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) {
          const start = new Date(startDate as string);
          if (isNaN(start.getTime())) {
            res.status(400).json({
              success: false,
              message: 'Invalid start date format'
            });
            return;
          }
          query.createdAt.$gte = start;
        }
        if (endDate) {
          const end = new Date(endDate as string);
          if (isNaN(end.getTime())) {
            res.status(400).json({
              success: false,
              message: 'Invalid end date format'
            });
            return;
          }
          // Set end time to end of day
          end.setHours(23, 59, 59, 999);
          query.createdAt.$lte = end;
        }
      }

      // Execute query
      const skip = (page - 1) * limit;

      const [auditLogs, total] = await Promise.all([
        AuditLog.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('userId', 'firstName lastName email')
          .lean(),
        AuditLog.countDocuments(query)
      ]);

      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: {
          auditLogs,
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
      console.error('Get audit logs error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch audit logs'
      });
    }
  }
);

/**
 * @swagger
 * /api/audit/recent:
 *   get:
 *     summary: Get recent audit activity
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *     responses:
 *       200:
 *         description: Recent audit activity
 */
router.get(
  '/recent',
  authorize('audit', 'read'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

      const auditLogs = await (AuditLog as any).getRecentActivity(limit);

      res.json({
        success: true,
        data: auditLogs
      });
    } catch (error) {
      console.error('Get recent audit logs error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch recent audit logs'
      });
    }
  }
);

/**
 * @swagger
 * /api/audit/user/{userId}:
 *   get:
 *     summary: Get audit logs for specific user
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *     responses:
 *       200:
 *         description: User audit activity
 */
router.get(
  '/user/:userId',
  authorize('audit', 'read'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { error, value } = objectIdSchema.validate(req.params.userId);
      if (error) {
        res.status(400).json({
          success: false,
          message: 'Invalid user ID'
        });
        return;
      }

      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

      const auditLogs = await (AuditLog as any).getUserActivity(value, limit);

      res.json({
        success: true,
        data: auditLogs
      });
    } catch (error) {
      console.error('Get user audit logs error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user audit logs'
      });
    }
  }
);

/**
 * @swagger
 * /api/audit/stats:
 *   get:
 *     summary: Get audit statistics
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 365
 *           default: 30
 *     responses:
 *       200:
 *         description: Audit statistics
 */
router.get(
  '/stats',
  authorize('audit', 'read'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const days = Math.min(parseInt(req.query.days as string) || 30, 365);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get activity stats
      const [
        totalActivities,
        activityByAction,
        activityByResource,
        activityByDay,
        topUsers
      ] = await Promise.all([
        // Total activities in period
        AuditLog.countDocuments({
          createdAt: { $gte: startDate }
        }),

        // Activity by action
        AuditLog.aggregate([
          { $match: { createdAt: { $gte: startDate } } },
          { $group: { _id: '$action', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]),

        // Activity by resource
        AuditLog.aggregate([
          { $match: { createdAt: { $gte: startDate } } },
          { $group: { _id: '$resource', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]),

        // Activity by day
        AuditLog.aggregate([
          { $match: { createdAt: { $gte: startDate } } },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
              },
              count: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } }
        ]),

        // Top active users
        AuditLog.aggregate([
          { $match: { createdAt: { $gte: startDate } } },
          { $group: { _id: '$userId', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: 'users',
              localField: '_id',
              foreignField: '_id',
              as: 'user'
            }
          },
          { $unwind: '$user' },
          {
            $project: {
              _id: 1,
              count: 1,
              'user.firstName': 1,
              'user.lastName': 1,
              'user.email': 1
            }
          }
        ])
      ]);

      res.json({
        success: true,
        data: {
          period: {
            days,
            startDate,
            endDate: new Date()
          },
          totalActivities,
          activityByAction,
          activityByResource,
          activityByDay,
          topUsers
        }
      });
    } catch (error) {
      console.error('Get audit stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch audit statistics'
      });
    }
  }
);

export default router;