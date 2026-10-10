// Interface style (creator 2026-10-09: "keep old u.i and allow in options to swap between current OSRS ui and 3rd Person UI").
// O → Options → Display → Interface style writes player.state.settings.hudSkin: 0 = OSRS (the classic HUD, untouched), 1 = 3rd Person (the gold-and-iron kit).
// Every kit skin asks kitOn(player) and draws its kit art only when it is true; otherwise it returns the OSRS markup exactly as before.
export const kitOn = (player) => (player?.state?.settings?.hudSkin ?? 1) === 1;
