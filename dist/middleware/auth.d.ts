import { Request, Response, NextFunction } from 'express';
import { IUser } from '../models/User';
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
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const authorize: (resource: string, action: string) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const requireRoles: (roles: string[]) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const authorizeResourceOwnership: (resource: string) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const optionalAuth: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const auditLog: (action: string, resource: string) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=auth.d.ts.map