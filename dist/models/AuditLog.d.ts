import { Document, Model } from 'mongoose';
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
export declare const AuditLog: IAuditLogModel;
//# sourceMappingURL=AuditLog.d.ts.map