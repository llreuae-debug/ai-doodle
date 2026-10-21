import { arc, circle, ellipse, item, line, poly, rrect } from '../draw.mjs';

const SKIN = ['#F6D3B7', '#E2B48C', '#B97F55', '#8A5636'];

/**
 * A standing person, front view, head at the top and feet at y≈183. Options pick the hair, dress
 * (shalwar kameez, shirt, suit, coat, frock), dupatta or hijab, and what the arms do.
 */
function person(o) {
  const S = [];
  const F = [];
  const skin = SKIN[o.skin ?? 0];
  const kameez = o.top === 'kameez' || o.top === 'coat';
  const hem = kameez ? 132 : o.top === 'frock' ? 124 : 112;

  // Hair behind the head, hijab.
  if (o.hair === 'long') {
    S.push('M83,46 Q79,68 84,82 L116,82 Q121,68 117,46');
    F.push({ d: 'M82,44 Q80,24 100,24 Q120,24 118,44 Q121,68 116,82 L84,82 Q79,68 82,44 Z', c: o.hairC ?? '#3B2A20' });
  }
  if (o.hijab) {
    const h = 'M80,50 Q78,20 100,20 Q122,20 120,50 Q122,70 132,78 L68,78 Q78,70 80,50 Z';
    S.push('M80,50 Q78,20 100,20 Q122,20 120,50 Q122,70 132,78', 'M80,50 Q78,70 68,78');
    F.push({ d: h, c: o.hijabC ?? '#4F7A6E' });
  }

  // Head and face.
  S.push(circle(100, 44, 17));
  F.push({ d: circle(100, 44, 17), c: skin });
  if (o.hair === 'short' || o.hair === 'long' || o.hair === 'bun' || o.hair === 'ponytails') {
    const fringe = 'M83,42 Q84,26 100,26 Q116,26 117,42 Q106,33 94,35 Q87,37 83,42 Z';
    S.push(fringe);
    F.push({ d: fringe, c: o.hairC ?? '#2F241C' });
  }
  if (o.hair === 'bun') {
    S.push(circle(100, 22, 6));
    F.push({ d: circle(100, 22, 6), c: o.hairC ?? '#2F241C' });
  }
  if (o.hair === 'ponytails') {
    for (const s of [-1, 1]) {
      const tail = `M${100 + s * 17},38 Q${100 + s * 30},40 ${100 + s * 28},58 Q${100 + s * 22},50 ${100 + s * 17},46 Z`;
      S.push(tail);
      F.push({ d: tail, c: o.hairC ?? '#2F241C' });
    }
  }
  if (o.hair === 'bald') S.push(arc(100, 44, 19, 160, 200), arc(100, 44, 19, -20, 20));
  if (o.cap) {
    const cap = 'M84,36 Q84,23 100,23 Q116,23 116,36 Z';
    S.push(cap, line(88, 31, 112, 31));
    F.push({ d: cap, c: '#F4F1E8' });
  }
  S.push(circle(94, 43, 1.6), circle(106, 43, 1.6));
  if (o.glasses) S.push(circle(94, 43, 5), circle(106, 43, 5), line(99, 43, 101, 43));
  if (o.beard) {
    const beard = 'M84,46 Q86,66 100,68 Q114,66 116,46 Q108,56 100,56 Q92,56 84,46 Z';
    S.push(beard);
    F.push({ d: beard, c: o.beardC ?? '#9A9A9A' });
  } else S.push('M94,51 Q100,56 106,51');
  S.push(line(96, 61, 96, 66), line(104, 61, 104, 66));

  // Clothes.
  const shoulders = 'M78,70 Q80,66 92,65 L108,65 Q120,66 122,70';
  let top;
  if (o.top === 'frock') top = 'M86,66 L114,66 L130,124 L70,124 Z';
  else top = `${shoulders} L${kameez ? 126 : 120},${hem} L${kameez ? 74 : 80},${hem} Z`;
  if (o.bottom === 'shalwar') {
    const shalwar = 'M82,130 L118,130 Q121,158 114,176 L102,176 L100,144 L98,176 L86,176 Q79,158 82,130 Z';
    S.push(shalwar, line(87, 171, 97, 171), line(103, 171, 113, 171));
    F.push({ d: shalwar, c: o.bottomC ?? '#EDE6D3' });
  } else if (o.bottom === 'trousers') {
    const trousers = `M82,${hem - 2} L118,${hem - 2} L116,176 L103,176 L100,126 L97,176 L84,176 Z`;
    S.push(trousers);
    F.push({ d: trousers, c: o.bottomC ?? '#3B4252' });
  } else {
    S.push(line(91, 124, 91, 174), line(109, 124, 109, 174));
  }
  S.push(top);
  F.push({ d: top, c: o.topC ?? '#E9E4D4' });
  if (o.top === 'kameez') S.push('M94,65 L100,73 L106,65', line(100, 73, 100, 92), line(77, 116, 76, 132), line(123, 116, 124, 132));
  if (o.top === 'shirt' || o.top === 'suit') S.push('M93,65 L100,73 L107,65');
  if (o.top === 'suit') S.push('M92,65 L97,92 L100,112', 'M108,65 L103,92 L100,112');
  if (o.top === 'coat') S.push('M92,65 L100,96 L108,65', line(100, 96, 100, 132), rrect(108, 104, 11, 10, 2));
  if (o.top === 'frock') S.push('M74,110 Q100,116 126,110');
  if (o.tie) {
    const tie = 'M98,70 L102,70 L104,90 L100,96 L96,90 Z';
    S.push(tie);
    F.push({ d: tie, c: o.tieC ?? '#C8323C' });
  }
  if (o.waistcoat) {
    const vest = 'M85,66 L95,66 L100,82 L105,66 L115,66 L118,114 L82,114 Z';
    S.push(vest, circle(101, 90, 1.2), circle(101, 100, 1.2));
    F.push({ d: vest, c: o.waistcoatC ?? '#3F5D7D' });
  }
  if (o.dupatta) {
    const d = 'M76,66 Q100,88 124,66 Q134,94 130,124 L123,124 Q125,98 118,80 Q100,92 82,80 Q76,98 78,124 L71,124 Q66,94 76,66 Z';
    S.push(d);
    F.push({ d, c: o.dupattaC ?? '#F2B544' });
  }
  if (o.stetho) S.push('M92,66 Q88,90 100,98 Q112,90 108,66', circle(100, 102, 4));
  if (o.backpack) S.push('M86,67 Q85,84 88,100', 'M114,67 Q115,84 112,100');

  // Arms.
  const handL = o.left === 'book' ? [88, 96] : [72, 118];
  if (o.left === 'book') S.push('M79,70 Q72,90 88,96');
  else S.push('M79,70 Q70,92 72,114');
  S.push(circle(handL[0], handL[1], 4.5));
  F.push({ d: circle(handL[0], handL[1], 4.5), c: skin });
  if (o.left === 'book') {
    const book = 'M80,86 L100,90 L100,108 L80,104 Z';
    S.push(book, line(84, 92, 96, 94), line(84, 97, 96, 99));
    F.push({ d: book, c: o.bookC ?? '#E76F51' });
  }
  if (o.left === 'cane') S.push('M72,122 L66,182', 'M72,122 Q72,114 80,116');

  let handR = [128, 118];
  if (o.right === 'wave') {
    handR = [140, 36];
    S.push('M121,70 Q138,62 140,41', arc(140, 36, 11, -70, -10), arc(140, 36, 16, -70, -10));
  } else if (o.right === 'point') {
    handR = [160, 62];
    S.push('M121,70 Q140,74 156,64', line(166, 58, 172, 54));
  } else S.push('M121,70 Q130,92 128,114');
  S.push(circle(handR[0], handR[1], 4.5));
  F.push({ d: circle(handR[0], handR[1], 4.5), c: skin });
  if (o.right === 'briefcase') {
    const bag = rrect(118, 122, 26, 20, 3);
    S.push('M125,122 L125,118 L137,118 L137,122', bag, line(118, 130, 144, 130));
    F.push({ d: bag, c: '#7A4E2D' });
  }

  // Feet.
  S.push(ellipse(91, 180, 8, 3.5), ellipse(109, 180, 8, 3.5));
  F.push({ d: ellipse(91, 180, 8, 3.5), c: '#2B2B2B' }, { d: ellipse(109, 180, 8, 3.5), c: '#2B2B2B' });
  return [S, F];
}

