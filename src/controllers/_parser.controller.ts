import { Operators, Operators2 } from '../types/queryOperators';
import { Tokens, InventoryFields, inventoryTypeToToken } from '../types/inventory';
import { Regex, isType, insensitive, scapeMongoChars, scapeRegexChars } from '../types/regex';
import { isNativeType, NativeTypes } from '../types/nativeTypes';

const MONGO_OPERS: Record<string, (a: Object,
                                    aIsField: boolean,
                                    b: Object,
                                    bIsField: boolean | undefined) => Object> = Object.freeze({
    [Operators.SUM]: (a: any, aF: any, b: any, bF: any) => ({ $add: [f1(a, aF), f1(b, bF)] }),
    [Operators.SUBTRACTION]: (a: any, aF: any, b: any, bF: any) => ({ $subtract: [f1(a, aF), f1(b, bF)] }),
    [Operators.MULTIPLICATION]: (a: any, aF: any, b: any, bF: any) => ({ $multiply: [f1(a, aF), f1(b, bF)] }),
    [Operators.DIVISION]: (a: any, aF: any, b: any, bF: any) => ({ $divide: [f1(a, aF), f1(b, bF)] }),
    [Operators.MODULUS]: (a: any, aF: any, b: any, bF: any) => ({ $mod: [f1(a, aF), f1(b, bF)] }),
    [Operators.EQUALS]: (a: any, aF: any, b: any, bF: any) => ({ $expr: { $eq: [f1(a, aF), f1(b, bF)] } }),
    [Operators.NOT_EQUALS]: (a: any, aF: any, b: any, bF: any) => ({ $expr: { $ne: [f1(a, aF), f1(b, bF)] } }),
    [Operators.LESS_THAN]: (a: any, aF: any, b: any, bF: any) => ({ $expr: { $lt: [f1(a, aF), f1(b, bF)] } }),
    [Operators.GREATER_THAN]: (a: any, aF: any, b: any, bF: any) => ({ $expr: { $gt: [f1(a, aF), f1(b, bF)] } }),
    [Operators.LESS_THAN_EQUAL]: (a: any, aF: any, b: any, bF: any) => ({ $expr: { $lte: [f1(a, aF), f1(b, bF)] } }),
    [Operators.GREATER_THAN_EQUAL]: (a: any, aF: any, b: any, bF: any) => ({ $expr: { $gte: [f1(a, aF), f1(b, bF)] } }),
    [Operators.LIKE]: (a: any, aF: any, b: any, bF: any) => ({ [formatField(a)]: { $regex: scapeRegexChars(b), $options: 'i' } }),
    [Operators.INCLUDES]: (a: any, aF: any, b: any, bF: any) => ({ [formatField(a)]: { $in: [b] } }),
    [Operators.NOT]: (a: any, aF: any, b: any, bF: any) => ({ $not: a }),
    [Operators.AND]: (a: any, aF: any, b: any, bF: any) => ({ $and: [a, b] }),
    [Operators.OR]: (a: any, aF: any, b: any, bF: any) => ({ $or: [a, b] }),
    [Operators.AND_SPECIAL]: (a: any, aF: any, b: any, bF: any) => ({ $and: [a, b] })
});

function f1(argument: Object, argumentIsField: boolean): string {
    if (argumentIsField) {
        return formatField(argument as string);
    }
    return scapeMongoChars(argument as string);
}

function formatField(field: string): string {
    return '$fields.' + field;
}

type Rule = [string, string | undefined];
class Rules {
    static readonly BOOL_UN: Rule[] = [
        [Tokens.BOOL, undefined]
    ];

    static readonly BOOL_BIN: Rule[] = [
        [Tokens.BOOL, Tokens.BOOL]
    ];

    static readonly NUM_OPER: Rule[] = [
        [Tokens.NUM, Tokens.NUM]
    ];

