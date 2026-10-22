import appJson from '../app.json';
import pkg from '../package.json';

describe('app identity', () => {
  it('uses the exact Tatakae name everywhere', () => {
    expect(appJson.expo.name).toBe('Tatakae');
    expect(appJson.expo.slug).toBe('tatakae');
    expect(appJson.expo.scheme).toBe('tatakae');
    expect(pkg.name).toBe('tatakae');
    expect(appJson.expo.ios.bundleIdentifier).toBe('com.billyh2o.tatakae');
    expect(appJson.expo.android.package).toBe('com.billyh2o.tatakae');
  });
});
