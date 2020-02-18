export const listEqual = function<T>(A: T[], B: T[]): boolean {
    return A.length === B.length && A.every(a => B.includes(a)) && B.every(b => A.includes(b));
}
