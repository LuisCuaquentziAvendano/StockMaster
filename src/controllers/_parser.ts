import { Operators, Operators2 } from '../utils/queryOperators';
import { InventoryFields, FIELDS, FieldsMap, insensitive, InsensitiveString } from '../types';
import { Tokens, inventoryTypeToToken } from '../utils/inventoryDataTypes';
import { Regex, isType, scapeRegexChars } from '../utils/regex';

const MONGO_OPERS: Record<string, (a: any, b?: any) => any> = Object.freeze({
    [Operators.SUM]: (a: any, b: any) => ({ $add: [a, b] }),
    [Operators.SUBTRACTION]: (a: any, b: any) => ({ $subtract: [a, b] }),
    [Operators.MULTIPLICATION]: (a: any, b: any) => ({ $multiply: [a, b] }),
    [Operators.DIVISION]: (a: any, b: any) => ({ $divide: [a, b] }),
    [Operators.MODULUS]: (a: any, b: any) => ({ $mod: [a, b] }),
    [Operators.EQUALS]: (a: any, b: any) => ({ $eq: [a, b] }),
    [Operators.NOT_EQUALS]: (a: any, b: any) => ({ $ne: [a, b] }),
    [Operators.LESS_THAN]: (a: any, b: any) => ({ $lt: [a, b] }),
    [Operators.GREATER_THAN]: (a: any, b: any) => ({ $gt: [a, b] }),
    [Operators.LESS_THAN_EQUAL]: (a: any, b: any) => ({ $lte: [a, b] }),
    [Operators.GREATER_THAN_EQUAL]: (a: any, b: any) => ({ $gte: [a, b] }),
    [Operators.LIKE]: (a: any, b: any) => ({ '$regexMatch': { 'input': a, 'regex': b, 'options': 'i' } }),
    [Operators.INCLUDES]: (a: any, b: any) => ({ $in: [b, a] }),
    [Operators.NOT]: (a: any, b: any) => ({ $not: a }),
    [Operators.AND]: (a: any, b: any) => ({ $and: [a, b] }),
    [Operators.OR]: (a: any, b: any) => ({ $or: [a, b] }),
    [Operators.AND_SPECIAL]: (a: any, b: any) => ({ $and: [a, b] })
});

function formatNumberField(field: string): any {
    return { $toDouble: field };
}

function formatStringValue(s: string): any {
    return { $literal: s };
}

function formatField(field: string) {
    return `$${FIELDS}.${field}`;
}

function formatField2(field: string) {
    return { '$getField': { 'field': field, 'input': `$${FIELDS}` } };
}

