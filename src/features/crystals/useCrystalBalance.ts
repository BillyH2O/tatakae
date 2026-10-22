import { useQuery } from '../../hooks/useQuery';
import { getCrystalBalance } from './wallet';

export function useCrystalBalance(): number | undefined {
  return useQuery(['wallet'], getCrystalBalance).data;
}
