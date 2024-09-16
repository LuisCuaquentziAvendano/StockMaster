import { Request, Response, NextFunction } from 'express';

type RoleFunction = (req: Request, res: Response, next: NextFunction) => void;
function validateRole(roles: string[]): RoleFunction {
    return function (req: Request, res: Response, next: NextFunction): void {
        // 
    };
}

export default validateRole;