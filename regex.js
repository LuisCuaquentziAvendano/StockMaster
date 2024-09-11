const OPEN_PAREN = '(';
const CLOSE_PAREN = ')';
const TRUE = 'true';
const FALSE = 'false';
const NUMBER = 'number';
const STRING = 'string';
const BOOLEAN = 'boolean';
const ARRAY = 'array';
const NULL = 'null';
const BOOLEAN_EVALUATED = 'boolean_evaluated';
const NUMBER_EVALUATED = 'number_evaluated';

const NUMBER_OPERATORS = Object.freeze({
    '+': 3,
    '-': 3,
    '*': 3,
    '/': 3,
    '%': 3
});
const GENERAL_COMPARISON = Object.freeze({
    '==': 2,
    '!=': 2
});
const NUMBER_COMPARISON = Object.freeze({
    '<=': 2,
    '>=': 2,
    '<': 2,
    '>': 2
});
const STRING_OPERATORS = Object.freeze({
    'like': 2
});
const ARRAY_OPERATORS = Object.freeze({
    'includes': 2
});
const UNARY_BOOLEAN_OPERATORS = Object.freeze({
    'not': 1
});
const BINARY_BOOLEAN_OPERATORS = Object.freeze({
    'and': 0,
    'or': 0
});
const OPERATORS = Object.freeze({
    ...NUMBER_OPERATORS,
    ...GENERAL_COMPARISON,
    ...NUMBER_COMPARISON,
    ...STRING_OPERATORS,
    ...ARRAY_OPERATORS,
    ...UNARY_BOOLEAN_OPERATORS,
    ...BINARY_BOOLEAN_OPERATORS
});

const KEYWORDS = [
    ...Object.keys(OPERATORS),
    OPEN_PAREN,
    CLOSE_PAREN,
    TRUE,
    FALSE,
    NUMBER,
    STRING,
    BOOLEAN,
    ARRAY,
    NULL,
    BOOLEAN_EVALUATED,
    NUMBER_EVALUATED
];

const STRING_REGEX = /^'[^']*'$/;
const PROPERTIES_REGEX = /^[a-z][a-z0-9]*$/;
const NUMBER_REGEX = /^-?\d+(\.\d+)?$/;
const SPACE_REGEX = /^\s+$/;
const QUERY_REGEX = new RegExp(`${STRING_REGEX.source.toString().slice(1,-1)}
                                |${PROPERTIES_REGEX.source.toString().slice(1,-1)}
                                |${NUMBER_REGEX.source.toString().slice(1,-1)}
                                |${KEYWORDS.map(k => k).join('|')}|.`
                                .replaceAll(/\s+/gi, '')
                                .replace('|(|', '|\\\(|')
                                .replace('|)|', '|\\\)|')
                                .replace('|+|', '|\\\+|')
                                .replace('|*|', '|\\\*|')
                                .replace('|/|', '|\\\/|'), 'gi');

const PROPERTIES = Object.freeze({
    price: NUMBER,
    price2: NUMBER,
    color: STRING,
    color2: STRING,
    tags: ARRAY,
    isnew: BOOLEAN,
    isnew2: BOOLEAN,
    stock: NUMBER
});

const CONVERSIONS = Object.freeze({
    '+': (a, b) => `{ $add: [${a}, ${b}] }`,
    '-': (a, b) => `{ $subtract: [${a}, ${b}] }`,
    '*': (a, b) => `{ $multiply: [${a}, ${b}] }`,
    '/': (a, b) => `{ $divide: [${a}, ${b}] }`,
    '%': (a, b) => `{ $mod: [${a}, ${b}] }`,
    '==': (a, b) => `{ $expr: { $eq: [${a}, ${b}] } }`,
    '!=': (a, b) => `{ $expr: { $ne: [${a}, ${b}] } }`,
    '<': (a, b) => `{ $expr: { $lt: [${a}, ${b}] } }`,
    '>': (a, b) => `{ $expr: { $gt: [${a}, ${b}] } }`,
    '<=': (a, b) => `{ $expr: { $lte: [${a}, ${b}] } }`,
    '>=': (a, b) => `{ $expr: { $gte: [${a}, ${b}] } }`,
    'like': (a, b) => `{
                            $addFields: {
                                regexPattern: {
                                    $concat: [".*", ${b}, ".*"] }
                                }
                            },
                            {
                                $match: {
                                    ${a}: {
                                        $regex: "$regexPattern",
                                        $options: "i"
                                    }
                                }
                            }
                        }`,
    'includes': (a, b) => `{ ${a}: { $in: [${b}] } }`,
    'not': (a) => `{ $not: ${a} }`,
    'and': (a, b) => `{ $and: [${a}, ${b}] }`,
    'or': (a, b) => `{ $or: [${a}, ${b}] }`
});

function testRegex(regex, flags, string) {
    return (new RegExp(regex, flags)).test(string);
}

function formatString(string) {
    return '"' + string
        .replaceAll(/[\n\t\r\b\f\v\0]/gi, '')
        .replaceAll('\\', '\\\\')
        .replaceAll('"', '\\"')
        .slice(1, -1) + '"';
}

function checkTypes(a, aType, b, bType) {
    return ([BOOLEAN_EVALUATED, NUMBER_EVALUATED].includes(a) || a in PROPERTIES)
        && (a === aType || PROPERTIES[a] === aType)
        && (b === undefined || b === bType || PROPERTIES[b] === bType);
}

