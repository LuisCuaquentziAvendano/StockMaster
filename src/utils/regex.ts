import Operators from "./queryOperators";

const STR = /'[^']*'/;
const FIELD = /[a-z][a-z0-9_]*/;
const INT = /-?\d+/;
const FLOAT = /-?\d+(\.\d+)?/;
const SPACE = /\s+/;
const QUERY = new RegExp(`${STR.source}|${FIELD.source}|${FLOAT.source}|${Object.keys(Operators.ALL).map(k => k).join('|')}|${Operators.TRUE}|${Operators.FALSE}|${Operators.NULL}|\\${Operators.OPEN_PAREN}|\\${Operators.CLOSE_PAREN}|.`
                                .replace(/\|[\+\*\/]\|/g, x => `|\\${x[1]}|`), 'gi');

function isType(regex: RegExp, s: string): boolean {
    return (new RegExp('^' + regex.source + '$', 'i')).test(s);
}

function getTokens(s: string): string[] {
    return s.match(QUERY);
}

function formatMongoString(s: string): string {
    let newString = s.slice(1, -1)
        .replace(new RegExp(/[\\"]/, 'g'), x => `\\${x}`);
    if (newString[0] == "$")
        newString = '\\$' + newString.slice(1, -1);
    return newString;
}

export default {
    STR,
    FIELD,
    INT,
    FLOAT,
    SPACE,
    isType,
    getTokens,
    formatMongoString
}