export class Parser {
    static evalQuery(expression: string, fields: InventoryFields, map: FieldsMap): [boolean, any] {
        if (expression == '' || isType(Regex.SPACE, expression)) {
            return [true, {}];
        }
        const QUERY = new RegExp(`${Regex.STRING}|${Regex.INVENTORY_FIELD}|${Regex.FLOAT}|${scapeRegexChars(Operators.OPEN_PAREN)}|${scapeRegexChars(Operators.CLOSE_PAREN)}|${Object.keys(Operators2.ALL).map(k => scapeRegexChars(k)).join('|')}|${Tokens.TRUE}|${Tokens.FALSE}|${Tokens.NULL}|.`, 'gi');
        let tokens: Array<[Tokens, boolean]> = [];
        let opers: string[] = [];
        let query: any[] = [];
        let validQuery = true;
        const matches: string[] = expression.match(QUERY);
        if (!matches) {
            return [false, {}];
        }
        matches.forEach(match => {
            validQuery = validQuery && match != Operators.AND_SPECIAL;
        });
        for (let i = 0; i < matches.length && validQuery; i++) {
            if (isType(Regex.SPACE, matches[i]))
                continue;
            if (matches[i] == Operators.OPEN_PAREN) {
                opers.push(matches[i]);
                continue;
            }
            if (matches[i] == Operators.CLOSE_PAREN) {
                if (opers.length > 0 && opers[opers.length-1] == Operators.OPEN_PAREN)
                    opers.pop();
                else if (opers.length > 0) {
                    validQuery = Parser.solve(validQuery, tokens, opers, query);
                    i--;
                }
                else
                    validQuery = false;
                continue;
            }
            if (isType(Regex.FLOAT, matches[i])) {
                tokens.push([Tokens.NUM, false]);
                query.push(parseFloat(matches[i]));
                continue;
            }
            if (isType(Regex.STRING, matches[i])) {
                tokens.push([Tokens.STR, false]);
                query.push(matches[i].slice(1, -1));
                continue;
            }
            matches[i] = insensitive(matches[i]);
            if (matches[i] == Tokens.TRUE || matches[i] == Tokens.FALSE) {
                tokens.push([Tokens.BOOL, false]);
                query.push(matches[i] == Tokens.TRUE);
                continue;
            }
            if (matches[i] == Tokens.NULL) {
                tokens.push([Tokens.NULL, false]);
                query.push(null);
                continue;
            }
            if (matches[i] in map) {
                const insensitiveField = matches[i] as InsensitiveString;
                const sensitiveField = map[insensitiveField];
                tokens.push([inventoryTypeToToken(fields[sensitiveField].type), true]);
                query.push(insensitiveField);
                continue;
            }
            if (matches[i] in Operators2.ALL) {
                if (
                    opers.length == 0
                    || opers[opers.length-1] == Operators.OPEN_PAREN
                    || Operators2.ALL[matches[i]] > Operators2.ALL[opers[opers.length-1]]
                ) {
                    opers.push(matches[i]);
                }
                else {
                    validQuery = Parser.solve(validQuery, tokens, opers, query);
                    i--;
                }
                continue;
            }
            validQuery = false;
        }
        do {
            validQuery = Parser.solve(validQuery, tokens, opers, query);
        } while (validQuery && (tokens.length > 1 || opers.length > 0));
        validQuery = Parser.solve(validQuery, tokens, opers, query);
        const finalQuery = validQuery ? query[0] : {};
        return [validQuery, finalQuery];
    }

