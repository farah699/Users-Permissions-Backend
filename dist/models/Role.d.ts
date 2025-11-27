import mongoose, { Document } from 'mongoose';
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
export declare const Role: mongoose.Model<IRole, {}, {}, {}, mongoose.Document<unknown, {}, IRole, {}, {}> & IRole & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Role.d.ts.map