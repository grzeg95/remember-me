export const handleTabIndex = ($event: KeyboardEvent | MouseEvent) => {
  if ($event instanceof KeyboardEvent) {
    if ($event.code === 'Tab') {
      return true;
    }
    if ($event.code !== 'Space' && $event.code !== 'Enter') {
      return true;
    }
  }
  return false;
};