const ch = (id, name, tags, o) => item('characters', id, name, ['people', ...tags], ...person(o));

export default [
  ch('ch-man-kameez', 'Man – shalwar kameez', ['south asian', 'everyday'], {
    hair: 'short', top: 'kameez', topC: '#E9E4D4', bottom: 'shalwar', waistcoat: true, skin: 1,
  }),
  ch('ch-woman-kameez', 'Woman – shalwar kameez', ['south asian', 'everyday'], {
    hair: 'long', top: 'kameez', topC: '#D9576B', bottom: 'shalwar', bottomC: '#F6D7A7', dupatta: true, skin: 1,
  }),
  ch('ch-elder-topi', 'Elder with cane', ['south asian', 'family', 'faith'], {
    hair: 'bald', cap: true, beard: true, top: 'kameez', topC: '#F4F1E8', bottom: 'shalwar', left: 'cane', skin: 2,
  }),
  ch('ch-teacher-hijab', 'Teacher with book', ['education', 'faith'], {
    hijab: true, hijabC: '#2E8B78', top: 'kameez', topC: '#F28C63', bottom: 'shalwar', bottomC: '#F6E7C8', left: 'book', right: 'point', skin: 0,
  }),
  ch('ch-doctor', 'Doctor', ['health'], {
    hair: 'bun', hairC: '#1F1A17', top: 'coat', topC: '#FFFFFF', bottom: 'trousers', bottomC: '#5A7184', stetho: true, skin: 2,
  }),
  ch('ch-businessman', 'Businessman', ['business'], {
    hair: 'short', top: 'suit', topC: '#2F3E55', bottom: 'trousers', bottomC: '#2F3E55', tie: true, right: 'briefcase', skin: 3,
  }),
  ch('ch-student', 'Student waving', ['education', 'kids'], {
    hair: 'short', top: 'shirt', topC: '#CFE3F7', bottom: 'trousers', bottomC: '#4A5568', backpack: true, right: 'wave', skin: 1,
  }),
  ch('ch-girl', 'Girl in frock', ['kids', 'family'], {
    hair: 'ponytails', hairC: '#3B2A20', top: 'frock', topC: '#F2A6C1', right: 'wave', skin: 0,
  }),
];
