import { en } from '../../i18n/en';
import { PlaceholderScreen } from '../../ui/components/PlaceholderScreen';
import { panelAlpha } from '../../ui/theme/tokens';

export default function ProfileScreen() {
  return <PlaceholderScreen title={en.tabs.profile} body={en.placeholder.profile} alpha={panelAlpha.profile} />;
}
