// REAL-TIME DAY (LAMP-CLOCK-PLAN rev 2, forge Oct 5 2026): the den's sky runs on the real wall clock, US Pacific, with the
// real sun of today's date. One table; scripts/lib/real-clock.js does the math, everyone imports that.
export const RC = {
  // US Pacific: PST (UTC-8), PDT (UTC-7) from the 2nd Sunday of March 02:00 PST to the 1st Sunday of November 02:00 PDT.
  // Checks: PST from Sun Nov 1 2026 02:00 PDT (09:00 UTC); PDT from Sun Mar 14 2027 02:00 PST (10:00 UTC).
  tz: { name: 'Pacific', std: -8, dst: -7, stdLabel: 'PST', dstLabel: 'PDT', dstStart: { month: 3, nth: 2, hour: 2 }, dstEnd: { month: 11, nth: 1, hour: 2 } },
  lat: 47,          // the den's latitude (forge): real sunrise/sunset from the date
  lon: -122.33,     // Puget Sound longitude, so the Pacific clock times the sun like the real Northwest
  zenith: 90.833,   // official sunrise/sunset (refraction + the sun's half-disc)
  skyRise: 6, skySet: 18, // the sky curves' own sunrise/sunset keys: real sunrise maps to 6.0, real sunset to 18.0
  anchorMs: 3600000, // re-read the server wall clock (SQL) hourly
  retryMs: 30000,    // a failed SQL read retries after this
  reaimMs: 900000,   // atmosphere.cycle re-aimed every 15 min (and at each real sunrise/sunset)
  easeMs: 60000,     // the one-time cutover ease from the old game hour to the real one
  // the lamp backstop (lane 3 reads it): wall-time windows from today's sun
  backstop: { onAfterSetMin: 75, onBeforeRiseMin: 40, offAfterRiseMin: 60, offBeforeSetMin: 60 },
};