function solve(values, opers) {
    if (values.length === 1 && opers.length === 0 && values[0] === BOOLEAN_EVALUATED)
        return true;
    if (values.length === 0 || opers.length === 0)
        return false;
    const b = values.pop();
    const oper = opers.pop();
    if (oper in UNARY_BOOLEAN_OPERATORS && checkTypes(b, BOOLEAN_EVALUATED)) {
        buildQuery(oper);
        values.push(BOOLEAN_EVALUATED);
        return true;
    }
    if (values.length === 0)
        return false;
    const a = values.pop();
    if (oper in NUMBER_OPERATORS && checkTypes(a, NUMBER, b, NUMBER)) {
        buildQuery(oper);
        values.push(NUMBER_EVALUATED);
        return true;
    }
    if (
        (oper in BINARY_BOOLEAN_OPERATORS && checkTypes(a, BOOLEAN_EVALUATED, b, BOOLEAN_EVALUATED))

        || (oper in NUMBER_COMPARISON && checkTypes(a, NUMBER, b, NUMBER))
        || (oper in NUMBER_COMPARISON && checkTypes(a, NUMBER_EVALUATED, b, NUMBER))
        || (oper in NUMBER_COMPARISON && checkTypes(a, NUMBER, b, NUMBER_EVALUATED))
        || (oper in NUMBER_COMPARISON && checkTypes(a, NUMBER_EVALUATED, b, NUMBER_EVALUATED))

        || (oper in STRING_OPERATORS && checkTypes(a, STRING, b, STRING))

        || (oper in ARRAY_OPERATORS && checkTypes(a, ARRAY, b, NUMBER))
        || (oper in ARRAY_OPERATORS && checkTypes(a, ARRAY, b, STRING))
        || (oper in ARRAY_OPERATORS && checkTypes(a, ARRAY, b, BOOLEAN))

        || (oper in GENERAL_COMPARISON && checkTypes(a, STRING, b, STRING))
        || (oper in GENERAL_COMPARISON && checkTypes(a, BOOLEAN, b, BOOLEAN))
        || (oper in GENERAL_COMPARISON && checkTypes(a, NUMBER, b, NUMBER))
        || (oper in GENERAL_COMPARISON && checkTypes(a, NUMBER_EVALUATED, b, NUMBER))
        || (oper in GENERAL_COMPARISON && checkTypes(a, NUMBER, b, NUMBER_EVALUATED))
        || (oper in GENERAL_COMPARISON && checkTypes(a, NUMBER_EVALUATED, b, NUMBER_EVALUATED))
        || (oper in GENERAL_COMPARISON && checkTypes(a, NUMBER, b, NULL))
        || (oper in GENERAL_COMPARISON && checkTypes(a, STRING, b, NULL))
        || (oper in GENERAL_COMPARISON && checkTypes(a, BOOLEAN, b, NULL))
        || (oper in GENERAL_COMPARISON && checkTypes(a, ARRAY, b, NULL))
    ) {
        buildQuery(oper);
        values.push(BOOLEAN_EVALUATED);
        return true;
    }
    return false;
}

function buildQuery(oper) {
    const b = queryValues.pop();
    let result;
    if (oper in UNARY_BOOLEAN_OPERATORS) {
        result = CONVERSIONS[oper](b in OPERATORS ? CONVERSIONS['=='](b, TRUE) : b);
        queryValues.push(result);
        return;
    }
    const a = queryValues.pop();
    if (oper in BINARY_BOOLEAN_OPERATORS) {
        result = CONVERSIONS[oper](
            a in OPERATORS ? CONVERSIONS['=='](a, TRUE) : a,
            b in OPERATORS ? CONVERSIONS['=='](b, TRUE) : b
        );
        queryValues.push(result);
        return;
    }
    result = CONVERSIONS[oper](a, b);
    queryValues.push(result);
}

const string = ' (isnew == true) and (price < 4) ';
const exp = string.match(QUERY_REGEX);
console.log(exp);
let values = [];
let opers = [];
let queryValues = [];
let validQuery = true;
for (let i = 0; i < exp.length && validQuery; i++) {
    if (testRegex(SPACE_REGEX, '', exp[i]))
        continue;
    if (exp[i] === OPEN_PAREN) {
        opers.push(exp[i]);
        continue;
    }
    if (exp[i] === CLOSE_PAREN) {
        if (opers.length > 0 && opers[opers.length-1] === OPEN_PAREN)
            opers.pop();
        else if (opers.length > 0) {
            validQuery = solve(values, opers);
            i--;
        }
        else
            validQuery = false;
        continue;
    }
    if (testRegex(NUMBER_REGEX, '', exp[i])) {
        values.push(NUMBER);
        queryValues.push(exp[i]);
        continue;
    }
    if (testRegex(STRING_REGEX, '', exp[i])) {
        values.push(STRING);
        queryValues.push(formatString(exp[i]));
        continue;
    }
    exp[i] = exp[i].toLowerCase();
    if (exp[i] === TRUE || exp[i] === FALSE) {
        values.push(BOOLEAN);
        queryValues.push(exp[i]);
        continue;
    }
    if (exp[i] === NULL) {
        values.push(NULL);
        queryValues.push(exp[i]);
        continue;
    }
    if (exp[i] in PROPERTIES) {
        values.push(exp[i]);
        queryValues.push(`"$${exp[i]}"`);
        continue;
    }
    if (exp[i] in OPERATORS) {
        if (opers.length == 0 || opers[opers.length-1] === OPEN_PAREN || OPERATORS[exp[i]] > OPERATORS[opers[opers.length-1]])
            opers.push(exp[i]);
        else {
            validQuery = solve(values, opers);
            i--;
        }
        continue;
    }
    validQuery = false;
}
while (validQuery && values.length >= 2 && opers.length >= 1)
    validQuery = solve(values, opers);
if (validQuery)
    validQuery = solve(values, opers);

if (validQuery) {
    console.log('Valid query');
    console.log(queryValues[0].replaceAll(/\s+/gi, ''));
}
else
    console.log('Invalid query');
