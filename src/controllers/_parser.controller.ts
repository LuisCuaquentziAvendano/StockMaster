import { Operators, Operators2 } from '../types/queryOperators';
import { Tokens, InventoryFields, inventoryTypeToToken } from '../types/inventory';
import { Regex, isType, scapeRegexChars } from '../types/regex';
import { isObject } from '../types/nativeTypes';
import { FIELDS } from '../types/product';
import { FieldsMap, insensitive, InsensitiveString } from '../types/insensitive';

const MONGO_OPERS: Record<string, (a: any, b?: any) => any> = Object.freeze({
    [Operators.SUM]: (a: any, b: any) => ({ $add: [a, b] }),
    [Operators.SUBTRACTION]: (a: any, b: any) => ({ $subtract: [a, b] }),
    [Operators.MULTIPLICATION]: (a: any, b: any) => ({ $multiply: [a, b] }),
    [Operators.DIVISION]: (a: any, b: any) => ({ $divide: [a, b] }),
    [Operators.MODULUS]: (a: any, b: any) => ({ $mod: [a, b] }),
    [Operators.EQUALS]: (a: any, b: any) => ({ $expr: { $eq: [a, b] } }),
    [Operators.NOT_EQUALS]: (a: any, b: any) => ({ $expr: { $ne: [a, b] } }),
    [Operators.LESS_THAN]: (a: any, b: any) => ({ $expr: { $lt: [a, b] } }),
    [Operators.GREATER_THAN]: (a: any, b: any) => ({ $expr: { $gt: [a, b] } }),
    [Operators.LESS_THAN_EQUAL]: (a: any, b: any) => ({ $expr: { $lte: [a, b] } }),
    [Operators.GREATER_THAN_EQUAL]: (a: any, b: any) => ({ $expr: { $gte: [a, b] } }),
    [Operators.LIKE]: (a: any, b: any) => ({ [a]: { $regex: b, $options: 'i' } }),
    [Operators.INCLUDES]: (a: any, b: any) => ({ [a]: { $in: [b] } }),
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
    return '$' + FIELDS + '.' + field;
}

function formatField2(field: string) {
    return FIELDS + '.' + field;
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
        while (validQuery && tokens.length > 1 && opers.length > 0) {
            validQuery = Parser.solve(validQuery, tokens, opers, query);
        }
        validQuery = Parser.solve(validQuery, tokens, opers, query);
        const finalQuery = validQuery && query.length == 1
            && isObject(query[0]) ? query[0] : {};
        return [validQuery, finalQuery];
    }

    private static solve(validQuery: boolean, tokens: Array<[Tokens, boolean]>, opers: string[], query: any[]): boolean {
        if (!validQuery) {
            return false;
        }
        
        if (tokens.length == 1 && opers.length == 0) {
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

        // booleans: and, or
        if (aToken == Tokens.BOOL && bToken == Tokens.BOOL && oper in Operators2.BOOL_BIN) {
            aValue = aIsField ? Parser.booleanEqualsTrue(aValue) : aValue;
            bValue = bIsField ? Parser.booleanEqualsTrue(bValue) : bValue;
            valid = true;
        }

        // numbers
        else if (
            aToken == Tokens.NUM && bToken == Tokens.NUM
            && (oper in Operators2.NUM_OPER || oper in Operators2.NUM_EQ || oper in Operators2.EQUAL)
        ) {
            if (aIsField) {
                aValue = formatNumberField(aValue);
                Parser.fieldNotNull(aValue, tokens, opers, query);
            }
            if (bIsField) {
                bValue = formatNumberField(bValue);
                Parser.fieldNotNull(bValue, tokens, opers, query);
            }
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
                aValue = aIsField ? aValue : formatStringValue(aValue);
                bValue = bIsField ? bValue : formatStringValue(bValue);
            }
            if (oper in Operators2.STR) {
                aValue = formatField2(aValue);
                bValue = scapeRegexChars(bValue);
            }
            valid = true;
        }

        // dates
        else if (
            (aToken == Tokens.DT || aToken == Tokens.STR)
            && (bToken == Tokens.DT || bToken == Tokens.STR)
            && (oper in Operators2.NUM_EQ || oper in Operators2.EQUAL)
        ) {
            [valid, aValue, bValue] = Parser.checkDate(aValue, aIsField, bValue, bIsField);
        }

        // arrays
        else if (
            aToken == Tokens.ARR && bToken == Tokens.STR
            && aIsField && !bIsField
            && oper in Operators2.ARR
        ) {
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

    private static fieldNotNull(value: any,
                                tokens: Array<[Tokens, boolean]>,
                                opers: string[],
                                query: any[]) {
        const checkNotNull = MONGO_OPERS[Operators.NOT_EQUALS](value, true);
        tokens.unshift([Tokens.BOOL, false]);
        query.unshift(checkNotNull);
        opers.unshift(Operators.AND_SPECIAL);
    }

    private static booleanEqualsTrue(value: any): any {
        return MONGO_OPERS[Operators.EQUALS](value, true);
    }
}