import { tabForPath } from '../TabBar';

describe('tabForPath', () => {
  it('highlights the tab that owns a pushed screen', () => {
    expect(tabForPath('/')).toBe('/');
    expect(tabForPath('/focus')).toBe('/');
    expect(tabForPath('/categories')).toBe('/');
    expect(tabForPath('/quests')).toBe('/quests');
    expect(tabForPath('/quest/new')).toBe('/quests');
    expect(tabForPath('/quest/task/abc')).toBe('/quests');
    expect(tabForPath('/stats')).toBe('/stats');
    expect(tabForPath('/sessions')).toBe('/stats');
    expect(tabForPath('/session/abc/edit')).toBe('/stats');
    expect(tabForPath('/profile')).toBe('/profile');
    expect(tabForPath('/settings/timer')).toBe('/profile');
  });
});