    private static solve(validQuery: boolean, tokens: Array<[Tokens, boolean]>, opers: string[], query: any[]): boolean {
        if (!validQuery) {
            return false;
        }
        
        if (tokens.length == 1 && opers.length == 0) {
            const token = tokens[0][0];
            if (token != Tokens.BOOL) {
                return false;
            }
            opers.push(Operators.AND);
            tokens.push([Tokens.BOOL, false]);
            query.push(true);
        }

        if (tokens.length == 0 || opers.length == 0) {
            return false;
        }

        const [bToken, bIsField] = tokens.pop();
        let bValue = query.pop();
        const oper = opers.pop();
        const operation = MONGO_OPERS[oper];
        bValue = bIsField
            && !(oper in Operators2.STR)
            && !(oper in Operators2.ARR)
            ? formatField(bValue) : bValue;

        // booleans: not
        if (bToken == Tokens.BOOL && oper in Operators2.BOOL_UN) {
            Parser.checkNotNulls(undefined, bValue, false, bIsField, tokens, opers, query);
            bValue = bIsField ? Parser.booleanEqualsTrue(bValue) : bValue;
            tokens.push([Tokens.BOOL, false]);
            const result = operation(bValue);
            query.push(result);
            return true;
        }

        if (tokens.length == 0) {
            return false;
        }

        const [aToken, aIsField] = tokens.pop();
        let aValue = query.pop();
        aValue = aIsField
            && !(oper in Operators2.STR)
            && !(oper in Operators2.ARR)
            ? formatField(aValue) : aValue;
        let valid = false;
        let toPush: [Tokens, boolean] = [Tokens.BOOL, false];

        // booleans: -and-, and, or
        if (
            aToken == Tokens.BOOL && bToken == Tokens.BOOL
            && oper in Operators2.BOOL_BIN
        ) {
            Parser.checkNotNulls(aValue, bValue, aIsField, bIsField, tokens, opers, query);
            aValue = aIsField ? Parser.booleanEqualsTrue(aValue) : aValue;
            bValue = bIsField ? Parser.booleanEqualsTrue(bValue) : bValue;
            valid = true;
        }

        // numbers
        else if (
            aToken == Tokens.NUM && bToken == Tokens.NUM
            && (oper in Operators2.NUM_OPER || oper in Operators2.NUM_EQ || oper in Operators2.EQUAL)
        ) {
            Parser.checkNotNulls(aValue, bValue, aIsField, bIsField, tokens, opers, query);
            aValue = aIsField ? formatNumberField(aValue) : aValue;
            bValue = bIsField ? formatNumberField(bValue) : bValue;
            const tokenResult = oper in Operators2.NUM_OPER ? Tokens.NUM : Tokens.BOOL;
            valid = true;
            toPush = [tokenResult, false];
        }

        // strings
        else if (
            aToken == Tokens.STR && bToken == Tokens.STR
            && (
                oper in Operators2.EQUAL
                || (aIsField && !bIsField && oper in Operators2.STR)
            )
        ) {
            if (oper in Operators2.EQUAL) {
                Parser.checkNotNulls(aValue, bValue, aIsField, bIsField, tokens, opers, query);
                aValue = aIsField ? aValue : formatStringValue(aValue);
                bValue = bIsField ? bValue : formatStringValue(bValue);
            }
            else if (oper in Operators2.STR) {
                Parser.checkNotNulls(formatField(aValue), formatField(bValue), aIsField, bIsField, tokens, opers, query);
                aValue = formatField2(aValue);
                bValue = scapeRegexChars(bValue);
            }
            valid = true;
        }

        // dates
        else if (
            (aToken == Tokens.DT || (!aIsField && aToken == Tokens.STR && isType(Regex.DATETIME, aValue)))
            && (bToken == Tokens.DT || (!bIsField && bToken == Tokens.STR && isType(Regex.DATETIME, bValue)))
            && (oper in Operators2.NUM_EQ || oper in Operators2.EQUAL)
        ) {
            Parser.checkNotNulls(aValue, bValue, aIsField, bIsField, tokens, opers, query);
            [valid, aValue, bValue] = Parser.checkDate(aValue, aIsField, bValue, bIsField);
        }

        // arrays
        else if (
            aToken == Tokens.ARR && bToken == Tokens.STR
            && aIsField && !bIsField
            && oper in Operators2.ARR
        ) {
            Parser.checkNotNulls(formatField(aValue), formatField(bValue), aIsField, bIsField, tokens, opers, query);
            aValue = formatField2(aValue);
            valid = true;
        }

        // nulls
        else if (
            (aToken == Tokens.NULL || bToken == Tokens.NULL)
            && oper in Operators2.EQUAL
        ) {
            valid = true;
        }

        if (valid) {
            tokens.push(toPush);
            const result = operation(aValue, bValue);
            query.push(result);
            return true;
        }
        return false;
    }

    private static checkDate(aValue: any, aIsField: boolean, bValue: any, bIsField: boolean): [boolean, any, any] {
        let valid = true;
        if (!aIsField) {
            aValue = new Date(aValue);
            if (isNaN((aValue).getTime())) {
                valid = false;
            }
        }
        if (!bIsField) {
            bValue = new Date(bValue);
            if (isNaN((bValue).getTime())) {
                valid = false;
            }
        }
        return [valid, aValue, bValue];
    }

    private static checkNotNulls(a: any,
                                b: any,
                                aIsField: boolean,
                                bIsField: boolean,
                                tokens: Array<[Tokens, boolean]>,
                                opers: string[],
                                query: any[]) {
        if (aIsField) {
            Parser.fieldNotNull(a, tokens, opers, query);
        }
        if (bIsField) {
            Parser.fieldNotNull(b, tokens, opers, query);
        }
    }

    private static fieldNotNull(value: any,
                                tokens: Array<[Tokens, boolean]>,
                                opers: string[],
                                query: any[]) {
        const checkNotNull = MONGO_OPERS[Operators.NOT_EQUALS](value, null);
        tokens.unshift([Tokens.BOOL, false]);
        query.unshift(checkNotNull);
        opers.unshift(Operators.AND_SPECIAL);
    }

    private static booleanEqualsTrue(value: any): any {
        return MONGO_OPERS[Operators.AND](value, true);
    }
}