import { Request, Response, NextFunction } from 'express';
import { UserRoles } from '../types/user';
import { HTTP_STATUS_CODES } from '../types/httpStatusCodes';

type RoleFunction = (req: Request, res: Response, next: NextFunction) => void;
function validateRole(roles: UserRoles[]): RoleFunction {
    return function (req: Request, res: Response, next: NextFunction): void {
        const user = req.user;
        const inventory = req.inventory;
        const assignedRole = inventory.roles.find(ar => user._id == ar.user);
        if (!assignedRole) {
            res.sendStatus(HTTP_STATUS_CODES.NOT_FOUND);
            return;
        }
        if (!roles.includes(assignedRole.role)) {
            res.sendStatus(HTTP_STATUS_CODES.FORBIDDEN);
            return;
        }
        next();
    };
}

export default validateRole;