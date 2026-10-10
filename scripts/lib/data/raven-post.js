// D8 · Odin's Raven Post: tuning and the scroll texts. Huginn (Thought) tells what he saw in the den; Muninn (Memory) keeps saga lines.
export const RAVEN_POST = {
  clipFile: 'anim/raven-post.yml',
  reach: 2.5,          // m, horizontal: the E must come from this close
  showSec: 16,         // the scroll rolls itself up after this long
  caw: '/cdn/moodboard-lowpoly-cozy/sfx-raven-caw.mp3',
  unfurl: '/cdn/moodboard-lowpoly-cozy/sfx-birchbark-scroll-unfurl.mp3',
  birds: {
    huginn: {
      name: 'Huginn', title: 'Thought', idle: 'idleHuginn',
      texts: [
        { lines: ['I watched the long hearth breathe at noon;', 'Rolf bent his ear to a sixth string\u2019s tune,', 'and the benches leaned to hear.'] },
        { lines: ['Over the board Sigrid walked her king to the corner', 'while Gunnar frowned into his beard.', 'The ravens know who wins.'] },
        { lines: ['Smoke from the clay oven at the west gable,', 'a loaf lifted warm on the peel \u2014', 'the goats watched it go.'] },
        { lines: ['A thread went up the Norns\u2019 loom today:', 'someone\u2019s hand, someone\u2019s fate.', 'The tree grows one band taller.'] },
      ],
    },
    muninn: {
      name: 'Muninn', title: 'Memory', idle: 'idleMuninn',
      texts: [
        { runes: '\u16CF\u16C1\u16A2\u16B1 \u16A0\u16C1 \u16CF\u16C1\u16C5 \u16A0\u16B1\u16C5\u16BE\u16CF\u16E6', lines: ['Cattle die, kinsmen die, you yourself will die;', 'but fame never dies for one who earns it well.'], src: 'H\u00e1vam\u00e1l 76' },
        { runes: '\u16C5\u16CB\u16B4 \u16A2\u16C5\u16C1\u16CF \u16C1\u16B4 \u16CB\u16CF\u16C5\u16BE\u16CF\u16C5', lines: ['An ash I know standing, named Yggdrasil,', 'a tall tree showered with shining clay.'], src: 'V\u00f6lusp\u00e1 19' },
        { runes: '\u16BC\u16A2\u16B4\u16C1\u16BE \u16A2\u16B4 \u16D8\u16A2\u16BE\u16C1\u16BE', lines: ['Huginn and Muninn fly each day over the wide world;', 'I fear for Thought that he not come back, yet I fear more for Memory.'], src: 'Gr\u00edmnism\u00e1l 20' },
        { runes: '\u16D2\u16B1\u16C5\u16BE\u16CF\u16E6 \u16C5\u16A0 \u16D2\u16B1\u16C5\u16BE\u16CF\u16C1 \u16D2\u16B1\u16C1\u16BE', lines: ['Brand kindles from brand till it burns out; fire is lit from fire;', 'a man grows wise by speech with men.'], src: 'H\u00e1vam\u00e1l 57' },
      ],
    },
  },
};
