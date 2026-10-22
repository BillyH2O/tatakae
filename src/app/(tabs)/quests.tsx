import { en } from '../../i18n/en';
import { PlaceholderScreen } from '../../ui/components/PlaceholderScreen';
import { panelAlpha } from '../../ui/theme/tokens';

export default function QuestsScreen() {
  return <PlaceholderScreen title={en.tabs.quests} body={en.placeholder.quests} alpha={panelAlpha.quests} />;
}
