import { Operators } from '../types/queryOperators';
import { ParserTokens as Tokens, InventoryFields } from '../types/inventory';
import { Regex, isType, insensitive } from '../types/regex';
import { isNativeType, NativeTypes } from '../types/nativeTypes';

const MONGO_OPERATORS: Record<string, (a: string | Object, b: string | Object, f: InventoryFields) => Object> = Object.freeze({
    '+': (a: string, b: string, f: InventoryFields) => ({ $add: [f1(a, f), f1(b, f)] }),
    '-': (a: string, b: string, f: InventoryFields) => ({ $subtract: [f1(a, f), f1(b, f)] }),
    '*': (a: string, b: string, f: InventoryFields) => ({ $multiply: [f1(a, f), f1(b, f)] }),
    '/': (a: string, b: string, f: InventoryFields) => ({ $divide: [f1(a, f), f1(b, f)] }),
    '%': (a: string, b: string, f: InventoryFields) => ({ $mod: [f1(a, f), f1(b, f)] }),
    '==': (a: string, b: string, f: InventoryFields) => ({ $expr: { $eq: [f1(a, f), f1(b, f)] } }),
    '!=': (a: string, b: string, f: InventoryFields) => ({ $expr: { $ne: [f1(a, f), f1(b, f)] } }),
    '<': (a: string, b: string, f: InventoryFields) => ({ $expr: { $lt: [f1(a, f), f1(b, f)] } }),
    '>': (a: string, b: string, f: InventoryFields) => ({ $expr: { $gt: [f1(a, f), f1(b, f)] } }),
    '<=': (a: string, b: string, f: InventoryFields) => ({ $expr: { $lte: [f1(a, f), f1(b, f)] } }),
    '>=': (a: string, b: string, f: InventoryFields) => ({ $expr: { $gte: [f1(a, f), f1(b, f)] } }),
    'like': (a: string, b: string, f: InventoryFields) => ({ "fields.a}": { $Regex: b}, $options: "i" }),
    'includes': (a: string, b: string, f: InventoryFields) => ({ "fields.a}": { $in: [b] } }),
    'not': (a: string, b: string, f: InventoryFields) => ({ $not: f2(a, f) }),
    'and': (a: string, b: string, f: InventoryFields) => ({ $and: [f2(a, f), f2(b, f)] }),
    'or': (a: string, b: string, f: InventoryFields) => ({ $or: [f2(a, f), f2(b, f)] })
});

function f1(argument: string, fields: InventoryFields): string {
    if (argument in fields)
        return '"$fields.' + argument + '"';
    return argument;
}

function f2(argument: string, fields: InventoryFields): Object {
    if (argument in fields)
        return MONGO_OPERATORS['=='](argument, Tokens.TRUE, fields);
    return argument;
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

    static readonly NUM_EQ: Rule[] = [
        ...Rules.NUM_OPER
    ];

    static readonly STR: Rule[] = [
        [Tokens.STR, Tokens.STR]
    ];
    
    static readonly EQUAL: Rule[] = [
        ...Rules.BOOL_BIN,
        ...Rules.NUM_OPER,
        ...Rules.STR,
        [Tokens.BOOL, Tokens.NULL],
        [Tokens.NUM, Tokens.NULL],
        [Tokens.STR, Tokens.NULL],
        [Tokens.NULL, Tokens.NULL]
    ];
    
    static readonly ARR: Rule[] = [
        [Tokens.ARR, Tokens.BOOL],
        [Tokens.ARR, Tokens.NUM],
        [Tokens.ARR, Tokens.STR]
    ];
}

