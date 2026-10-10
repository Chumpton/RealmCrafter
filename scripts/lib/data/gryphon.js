// Wynx, Campton's gryphon (creator ask 2026-10-05): double-tap space summons her under you; she runs, jumps, takes off,
// flies, sprints while Shift is held in both, lands; E gets off and she follows you; E beside her gets back on. Every tuned number here.
export const WYNX = {
  name: 'Wynx',
  tilt: 0,                           // share of the bank and dive pitch her body leans in flight (Campton 2026-10-06: rider must stay in the saddle; the rider cannot lean, so she flies level)
  bodyYaw: 180,                      // the golden gryphon upload faces +Z: her body turns half round onto the rider's heading
  seat: { stand: { y: 1.22, fwd: 0.15 }, fly: { y: 0.67, fwd: 0.1 } }, // rider feet in her local units (x her template scale = m); fwd toward her head. Measured by eye on her back 2026-10-06
  stepOff: 1.7,                      // m to her right when you get off
  run: 19.5, fly: 33,                // m/s on W, ground and air (Campton 2026-10-09: +50%, was 13 / 22)
  climb: 15,                         // m/s up on space / down on C while flying
  jump: 9.5, grav: 24, lift: 12, ease: 6, turn: 420, ceiling: 900,
  sprint: { ground: 36, air: 60, ease: 3 }, // +50% 2026-10-09 (was 24 / 40) // Shift held (Campton 2026-10-05: "constant sprint instead of dash"): m/s, eased in
  wings: { hover: 0.75, cruise: 1.05, beat: 44 }, // flaps per second idle in the air / moving, and the stroke in degrees (Campton: slower in idle flight)
  follow: { gap: 5.5, side: 4.5, rest: 3.5, walk: 6, run: 22, fly: 36, overFly: 28, warp: 40, airGap: 2.5, leash: 250 },
  // off her back, you standing still (Campton 2026-10-09): after `after` s she shows off (an orbit + a loop in front of you), then
  // picks from `cycle`. pitchSign/rollSign: which way her body pitches nose-up / banks in this model's frame.
  idle: { after: 10, cycle: ['patrol', 'soar', 'watch', 'show', 'patrol'], pitchSign: -1, rollSign: 1, watch: 7,
    show: { ahead: 11, height: 7, radius: 7, lap: 4.5, bank: 28, loopR: 4.5, loopTime: 2.6 },
    patrol: { radius: 9, pace: 2.4, step: 50, time: 28 },
    soar: { radius: 16, height: 20, pace: 11, time: 22 } },
  call: { from: { back: 45, up: 25 }, giveUp: 20 }, // double-tap with her away: she flies in from this far; after giveUp s you're on her anyway
  tap: 320,                          // ms between two spaces that call her
  noTap: ['pa_28744a7fc0a3ce8b63c72a3c4cc2fcd9'], // (forge 2026-10-05) userIds that never summon a mount (double-tap Wynx, Z horse): forge off, everyone else keeps both
  sounds: {
    screech: '/cdn/moodboard-lowpoly-cozy/sfx-gryphon-eagle-screech-call.mp3',
    flap: '/cdn/moodboard-lowpoly-cozy/sfx-big-wings-flapping-loop.mp3',
    gallop: '/cdn/moodboard-lowpoly-cozy/sfx-heavy-paws-gallop-on-dirt-loop.mp3',
    dash: '/cdn/moodboard-lowpoly-cozy/sfx-wind-rush-dash-whoosh.mp3',
    land: '/cdn/moodboard-lowpoly-cozy/sfx-heavy-wingbeat-landing-thump.mp3',
  },
};
export const WYNX_FX = `fx
pop gust burst=22 on=sphere(.7) life=.25..0.45 v=sdir()*(3..7) size=.04..0.08 acc=drag(3) col=<1,1,1> a=.7>0 sz=$size r=sprite(ember,add,velocity,.06)
pop feather burst=7 on=sphere(.6) life=1.4..2.2 v=sdir()*(1..2.2)+up(.6) size=.09..0.14 spin=-5..5 acc=grav()*.12+drag(2.2) col=<.93,.9,.82> a=1>.7:1>0 sz=$size rot=$age*$spin r=sprite(soft-disc,alpha)`;
