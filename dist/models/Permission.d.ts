import mongoose, { Document } from 'mongoose';
/**
 * @swagger
 * components:
 *   schemas:
 *     Permission:
 *       type: object
 *       required:
 *         - name
 *         - resource
 *         - action
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated permission ID
 *         name:
 *           type: string
 *           description: Human-readable permission name
 *           example: "Read Users"
 *         resource:
 *           type: string
 *           description: Resource the permission applies to
 *           example: "user"
 *         action:
 *           type: string
 *           description: Action that can be performed
 *           example: "read"
 *         description:
 *           type: string
 *           description: Optional permission description
 *           example: "Allows viewing user information"
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
export interface IPermission extends Document {
    name: string;
    resource: string;
    action: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Permission: mongoose.Model<IPermission, {}, {}, {}, mongoose.Document<unknown, {}, IPermission, {}, {}> & IPermission & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Permission.d.ts.map