import { circle, ellipse, item, line, poly, rays, rrect, scallop, star } from '../draw.mjs';

const SKINS = ['#F6D3B7', '#E2B48C', '#B97F55', '#8A5636'];
const OUTFITS = ['#3D7DCA', '#E4572E', '#2E8B78', '#8B5FBF', '#D9576B', '#F2A6C1', '#5A7184'];

const people = [
  'Artist', 'Chef', 'Engineer', 'Farmer', 'Firefighter', 'Graduate', 'Musician', 'Nurse', 'Photographer', 'Pilot',
  'Police officer', 'Scientist', 'Shopkeeper', 'Athlete', 'Baker', 'Barista', 'Builder', 'Designer', 'Gardener',
  'Journalist', 'Lawyer', 'Mechanic', 'Painter', 'Parent', 'Programmer', 'Receptionist', 'Researcher', 'Runner',
  'Singer', 'Speaker', 'Traveler', 'Volunteer', 'Writer', 'Yoga teacher', 'Delivery rider', 'Entrepreneur', 'Librarian',
];

function person(name, index) {
  const skin = SKINS[index % SKINS.length];
  const outfit = OUTFITS[index % OUTFITS.length];
  const head = circle(100, 48, 18);
  const hair = index % 3 === 0 ? 'M82,47 Q82,24 100,24 Q118,24 118,47 Q108,38 96,39 Q88,40 82,47 Z' : 'M83,42 Q88,24 100,25 Q114,25 117,42';
  const torso = rrect(76, 70, 48, 58, 8);
  const legs = ['M86,128 L84,174', 'M114,128 L116,174'];
  const accessory = index % 5 === 0
    ? [rrect(130, 104, 30, 22, 3), line(136, 112, 154, 112)]
    : index % 5 === 1
      ? [circle(148, 56, 16), line(136, 56, 160, 56), line(148, 44, 148, 68)]
      : index % 5 === 2
        ? [poly([[136, 76], [160, 76], [166, 112], [132, 112]], true), line(136, 84, 160, 84)]
        : index % 5 === 3
          ? [circle(150, 120, 14), line(150, 106, 150, 134), line(136, 120, 164, 120)]
          : [poly([[136, 88], [160, 78], [166, 108], [142, 118]], true), line(142, 92, 158, 86)];
  return item('characters', `ch-extra-${index + 1}`, name, ['people', 'character', name.toLowerCase()], [
    head, hair, circle(94, 48, 2), circle(106, 48, 2), 'M94,57 Q100,62 106,57',
    torso, line(76, 78, 60, 112), circle(58, 116, 5), line(124, 78, 138, 110), circle(140, 114, 5),
    ...legs, ellipse(82, 176, 10, 4), ellipse(118, 176, 10, 4), ...accessory,
  ], [
    { d: head, c: skin },
    { d: torso, c: outfit },
    { d: circle(58, 116, 5), c: skin },
    { d: circle(140, 114, 5), c: skin },
    { d: ellipse(82, 176, 10, 4), c: '#2B2B2B' },
    { d: ellipse(118, 176, 10, 4), c: '#2B2B2B' },
  ]);
}

const badges = [
  'Circle label', 'Oval label', 'Diamond badge', 'Hexagon badge', 'Heart badge', 'Cloud label', 'Sparkle badge',
  'Sun badge', 'Seal badge', 'Ticket badge', 'Price tag', 'Bookmark', 'Map pin', 'Flag marker', 'Shield badge',
];
const callouts = [
  'Round callout', 'Square callout', 'Note callout', 'Quote callout', 'Chat bubble', 'Idea bubble', 'Warning callout',
  'Info callout', 'Question callout', 'Pointer callout', 'Label callout', 'Caption callout', 'Sticky note', 'Message flag', 'Speech cloud',
];
const diagrams = [
  'Process arrow', 'Loop arrow', 'Up arrow', 'Down arrow', 'Left arrow', 'Right arrow', 'Double arrow', 'Flow connector',
  'Timeline marker', 'Step marker', 'Focus frame', 'Dashed frame', 'Corner frame', 'Divider', 'Highlight circle',
];

function shape(index, name, group) {
  const color = OUTFITS[index % OUTFITS.length];
  const outer = group === 0
    ? index % 4 === 0 ? circle(100, 100, 70) : index % 4 === 1 ? ellipse(100, 100, 76, 58) : index % 4 === 2 ? star(100, 100, 76, 58, 6 + (index % 3)) : scallop(100, 100, 64, 8 + (index % 4), 18)
    : group === 1
      ? `M36,48 L164,48 Q176,48 176,60 L176,126 Q176,138 164,138 L108,138 L${76 + (index % 3) * 10},166 L${82 + (index % 3) * 10},138 L36,138 Q24,138 24,126 L24,60 Q24,48 36,48 Z`
      : index % 3 === 0 ? poly([[36, 100], [132, 100], [132, 72], [174, 112], [132, 152], [132, 124], [36, 124]], true)
        : index % 3 === 1 ? rrect(34, 44, 132, 112, 14)
          : poly([[100, 24], [174, 100], [100, 176], [26, 100]], true);
  const detail = group === 2 && index % 3 === 0
    ? [line(54, 112, 142, 112), line(132, 86, 158, 112), line(132, 138, 158, 112)]
    : [line(64, 84, 136, 84), line(58, 102, 142, 102), line(68, 120, 132, 120)];
  return item('shapes', `sh-extra-${index + 1}`, name, ['shapes', group === 2 ? 'arrow' : 'callout', name.toLowerCase()], [
    outer, ...detail, circle(64, 64, 5), circle(136, 64, 5), circle(64, 136, 5), circle(136, 136, 5),
    ...rays(100, 100, 42, 54, 4, 45), line(46, 164, 154, 164), line(46, 36, 154, 36),
  ], [
    { d: outer, c: color },
    { d: circle(64, 64, 5), c: '#FFFFFF' },
    { d: circle(136, 64, 5), c: '#FFFFFF' },
    { d: circle(64, 136, 5), c: '#FFFFFF' },
    { d: circle(136, 136, 5), c: '#FFFFFF' },
  ]);
}

export default [
  ...people.map(person),
  ...badges.map((name, i) => shape(i, name, 0)),
  ...callouts.map((name, i) => shape(i + badges.length, name, 1)),
  ...diagrams.map((name, i) => shape(i + badges.length + callouts.length, name, 2)),
];
