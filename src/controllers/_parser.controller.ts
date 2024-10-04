import { Operators, Operators2 } from '../types/queryOperators';
import { Tokens, InventoryFields, inventoryTypeToToken } from '../types/inventory';
import { Regex, isType, insensitive, scapeMongoChars, scapeRegexChars } from '../types/regex';
import { isNativeType, NativeTypes } from '../types/nativeTypes';
import { productFieldNameDB } from '../types/product';

const MONGO_OPERS: Record<string, (a: Object, b: Object) => Object> = Object.freeze({
    [Operators.SUM]: (a: Object, b: Object) => ({ $add: [a, b] }),
    [Operators.SUBTRACTION]: (a: Object, b: Object) => ({ $subtract: [a, b] }),
    [Operators.MULTIPLICATION]: (a: Object, b: Object) => ({ $multiply: [a, b] }),
    [Operators.DIVISION]: (a: Object, b: Object) => ({ $divide: [a, b] }),
    [Operators.MODULUS]: (a: Object, b: Object) => ({ $mod: [a, b] }),
    [Operators.EQUALS]: (a: Object, b: Object) => ({ $expr: { $eq: [a, b] } }),
    [Operators.NOT_EQUALS]: (a: Object, b: Object) => ({ $expr: { $ne: [a, b] } }),
    [Operators.LESS_THAN]: (a: Object, b: Object) => ({ $expr: { $lt: [a, b] } }),
    [Operators.GREATER_THAN]: (a: Object, b: Object) => ({ $expr: { $gt: [a, b] } }),
    [Operators.LESS_THAN_EQUAL]: (a: Object, b: Object) => ({ $expr: { $lte: [a, b] } }),
    [Operators.GREATER_THAN_EQUAL]: (a: Object, b: Object) => ({ $expr: { $gte: [a, b] } }),
    [Operators.LIKE]: (a: Object, b: Object) => ({ [a as string]: { $regex: b as string, $options: 'i' } }),
    [Operators.INCLUDES]: (a: Object, b: Object) => ({ [a as string]: { $in: [b] } }),
    [Operators.NOT]: (a: Object, b: Object) => ({ $not: a }),
    [Operators.AND]: (a: Object, b: Object) => ({ $and: [a, b] }),
    [Operators.OR]: (a: Object, b: Object) => ({ $or: [a, b] }),
    [Operators.AND_SPECIAL]: (a: Object, b: Object) => ({ $and: [a, b] })
});

function formatNumberField(field: string): Object {
    return { $toDouble: field };
}

