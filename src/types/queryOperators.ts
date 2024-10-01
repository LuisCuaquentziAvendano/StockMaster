export class Operators {
    static readonly OPEN_PAREN = '(';
    static readonly CLOSE_PAREN = ')';
    static readonly NUM_OPER = Object.freeze({
        '*': 4,
        '/': 4,
        '%': 4,
        '+': 3,
        '-': 3
    });
    static readonly EQUAL = Object.freeze({
        '==': 2,
        '!=': 2
    });
    static readonly NUM_EQ = Object.freeze({
        '<=': 2,
        '>=': 2,
        '<': 2,
        '>': 2
    });
    static readonly STR = Object.freeze({
        'like': 2
    });
    static readonly ARR = Object.freeze({
        'includes': 2
    });
    static readonly BOOL_UN = Object.freeze({
        'not': 1
    });
    static readonly BOOL_BIN = Object.freeze({
        'and': 0,
        'or': 0
    });
    static readonly ALL: Record<string, number> = Object.freeze({
        ...Operators.NUM_OPER,
        ...Operators.EQUAL,
        ...Operators.NUM_EQ,
        ...Operators.STR,
        ...Operators.ARR,
        ...Operators.BOOL_UN,
        ...Operators.BOOL_BIN
    });
}