export enum Regex {
    STRING = '`([^`]*)`',
    INTEGER = '-?\\d+',
    FLOAT = '-?\\d+(\\.\\d+)?',
    SPACE = '\\s+',
    USER_NAME = '[a-zñáéíóú ]+',
    USER_PASSWORD = '[a-z0-9!@#\\$%\\^&\\*\\(\\)-_=\\+\\[\\]\\{\\}\\|;:\'",\\.<>\\?\\/\\\\]{8,}',
    INVENTORY_FIELD = '[a-z_][a-z0-9_]*',
    INVENTORY_NAME = '[a-zñáéíóú 0-9_]+',
    DATETIME = '\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\.\\d{3}Z'
}

export function isType(regex: Regex, s: string): boolean {
    return (new RegExp('^' + regex + '$', 'i')).test(s);
}

export function scapeMongoChars(s: string): string {
    return s.replace(new RegExp(/^\$/), '\\$');
}

export function scapeRegexChars(s: string): string {
    return s.replace(new RegExp(/[\$\(\)\+\*\[\]\^\{\}\.\?\\]/g), match => '\\' + match);
}