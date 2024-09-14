import Operators from '../utils/queryOperators';
import { ParserTokens as Tokens } from '../utils/inventoryDataTypes';
import regex from '../utils/regex';
import InventorySchema from '../types/inventorySchema';

const MONGO_OPERATORS: Record<string, (a: string, b: string, prop: InventorySchema) => string> = Object.freeze({
    '+': (a: string, b: string, prop: InventorySchema) => `{ $add: [${f(a, prop)}, ${f(b, prop)}] }`,
    '-': (a: string, b: string, prop: InventorySchema) => `{ $subtract: [${f(a, prop)}, ${f(b, prop)}] }`,
    '*': (a: string, b: string, prop: InventorySchema) => `{ $multiply: [${f(a, prop)}, ${f(b, prop)}] }`,
    '/': (a: string, b: string, prop: InventorySchema) => `{ $divide: [${f(a, prop)}, ${f(b, prop)}] }`,
    '%': (a: string, b: string, prop: InventorySchema) => `{ $mod: [${f(a, prop)}, ${f(b, prop)}] }`,
    '==': (a: string, b: string, prop: InventorySchema) => `{ $expr: { $eq: [${f(a, prop)}, ${f(b, prop)}] } }`,
    '!=': (a: string, b: string, prop: InventorySchema) => `{ $expr: { $ne: [${f(a, prop)}, ${f(b, prop)}] } }`,
    '<': (a: string, b: string, prop: InventorySchema) => `{ $expr: { $lt: [${f(a, prop)}, ${f(b, prop)}] } }`,
    '>': (a: string, b: string, prop: InventorySchema) => `{ $expr: { $gt: [${f(a, prop)}, ${f(b, prop)}] } }`,
    '<=': (a: string, b: string, prop: InventorySchema) => `{ $expr: { $lte: [${f(a, prop)}, ${f(b, prop)}] } }`,
    '>=': (a: string, b: string, prop: InventorySchema) => `{ $expr: { $gte: [${f(a, prop)}, ${f(b, prop)}] } }`,
    'like': (a: string, b: string, prop: InventorySchema) => `{ ${a}: { $regex: ${b} } }`,
    'includes': (a: string, b: string, prop: InventorySchema) => `{ ${a}: { $in: [${b}] } }`,
    'not': (a: string, b: string, prop: InventorySchema) => `{ $not: ${a} }`,
    'and': (a: string, b: string, prop: InventorySchema) => `{ $and: [${a}, ${b}] }`,
    'or': (a: string, b: string, prop: InventorySchema) => `{ $or: [${a}, ${b}] }`
});

function f(s: string, properties: InventorySchema) {
    if (s in properties)
        return '"$' + s + '"';
    return s;
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
    static evalQuery(expression: string, properties: InventorySchema): [boolean, string] {
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
                    validQuery = Parser.solve(values, opers, queryValues, properties);
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
            token = token.toLowerCase();
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
            if (token in properties) {
                values.push(token);
                queryValues.push(token);
                continue;
            }
            if (token in Operators.ALL) {
                if (opers.length == 0 || opers[opers.length-1] === Operators.OPEN_PAREN || Operators.ALL[expression[i]] > Operators.ALL[opers[opers.length-1]])
                    opers.push(token);
                else {
                    validQuery = Parser.solve(values, opers, queryValues, properties);
                    i--;
                }
                continue;
            }
            validQuery = false;
        }
        while (validQuery && values.length > 1 && opers.length > 0)
            validQuery = Parser.solve(values, opers, queryValues, properties);
        if (validQuery)
            validQuery = Parser.solve(values, opers, queryValues, properties);
        if (validQuery && queryValues[0] in properties) {
            queryValues.push(Operators.TRUE);
            Parser.buildQuery(queryValues, '==', properties);
        }
        let query = '';
        try {
            query = JSON.parse(queryValues[0]);
        } catch {
            validQuery = false;
        }
        return [validQuery, query];
    }

    private static solve(values: string[], opers: string[], queryValues: string[], properties: InventorySchema): boolean {
        if (values.length === 1 && opers.length === 0 && values[0] == Tokens.BOOL)
            return true;
        if (values.length === 0 || opers.length === 0)
            return false;
        const b = values.pop();
        const oper = opers.pop();
        if (oper in Operators.BOOL_UN && Parser.checkTypes([b, undefined], Rules.BOOL_UN, properties)) {
            Parser.buildQuery(queryValues, oper, properties);
            values.push(Tokens.BOOL);
            return true;
        }
        if (values.length === 0)
            return false;
        const a = values.pop();
        if (oper in Operators.NUM_OPER && Parser.checkTypes([a, b], Rules.NUM_OPER, properties)) {
            Parser.buildQuery(queryValues, oper, properties);
            values.push(Tokens.NUM);
            return true;
        }
        if (
            (oper in Operators.BOOL_BIN && Parser.checkTypes([a, b], Rules.BOOL_BIN, properties))
            || (oper in Operators.NUM_EQ && Parser.checkTypes([a, b], Rules.NUM_EQ, properties))
            || (oper in Operators.STR && Parser.checkTypes([a, b], Rules.STR, properties) && a in properties && !(b in properties))
            || (oper in Operators.EQUAL && Parser.checkTypes([a, b], Rules.EQUAL, properties))
            || (oper in Operators.ARR && Parser.checkTypes([a, b], Rules.ARR, properties) && a in properties && !(b in properties))
        ) {
            Parser.buildQuery(queryValues, oper, properties);
            values.push(Tokens.BOOL);
            return true;
        }
        return false;
    }

    private static checkTypes(pair: Rule, array: Rule[], properties: InventorySchema): boolean {
        if (pair[0] in properties)
            pair[0] = properties[pair[0]];
        if (pair[1] in properties)
            pair[1] = properties[pair[1]];
        return array.includes(pair);
    }

    private static buildQuery(queryValues: string[], oper: string, properties: InventorySchema) {
        let b = queryValues.pop();
        let a = b;
        if (!(oper in Operators.BOOL_UN))
            a = queryValues.pop();
        const operation = MONGO_OPERATORS[oper];
        const booleanOperation = oper in Operators.BOOL_UN || oper in Operators.BOOL_BIN;
        if (booleanOperation && a in properties)
            a = MONGO_OPERATORS['=='](a, Operators.TRUE, properties);
        if (booleanOperation && b in properties)
            b = MONGO_OPERATORS['=='](b, Operators.TRUE, properties);
        const result = operation(a, b, properties);
        queryValues.push(result);
    }
}

export default Parser;