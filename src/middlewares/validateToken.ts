import { Request, Response, NextFunction } from 'express';

function validateToken(req: Request, res: Response, next: NextFunction): void {
    // user exists and is verified
}

export default validateToken;