import { Express } from 'express';
import session from 'express-session';
import passport, { Profile } from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { GOOGLE_ID, GOOGLE_SECRET, API_URL, SECRET_KEY } from '../utils/envVariables';

export const googleAuth = (app: Express) => {
    passport.use(
        new GoogleStrategy(
            {
                clientID: GOOGLE_ID,
                clientSecret: GOOGLE_SECRET,
                callbackURL: `${API_URL}/api/users/googleRegister`
            },
            (accessToken: string, refreshToken: string, profile: Profile, cb) => {
                return cb(null, profile);
            }
        )
    );

    passport.serializeUser((user, cb) => {
        cb(null, user);
    });

    passport.deserializeUser((user, cb) => {
        cb(null, user);
    });

    app.use(session({
        resave: false,
        saveUninitialized: true,
        secret: SECRET_KEY
    }));

    app.use(passport.initialize());
    app.use(passport.session());
}