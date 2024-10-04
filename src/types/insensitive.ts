export type SensitiveString = string & { __brand: "SensitiveString" };

export type InsensitiveString = string & { __brand: "InsensitiveString" };

export type FieldsMap = Record<InsensitiveString, SensitiveString> & { __brand: "InsensitiveFieldsMap" };

export function insensitive(s: string): InsensitiveString {
    return s.toLowerCase() as InsensitiveString;
}