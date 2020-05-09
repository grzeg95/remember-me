/**
 * @function keysEqual
 * Check if two keys lists are the same
 * @param A string[] -> A <==> Array.from(new Set(A))
 * @param B string[] -> B <==> Array.from(new Set(B))
 * @return boolean
 **/
export const keysEqual = (A: string[], B: string[]): boolean => {

  if (A.length !== B.length) {
    return false;
  }

  return !A.some((a) => !B.includes(a));
};
