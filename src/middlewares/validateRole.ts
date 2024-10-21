import { Request, Response, NextFunction } from 'express';
import { UserRoles } from '../utils/roles';
import { HTTP_STATUS_CODES } from '../utils/httpStatusCodes';

type RoleFunction = (req: Request, res: Response, next: NextFunction) => void;

export function validateRole(roles: UserRoles[]): RoleFunction {
    return function (req: Request, res: Response, next: NextFunction): void {
        const user = req.user;
        const inventory = req.inventory;
        const assignedRole = inventory.roles.find(role => role.user.toString() == user._id.toString());
        if (
            !assignedRole
            || !roles.includes(assignedRole.role)
        ) {
            res.sendStatus(HTTP_STATUS_CODES.FORBIDDEN);
            return;
        }
        req.user.role = assignedRole.role;
        next();
    };
}