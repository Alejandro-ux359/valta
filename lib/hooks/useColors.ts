import { useStore } from '../store/useStore';
import { Colors, DarkColors } from '../constants/theme';

export function useColors() {
  const isDarkMode = useStore((s) => s.isDarkMode);
  return isDarkMode ? DarkColors : Colors;
}