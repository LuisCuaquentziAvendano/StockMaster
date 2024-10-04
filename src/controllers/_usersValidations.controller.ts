import { isNativeType, NativeTypes } from "../types/nativeTypes";
import { isType, Regex } from "../types/regex";
import { isEmail } from "validator";

export class UsersValidations {
    static _name(name: any): boolean {
        return isNativeType(NativeTypes.STRING, name)
            && isType(Regex.USER_NAME, name);
    }

    static email(email: any): boolean {
        return isNativeType(NativeTypes.STRING, email)
            && isEmail(email);
    }

    static password(password: any): boolean {
        return isNativeType(NativeTypes.STRING, password)
            && isType(Regex.USER_PASSWORD, password);
    }
}