/**
 * Check if two list are the same
 * @param A T[]
 * @param B T[]
 * @return boolean
 **/
export const listEqual = <T>(A: T[], B: T[]): boolean =>
    A.length === B.length && A.every(a => B.includes(a)) && B.every(b => A.includes(b));