export class Parser {
    static evalQuery(expression: string, fields: InventoryFields): [boolean, Object] {
        const QUERY = new RegExp(`${Regex.STRING}|${Regex.INVENTORY_FIELD}|${Regex.FLOAT}|${Object.keys(Operators.ALL).map(k => k).join('|')}|${Tokens.TRUE}|${Tokens.FALSE}|${Tokens.NULL}|\\${Operators.OPEN_PAREN}|\\${Operators.CLOSE_PAREN}|.`
            .replace(/\|[\+\*\/]\|/g, x => `|\\${x[1]}|`), 'gi');
        let values: string[] = [];
        let opers: string[] = [];
        let queryValues: Array<string | Object> = [];
        let validQuery = true;
        const tokens = expression.match(QUERY);
        for (let i = 0; i < tokens.length && validQuery; i++) {
            let token: string = tokens[i];
            if (isType(Regex.SPACE, token))
                continue;
            if (token === Operators.OPEN_PAREN) {
                opers.push(token);
                continue;
            }
            if (token === Operators.CLOSE_PAREN) {
                if (opers.length > 0 && opers[opers.length-1] === Operators.OPEN_PAREN)
                    opers.pop();
                else if (opers.length > 0) {
                    validQuery = Parser.solve(values, opers, queryValues, fields);
                    i--;
                }
                else
                    validQuery = false;
                continue;
            }
            if (isType(Regex.FLOAT, token)) {
                values.push(Tokens.NUM);
                queryValues.push(token);
                continue;
            }
            if (isType(Regex.STRING, token)) {
                values.push(Tokens.STR);
                const stringSanitized = token.slice(1, -1);
                queryValues.push('"' + stringSanitized + '"');
                continue;
            }
            token = insensitive(token);
            if (token === Tokens.TRUE || token === Tokens.FALSE) {
                values.push(Tokens.BOOL);
                queryValues.push(token);
                continue;
            }
            if (token === Tokens.NULL) {
                values.push(Tokens.NULL);
                queryValues.push(tokens[i]);
                continue;
            }
            if (token in fields) {
                values.push(token);
                queryValues.push(token);
                continue;
            }
            if (token in Operators.ALL) {
                if (opers.length == 0 || opers[opers.length-1] === Operators.OPEN_PAREN || Operators.ALL[tokens[i]] > Operators.ALL[opers[opers.length-1]])
                    opers.push(token);
                else {
                    validQuery = Parser.solve(values, opers, queryValues, fields);
                    i--;
                }
                continue;
            }
            validQuery = false;
        }
        while (validQuery && values.length > 1 && opers.length > 0)
            validQuery = Parser.solve(values, opers, queryValues, fields);
        if (validQuery)
            validQuery = Parser.solve(values, opers, queryValues, fields);
        if (validQuery && isNativeType(NativeTypes.STRING, queryValues[0])) {
            queryValues.push(Tokens.TRUE);
            Parser.buildQuery(queryValues, '==', fields);
        }
        return [validQuery, queryValues[0]];
    }

    private static solve(values: string[], opers: string[], queryValues: Array<string | Object>, fields: InventoryFields): boolean {
        if (values.length === 1 && opers.length === 0 && values[0] == Tokens.BOOL)
            return true;
        if (values.length === 0 || opers.length === 0)
            return false;
        const b = values.pop();
        const oper = opers.pop();
        if (oper in Operators.BOOL_UN && Parser.checkTypes([b, undefined], Rules.BOOL_UN, fields)) {
            Parser.buildQuery(queryValues, oper, fields);
            values.push(Tokens.BOOL);
            return true;
        }
        if (values.length === 0)
            return false;
        const a = values.pop();
        if (oper in Operators.NUM_OPER && Parser.checkTypes([a, b], Rules.NUM_OPER, fields)) {
            Parser.buildQuery(queryValues, oper, fields);
            values.push(Tokens.NUM);
            return true;
        }
        if (
            (oper in Operators.BOOL_BIN && Parser.checkTypes([a, b], Rules.BOOL_BIN, fields))
            || (oper in Operators.NUM_EQ && Parser.checkTypes([a, b], Rules.NUM_EQ, fields))
            || (oper in Operators.STR && Parser.checkTypes([a, b], Rules.STR, fields) && a in fields && !(b in fields))
            || (oper in Operators.EQUAL && Parser.checkTypes([a, b], Rules.EQUAL, fields))
            || (oper in Operators.ARR && Parser.checkTypes([a, b], Rules.ARR, fields) && a in fields && !(b in fields))
        ) {
            Parser.buildQuery(queryValues, oper, fields);
            values.push(Tokens.BOOL);
            return true;
        }
        return false;
    }

    private static checkTypes(pair: Rule, array: Rule[], fields: InventoryFields): boolean {
        if (pair[0] in fields)
            pair[0] = fields[pair[0]].type;
        if (pair[1] in fields)
            pair[1] = fields[pair[1]].type;
        return array.includes(pair);
    }

    private static buildQuery(queryValues: Array<string | Object>, oper: string, fields: InventoryFields): void {
        let b = queryValues.pop();
        let a = b;
        if (!(oper in Operators.BOOL_UN))
            a = queryValues.pop();
        const operation = MONGO_OPERATORS[oper];
        const result = operation(a, b, fields);
        queryValues.push(result);
    }
}