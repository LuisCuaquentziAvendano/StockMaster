import { Operators } from '../utils/queryOperators';
import { ParserTokens as Tokens } from '../utils/inventoryDataTypes';
import regex from '../utils/regex';
import InventorySchema from '../types/inventorySchema';

const MONGO_OPERATORS: Record<string, (a: string, b: string, f: InventorySchema) => string> = Object.freeze({
    '+': (a: string, b: string, f: InventorySchema) => `{ $add: [${f1(a, f)}, ${f1(b, f)}] }`,
    '-': (a: string, b: string, f: InventorySchema) => `{ $subtract: [${f1(a, f)}, ${f1(b, f)}] }`,
    '*': (a: string, b: string, f: InventorySchema) => `{ $multiply: [${f1(a, f)}, ${f1(b, f)}] }`,
    '/': (a: string, b: string, f: InventorySchema) => `{ $divide: [${f1(a, f)}, ${f1(b, f)}] }`,
    '%': (a: string, b: string, f: InventorySchema) => `{ $mod: [${f1(a, f)}, ${f1(b, f)}] }`,
    '==': (a: string, b: string, f: InventorySchema) => `{ $expr: { $eq: [${f1(a, f)}, ${f1(b, f)}] } }`,
    '!=': (a: string, b: string, f: InventorySchema) => `{ $expr: { $ne: [${f1(a, f)}, ${f1(b, f)}] } }`,
    '<': (a: string, b: string, f: InventorySchema) => `{ $expr: { $lt: [${f1(a, f)}, ${f1(b, f)}] } }`,
    '>': (a: string, b: string, f: InventorySchema) => `{ $expr: { $gt: [${f1(a, f)}, ${f1(b, f)}] } }`,
    '<=': (a: string, b: string, f: InventorySchema) => `{ $expr: { $lte: [${f1(a, f)}, ${f1(b, f)}] } }`,
    '>=': (a: string, b: string, f: InventorySchema) => `{ $expr: { $gte: [${f1(a, f)}, ${f1(b, f)}] } }`,
    'like': (a: string, b: string, f: InventorySchema) => `{ "fields.${a}": { $regex: ${b}, $options: "i" } }`,
    'includes': (a: string, b: string, f: InventorySchema) => `{ "fields.${a}": { $in: [${b}] } }`,
    'not': (a: string, b: string, f: InventorySchema) => `{ $not: ${f2(a, f)} }`,
    'and': (a: string, b: string, f: InventorySchema) => `{ $and: [${f2(a, f)}, ${f2(b, f)}] }`,
    'or': (a: string, b: string, f: InventorySchema) => `{ $or: [${f2(a, f)}, ${f2(b, f)}] }`
});

function f1(argument: string, fields: InventorySchema): string {
    if (argument in fields)
        return '"$fields.' + argument + '"';
    return argument;
}

function f2(argument: string, fields: InventorySchema): string {
    if (argument in fields)
        return MONGO_OPERATORS['=='](argument, Operators.TRUE, fields);
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

class Parser {
    static evalQuery(expression: string, fields: InventorySchema): [boolean, string] {
        let values: string[] = [];
        let opers: string[] = [];
        let queryValues: string[] = [];
        let validQuery = true;
        for (let i = 0; i < expression.length && validQuery; i++) {
            let token: string = expression[i];
            if (regex.isType(regex.SPACE, token))
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
            if (regex.isType(regex.FLOAT, token)) {
                values.push(Tokens.NUM);
                queryValues.push(token);
                continue;
            }
            if (regex.isType(regex.STR, token)) {
                values.push(Tokens.STR);
                queryValues.push(regex.formatMongoString(token));
                continue;
            }
            token = regex.formatInsensitiveCase(token);
            if (token === Operators.TRUE || token === Operators.FALSE) {
                values.push(Tokens.BOOL);
                queryValues.push(token);
                continue;
            }
            if (token === Operators.NULL) {
                values.push(Tokens.NULL);
                queryValues.push(expression[i]);
                continue;
            }
            if (token in fields) {
                values.push(token);
                queryValues.push(token);
                continue;
            }
            if (token in Operators.ALL) {
                if (opers.length == 0 || opers[opers.length-1] === Operators.OPEN_PAREN || Operators.ALL[expression[i]] > Operators.ALL[opers[opers.length-1]])
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
        if (validQuery && queryValues[0] in fields) {
            queryValues.push(Operators.TRUE);
            Parser.buildQuery(queryValues, '==', fields);
        }
        let query = '';
        try {
            query = JSON.parse(queryValues[0]);
        } catch {
            validQuery = false;
        }
        return [validQuery, query];
    }

    private static solve(values: string[], opers: string[], queryValues: string[], fields: InventorySchema): boolean {
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

    private static checkTypes(pair: Rule, array: Rule[], fields: InventorySchema): boolean {
        if (pair[0] in fields)
            pair[0] = fields[pair[0]];
        if (pair[1] in fields)
            pair[1] = fields[pair[1]];
        return array.includes(pair);
    }

    private static buildQuery(queryValues: string[], oper: string, fields: InventorySchema): void {
        let b = queryValues.pop();
        let a = b;
        if (!(oper in Operators.BOOL_UN))
            a = queryValues.pop();
        const operation = MONGO_OPERATORS[oper];
        const result = operation(a, b, fields);
        queryValues.push(result);
    }
}

export default Parser;