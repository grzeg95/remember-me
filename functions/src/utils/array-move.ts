export function arrayMove<T>(arr: T[], fromIndex: number, toIndex: number) {

  if (fromIndex === toIndex) return;

  const element = arr[fromIndex];

  if (fromIndex < toIndex) {
    for (let i = fromIndex; i < toIndex; i++) {
      arr[i] = arr[i + 1];
    }
  } else {
    for (let i = fromIndex; i > toIndex; i--) {
      arr[i] = arr[i - 1];
    }
  }

  arr[toIndex] = element;
}