export class Parser {
    static evalQuery(expression: string, fields: InventoryFields): [boolean, Object] {
        if (isType(Regex.SPACE, expression)) {
            return [true, {}];
        }
        const QUERY = new RegExp(`${Regex.STRING}|${Regex.INVENTORY_FIELD}|${Regex.FLOAT}|${Object.keys(Operators2.ALL).map(k => scapeRegexChars(k)).join('|')}|${Tokens.TRUE}|${Tokens.FALSE}|${Tokens.NULL}|${scapeRegexChars(Operators.OPEN_PAREN)}|${scapeRegexChars(Operators.CLOSE_PAREN)}|.`);
        let tokens: Array<[Tokens, boolean]> = [];
        let opers: string[] = [];
        let query: Array<Object> = [];
        let validQuery = true;
        const matches = expression.match(QUERY);
        for (let i = 0; i < matches.length && validQuery; i++) {
            if (isType(Regex.SPACE, matches[i]))
                continue;
            if (matches[i] === Operators.OPEN_PAREN) {
                opers.push(matches[i]);
                continue;
            }
            if (matches[i] === Operators.CLOSE_PAREN) {
                if (opers.length > 0 && opers[opers.length-1] === Operators.OPEN_PAREN)
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
                query.push(matches[i]);
                continue;
            }
            matches[i] = insensitive(matches[i]);
            if (matches[i] === Tokens.TRUE || matches[i] === Tokens.FALSE) {
                tokens.push([Tokens.BOOL, false]);
                query.push(matches[i] == Tokens.TRUE);
                continue;
            }
            if (matches[i] === Tokens.NULL) {
                tokens.push([Tokens.NULL, false]);
                query.push(null);
                continue;
            }
            if (matches[i] in fields) {
                tokens.push([inventoryTypeToToken(fields[matches[i]].type), true]);
                query.push(matches[i]);
                continue;
            }
            if (matches[i] in Operators2.ALL) {
                if (opers.length == 0 || opers[opers.length-1] === Operators.OPEN_PAREN || Operators2.ALL[tokens[i][0]] > Operators2.ALL[opers[opers.length-1]])
                    opers.push(matches[i]);
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
        const finalQuery = validQuery && query.length == 1 && isNativeType(NativeTypes.OBJECT, query[0]) ? query[0] : {};
        return [validQuery, finalQuery];
    }

    private static solve(validQuery: boolean, tokens: Array<[Tokens, boolean]>, opers: string[], query: Object[]): boolean {
        if (!validQuery) {
            return false;
        }
        
        if (tokens.length === 1 && opers.length === 0) {
            const [token, isField] = tokens[0];
            if (token != Tokens.BOOL) {
                return false;
            }
            if (!isNativeType(NativeTypes.OBJECT, query[0])) {
                query[0] = Parser.booleanEqualsTrue(query[0]);
            }
            return true;
        }

        if (tokens.length === 0 || opers.length === 0) {
            return false;
        }

        const [bToken, bIsField] = tokens.pop();
        let bValue = query.pop();
        bValue = bIsField ? productFieldNameDB(bValue as string) : bValue;
        const oper = opers.pop();
        const operation = MONGO_OPERS[oper];

        // booleans: not
        if (bToken == Tokens.BOOL && oper in Operators2.BOOL_UN) {
            bValue = bIsField ? Parser.booleanEqualsTrue(bValue) : bValue;
            tokens.push([Tokens.BOOL, false]);
            const result = operation(bValue, undefined);
            query.push(result);
            return true;
        }

        if (tokens.length === 0) {
            return false;
        }

        const [aToken, aIsField] = tokens.pop();
        let aValue = query.pop();
        aValue = aIsField ? productFieldNameDB(aValue as string) : aValue;
        let valid = false;
        let toPush: [Tokens, boolean] = [Tokens.BOOL, false];

        // booleans: and, or
        if (aToken == Tokens.BOOL && bToken == Tokens.BOOL && oper in Operators2.BOOL_BIN) {
            aValue = aIsField ? Parser.booleanEqualsTrue(aValue) : aValue;
            bValue = bIsField ? Parser.booleanEqualsTrue(bValue) : bValue;
            valid = true;
        }

        // numbers
        if (
            aToken == Tokens.NUM && bToken == Tokens.NUM
            && (oper in Operators2.NUM_OPER || oper in Operators2.NUM_EQ || oper in Operators2.EQUAL)
        ) {
            if (aIsField) {
                aValue = formatNumberField(aValue as string);
                Parser.fieldNotNull(aValue, tokens, opers, query);
            }
            if (bIsField) {
                bValue = formatNumberField(bValue as string);
                Parser.fieldNotNull(bValue, tokens, opers, query);
            }
            const tokenResult = oper in Operators2.NUM_OPER ? Tokens.NUM : Tokens.BOOL;
            valid = true;
            toPush = [tokenResult, false];
        }

        // strings
        if (
            aToken == Tokens.STR && bToken == Tokens.STR
            && aIsField && !bIsField
            && (oper in Operators2.STR || oper in Operators2.EQUAL)
        ) {
            bValue = oper in Operators2.EQUAL ? scapeMongoChars(bValue as string) : bValue;
            bValue = oper in Operators2.STR ? scapeRegexChars(bValue as string) : bValue;
            valid = true;
        }

        // dates
        if (
            (aToken == Tokens.DT || bToken == Tokens.DT)
            && (oper in Operators2.NUM_EQ || oper in Operators2.EQUAL)
        ) {
            [valid, aValue, bValue] = Parser.checkDate(aValue, aIsField, bValue, bIsField);
        }

        // arrays
        if (
            aToken == Tokens.ARR && bToken == Tokens.STR
            && aIsField && !bIsField
            && (oper in Operators2.ARR)
        ) {
            valid = true;
        }

        // nulls
        if (
            bToken == Tokens.NULL
            && aIsField && !bIsField
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

    private static checkDate(aValue: Object, aIsField: boolean, bValue: Object, bIsField: boolean): [boolean, Object, Object] {
        let valid = true;
        if (!aIsField) {
            aValue = new Date(aValue as string);
            if (isNaN((aValue as Date).getTime())) {
                valid = false;
            }
        }
        if (!bIsField) {
            bValue = new Date(bValue as string);
            if (isNaN((bValue as Date).getTime())) {
                valid = false;
            }
        }
        return [valid, aValue, bValue];
    }

    private static fieldNotNull(value: Object,
                                tokens: Array<[Tokens, boolean]>,
                                opers: string[],
                                query: Object[]) {
        const checkNotNull = MONGO_OPERS[Operators.NOT_EQUALS](value, true);
        tokens.unshift([Tokens.BOOL, false]);
        query.unshift(checkNotNull);
        opers.unshift(Operators.AND_SPECIAL);
    }

    private static booleanEqualsTrue(value: Object): Object {
        return MONGO_OPERS[Operators.EQUALS](value, true);
    }
}