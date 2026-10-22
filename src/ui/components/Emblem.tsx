import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '../theme/tokens';

/** Original default avatar: a stylized blade crossing a crescent moon. */
export function Emblem({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Circle cx={20} cy={20} r={19.5} fill={colors.nightRaised} stroke={colors.borderStrong} strokeWidth={1} />
      <Path d="M27 9a12 12 0 1 0 4 17a10 10 0 1 1 -4 -17z" fill={colors.actionMuted} stroke={colors.actionBright} strokeWidth={1} />
      <Path d="M28 8 L30 10 L16 26 L14 24 Z" fill={colors.text} />
      <Path d="M12 25 L17 30 M13 29 L11 31" stroke={colors.textMuted} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
