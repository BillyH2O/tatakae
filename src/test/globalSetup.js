// Tests run in a fixed zone with DST so midnight/DST cases are deterministic.
module.exports = async () => {
  process.env.TZ = 'Europe/Paris';
};
