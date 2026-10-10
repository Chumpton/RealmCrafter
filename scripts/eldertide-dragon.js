// The Green Dragon of Eldertide: breathes its Idle clip forever, turns its head to no one, and gives the first quest on E.
// Its ! comes from scripts/quest-player.js (QUEST_OF_NPC['green-dragon']); the mark's height is QUESTS.eldertide.markY.
import { QUEST_OF_NPC } from './lib/data/quests.js';
const IDLE = { clip: 'Idle', loop: 'loop', weight: 1, speed: 1 };
export function onSpawn(ctx) { ctx.self.anim.body = IDLE; }
export const ears = {
  press: (ctx, { by }) => {
    const qid = QUEST_OF_NPC['green-dragon'], who = ctx.getObject(by);
    if (!ctx.self.anim.body) ctx.self.anim.body = IDLE;
    if (qid && who && ctx.self.id === 'green-dragon' && who.state?.quests?.[qid] !== 'done') { ctx.emit('questTalk', { npc: 'green-dragon' }, { to: by }); return; }
    ctx.emit('toast', { message: ctx.self.id === 'green-dragon' ? 'The dragon rumbles, content. Eldertide remembers you.' : 'The dragon rumbles low and watches you pass.', duration: 4 }, { audience: { player: by } });
  },
};
