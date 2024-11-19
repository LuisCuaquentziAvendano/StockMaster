import { Request, Response, NextFunction } from 'express';
import { verify } from 'jsonwebtoken';
import { User } from '../models';
import { IUser, LoginJwtPayload } from '../types';
import { HTTP_STATUS_CODES } from '../utils/httpStatusCodes';
import { UserStatus } from '../utils/status';
import { isNativeType, NativeTypes } from '../utils/nativeTypes';
import { JWT_KEY } from '../utils/envVariables';

export function validateToken(req: Request, res: Response, next: NextFunction) {
    const prefix = 'Bearer ';
    const authorization = req.headers.authorization;
    let payload: LoginJwtPayload;
    if (
        !isNativeType(NativeTypes.STRING, authorization)
        || !authorization.startsWith(prefix)
    ) {
        res.sendStatus(HTTP_STATUS_CODES.UNAUTHORIZED);
        return;
    }
    const token = authorization.slice(prefix.length);
    try {
        payload = verify(token, JWT_KEY) as LoginJwtPayload;
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
            req._user = user;
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