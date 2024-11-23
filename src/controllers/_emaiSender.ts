import nodemailer from 'nodemailer';
import { EMAIL_HOST, EMAIL_PASSWORD, EMAIL_PORT, EMAIL_USER } from '../utils/envVariables';

export class EmailSender {
    private static readonly transporter = nodemailer.createTransport({
        host: EMAIL_HOST,
        port: Number(EMAIL_PORT),
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASSWORD,
        },
    });

    static async sendEmail(to: string, subject: string, html: string, text: string): Promise<boolean> {
        const mailOptions = {
            from: EMAIL_USER,
            to,
            subject,
            text,
            html
        };
        return EmailSender.transporter.sendMail(mailOptions).then(() => {
            return true;
        }).catch(() => {
            return false;
        });
    }
}