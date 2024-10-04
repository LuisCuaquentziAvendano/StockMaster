import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/user';
import { IUser } from '../types/user';
import { LoginJwtPayload } from '../types/loginJwtPayload';
import { HTTP_STATUS_CODES } from '../types/httpStatusCodes';
import { UserStatus } from '../types/status';
import { isNativeType, NativeTypes } from '../types/nativeTypes';

function validateToken(req: Request, res: Response, next: NextFunction): void {
    const token = req.headers.authorization;
    const secretKey = process.env.JWT_KEY;
    let payload: LoginJwtPayload;
    if (!isNativeType(NativeTypes.STRING, token)) {
        res.sendStatus(HTTP_STATUS_CODES.UNAUTHORIZED);
        return;
    }
    try {
        payload = jwt.verify(token, secretKey) as LoginJwtPayload;
        User.findOne({
            _id: payload._id,
            status: UserStatus.ACTIVE,
            token
        }, {
            password: 0
        }).then((user: IUser) => {
            if (!user) {
                res.sendStatus(HTTP_STATUS_CODES.UNAUTHORIZED);
                throw new Error('');
            }
            req.user = user;
            next();
        }).catch((error: Error) => {
            if (error.message != '') {
                res.sendStatus(HTTP_STATUS_CODES.SERVER_ERROR);
            }
        });
    } catch {
        res.sendStatus(HTTP_STATUS_CODES.UNAUTHORIZED);
    }
}

export default validateToken;