describe('test time zone', () => {
  it('runs in Europe/Paris with DST (proves globalSetup)', () => {
    expect(process.env.TZ).toBe('Europe/Paris');
    expect(new Date(2026, 9, 25, 0, 0).getTimezoneOffset()).toBe(-120); // CEST until 03:00
    expect(new Date(2026, 9, 26, 0, 0).getTimezoneOffset()).toBe(-60); // CET
    expect(new Date(2026, 2, 29, 4, 0).getTimezoneOffset()).toBe(-120);
  });
});
