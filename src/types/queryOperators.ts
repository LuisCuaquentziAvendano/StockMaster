export enum Operators {
    OPEN_PAREN = '(',
    CLOSE_PAREN = ')',
    MULTIPLICATION = '*',
    DIVISION = '/',
    MODULUS = '%',
    SUM = '+',
    SUBTRACTION = '-',
    LESS_THAN_EQUAL = '<=',
    GREATER_THAN_EQUAL = '>=',
    LESS_THAN = '<',
    GREATER_THAN = '>',
    LIKE = 'like',
    INCLUDES = 'includes',
    NOT = 'not',
    AND = 'and',
    OR = 'or',
    AND_SPECIAL = '-and-',
    EQUALS = '==',
    NOT_EQUALS = '!='
}

export class Operators2 {
    static readonly NUM_OPER = Object.freeze({
        [Operators.MULTIPLICATION]: 4,
        [Operators.DIVISION]: 4,
        [Operators.MODULUS]: 4,
        [Operators.SUM]: 3,
        [Operators.SUBTRACTION]: 3
    });
    static readonly EQUAL = Object.freeze({
        [Operators.EQUALS]: 2,
        [Operators.NOT_EQUALS]: 2
    });
    static readonly NUM_EQ = Object.freeze({
        [Operators.LESS_THAN_EQUAL]: 2,
        [Operators.GREATER_THAN_EQUAL]: 2,
        [Operators.LESS_THAN]: 2,
        [Operators.GREATER_THAN]: 2
    });
    static readonly STR = Object.freeze({
        [Operators.LIKE]: 2
    });
    static readonly ARR = Object.freeze({
        [Operators.INCLUDES]: 2
    });
    static readonly BOOL_UN = Object.freeze({
        [Operators.NOT]: 1
    });
    static readonly BOOL_BIN = Object.freeze({
        [Operators.AND]: 0,
        [Operators.OR]: 0,
        [Operators.AND_SPECIAL]: -1
    });
    static readonly ALL: Record<string, number> = Object.freeze({
        ...Operators2.NUM_OPER,
        ...Operators2.EQUAL,
        ...Operators2.NUM_EQ,
        ...Operators2.STR,
        ...Operators2.ARR,
        ...Operators2.BOOL_UN,
        ...Operators2.BOOL_BIN
    });
}