    static readonly STR: Rule[] = [
        [Tokens.STR, Tokens.STR]
    ];

    static readonly ARR: Rule[] = [
        [Tokens.ARR, Tokens.BOOL],
        [Tokens.ARR, Tokens.NUM],
        [Tokens.ARR, Tokens.STR],
        [Tokens.ARR, Tokens.DT]
    ];

    static readonly NUM_EQ: Rule[] = [
        ...Rules.NUM_OPER,
        [Tokens.DT, Tokens.DT],
        [Tokens.STR, Tokens.DT],
        [Tokens.DT, Tokens.STR]
    ];
    
    static readonly EQUAL: Rule[] = [
        ...Rules.BOOL_BIN,
        ...Rules.NUM_EQ,
        ...Rules.STR,
        [Tokens.BOOL, Tokens.NULL],
        [Tokens.NUM, Tokens.NULL],
        [Tokens.STR, Tokens.NULL],
        [Tokens.DT, Tokens.NULL],
        [Tokens.ARR, Tokens.NULL],
        [Tokens.NULL, Tokens.NULL]
    ];
}

export class Parser {
    static evalQuery(expression: string, fields: InventoryFields): [boolean, Object] {
        if (isType(Regex.SPACE, expression)) {
            return [true, {}];
        }
        const QUERY = new RegExp(`${Regex.STRING}|${Regex.INVENTORY_FIELD}|${Regex.FLOAT}|${Object.keys(Operators2.ALL).map(k => scapeRegexChars(k)).join('|')}|${Tokens.TRUE}|${Tokens.FALSE}|${Tokens.NULL}|${scapeRegexChars(Operators.OPEN_PAREN)}|${scapeRegexChars(Operators.CLOSE_PAREN)}|.`);
        let tokens: Tokens[] = [];
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
                    validQuery = Parser.solve(tokens, opers, query, fields);
                    i--;
                }
                else
                    validQuery = false;
                continue;
            }
            if (isType(Regex.FLOAT, matches[i])) {
                tokens.push(Tokens.NUM);
                query.push(parseFloat(matches[i]));
                continue;
            }
            if (isType(Regex.STRING, matches[i])) {
                tokens.push(Tokens.STR);
                query.push(matches[i]);
                continue;
            }
            matches[i] = insensitive(matches[i]);
            if (matches[i] === Tokens.TRUE || matches[i] === Tokens.FALSE) {
                tokens.push(Tokens.BOOL);
                query.push(matches[i] == Tokens.TRUE);
                continue;
            }
            if (matches[i] === Tokens.NULL) {
                tokens.push(Tokens.NULL);
                query.push(null);
                continue;
            }
            if (matches[i] in fields) {
                tokens.push(inventoryTypeToToken(fields[matches[i]].type));
                query.push(matches[i]);
                continue;
            }
            if (matches[i] in Operators2.ALL) {
                if (opers.length == 0 || opers[opers.length-1] === Operators.OPEN_PAREN || Operators2.ALL[tokens[i]] > Operators2.ALL[opers[opers.length-1]])
                    opers.push(matches[i]);
                else {
                    validQuery = Parser.solve(tokens, opers, query, fields);
                    i--;
                }
                continue;
            }
            validQuery = false;
        }
        while (validQuery && tokens.length > 1 && opers.length > 0) {
            validQuery = Parser.solve(tokens, opers, query, fields);
        }
        if (validQuery) {
            validQuery = Parser.solve(tokens, opers, query, fields);
        }
        return [validQuery, query[0]];
    }

    private static solve(tokens: Tokens[], opers: string[], query: Array<string | Object>, fields: InventoryFields): boolean {
        if (tokens.length === 1 && opers.length === 0 && tokens[0] == Tokens.BOOL) {
            const value = query[0];
            if (isNativeType(NativeTypes.STRING, value)) {
                query[0] = Parser.booleanEqualsTrue(query[0], (value as string) in fields);
            }
            return true;
        }

        if (tokens.length === 0 || opers.length === 0) {
            return false;
        }

        let bValue = query.pop();
        const bIsField = isNativeType(NativeTypes.STRING, bValue) && (bValue as string) in fields;
        const bToken = tokens.pop();
        const oper = opers.pop();
        const operation = MONGO_OPERS[oper];
        if (oper in Operators2.BOOL_UN && Rules.BOOL_UN.includes([bToken, undefined])) {
            if (bIsField) {
                bValue = Parser.booleanEqualsTrue(bValue, true);
            }
            tokens.push(Tokens.BOOL);
            const result = operation(bValue, bIsField, undefined, undefined);
            query.push(result);
            return true;
        }

        if (tokens.length === 0) {
            return false;
        }

        let aValue = query.pop();
        const aIsField = isNativeType(NativeTypes.STRING, aValue) && (aValue as string) in fields;
        const aToken = tokens.pop();
        if (oper in Operators2.NUM_OPER && Rules.NUM_OPER.includes([aToken, bToken])) {
            tokens.push(Tokens.NUM);
            const result = operation(aValue, aIsField, bValue, bIsField);
            query.push(result);
            return true;
        }

        if (
            (oper in Operators2.NUM_EQ && Rules.NUM_EQ.includes([aToken, bToken]))
            || (oper in Operators2.EQUAL && Rules.EQUAL.includes([aToken, bToken]))
        ) {
            let valid: boolean;
            [valid, aValue, bValue] = Parser.checkDate(aToken, aValue, aIsField, bToken, bValue, bIsField);
            if (!valid) {
                return false;
            }
            if (aToken == Tokens.NUM && aIsField) {
                Parser.fieldNotNull(aValue, tokens, opers, query);
            }
            if (bToken == Tokens.NUM && bIsField) {
                Parser.fieldNotNull(bValue, tokens, opers, query);
            }
            tokens.push(Tokens.BOOL);
            const result = operation(aValue, aIsField, bValue, bIsField);
            query.push(result);
            return true;
        }

        if ((oper in Operators2.BOOL_BIN && Rules.BOOL_BIN.includes([aToken, bToken]))) {
            if (aIsField) {
                aValue = Parser.booleanEqualsTrue(aValue, true);
            }
            if (bIsField) {
                bValue = Parser.booleanEqualsTrue(bValue, true);
            }
            tokens.push(Tokens.BOOL);
            const result = operation(aValue, aIsField, bValue, bIsField);
            query.push(result);
            return true;
        }

        if (
            (oper in Operators2.STR && Rules.STR.includes([aToken, bToken]) && aIsField && !bIsField)
            || (oper in Operators2.ARR && Rules.ARR.includes([aToken, bToken]) && aIsField && !bIsField)
        ) {
            tokens.push(Tokens.BOOL);
            const result = operation(aValue, aIsField, bValue, bIsField);
            query.push(result);
            return true;
        }
        return false;
    }

    private static checkDate(aToken: Tokens,
                            aValue: Object,
                            aIsField: boolean,
                            bToken: Tokens,
                            bValue: Object,
                            bIsField: boolean): [boolean, Object, Object] {
        let valid = true;
        if (aToken == Tokens.DT || bToken == Tokens.DT) {
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
        }
        return [valid, aValue, bValue];
    }

    private static fieldNotNull(value: Object,
                                tokens: Tokens[],
                                opers: string[],
                                query: Object[]) {
        const checkNotNull = MONGO_OPERS[Operators.NOT_EQUALS](value, true, null, false);
        tokens.unshift(Tokens.BOOL);
        query.unshift(checkNotNull);
        opers.unshift(Operators.AND_SPECIAL);
    }

    private static booleanEqualsTrue(value: Object, isField: boolean): Object {
        return MONGO_OPERS[Operators.EQUALS](value, isField, true, false);
    }
}