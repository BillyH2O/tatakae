import { DataEvents } from '../dataEvents';

describe('DataEvents', () => {
  it('notifies subscribers and supports unsubscribe', () => {
    const events = new DataEvents();
    const listener = jest.fn();
    const off = events.subscribe(listener);
    events.emit('sessions', 'xp');
    expect(listener).toHaveBeenCalledWith(['sessions', 'xp']);
    off();
    events.emit('goals');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
