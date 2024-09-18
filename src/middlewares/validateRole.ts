import { Request, Response, NextFunction } from 'express';
import { UserRoles } from '../utils/roles';

type RoleFunction = (req: Request, res: Response, next: NextFunction) => void;
function validateRole(roles: UserRoles[]): RoleFunction {
    return function (req: Request, res: Response, next: NextFunction): void {
        // 
    };
}

export default validateRole;