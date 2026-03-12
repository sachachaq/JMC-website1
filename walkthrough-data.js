// JMC Walkthrough Data

const STORE_NUMBERS = [
  { number: '3301', name: 'Troy Central Ave' },
  { number: '3302', name: 'Albany Main St' },
  { number: '3303', name: 'Schenectady Erie Blvd' },
  { number: '3304', name: 'Latham Loudon Rd' },
  { number: '3305', name: 'Colonie Wolf Rd' },
  { number: '3306', name: 'Clifton Park Plank Rd' },
  { number: '3307', name: 'Saratoga Springs Broadway' },
  { number: '3308', name: 'Glens Falls Quaker Rd' },
  { number: '3309', name: 'Amsterdam Main St' },
  { number: '3310', name: 'Cohoes Vliet St' },
  { number: '3311', name: 'Watervliet 2nd Ave' },
  { number: '3312', name: 'Green Island Hudson Ave' },
  { number: '3313', name: 'Rensselaer Broadway' },
  { number: '3314', name: 'East Greenbush Columbia Tpke' },
  { number: '3315', name: 'Guilderland Western Ave' },
  { number: '3316', name: 'Delmar Delaware Ave' },
  { number: '3317', name: 'Bethlehem Elm Ave' },
  { number: '3318', name: 'Voorheesville Maple Ave' },
  { number: '3319', name: 'Loudonville Osborne Rd' },
  { number: '3320', name: 'Niskayuna Balltown Rd' },
  { number: '3321', name: 'Glenville Saratoga Rd' },
  { number: '3322', name: 'Scotia Mohawk Ave' },
  { number: '3323', name: 'Rotterdam Hamburg St' },
  { number: '3324', name: 'Cobleskill College Hill Rd' },
  { number: '3325', name: 'Oneonta Main St' },
  { number: '3326', name: 'Gloversville Harrison St' },
  { number: '3327', name: 'Johnstown N Comrie Ave' },
  { number: '3328', name: 'Hudson Warren St' },
  { number: '3329', name: 'Catskill Main St' },
  { number: '3330', name: 'Warrensburg Main St' },
  { number: '3331', name: 'Lake George Canada St' }
];

const FORM_SECTIONS = [
  {
    id: 'product',
    title: 'Product',
    color: '#E8572A',
    questions: [
      { id: 'p1', text: 'Are all products within date (no expired items on display)?' },
      { id: 'p2', text: 'Are product labels accurate, legible, and properly placed?' },
      { id: 'p3', text: 'Is product rotation (FIFO) being followed correctly?' },
      { id: 'p4', text: 'Are display cases/shelves fully stocked and properly faced?' }
    ]
  },
  {
    id: 'refrigeration',
    title: 'Refrigeration',
    color: '#0078AC',
    questions: [
      { id: 'r1', text: 'Are all refrigeration units maintaining proper temperature (38°F or below)?' },
      { id: 'r2', text: 'Are refrigeration unit interiors clean and free of mold/buildup?' },
      { id: 'r3', text: 'Are door seals/gaskets intact and sealing properly?' },
      { id: 'r4', text: 'Are temperature logs current and completed for all units?' }
    ]
  },
  {
    id: 'image',
    title: 'Image',
    color: '#5B4FCF',
    questions: [
      { id: 'i1', text: 'Is the exterior (windows, entrance, parking area) clean and presentable?' },
      { id: 'i2', text: 'Are all interior surfaces (floors, walls, counters) clean and in good repair?' },
      { id: 'i3', text: 'Is current/correct signage and promotional material properly displayed?' }
    ]
  },
  {
    id: 'dough',
    title: 'Dough',
    color: '#D4A017',
    questions: [
      { id: 'd1', text: 'Is dough stored at proper temperature and within usage date?' },
      { id: 'd2', text: 'Is the dough proofing/thawing area clean and organized?' },
      { id: 'd3', text: 'Are dough portions consistent and meeting weight specifications?' },
      { id: 'd4', text: 'Is the dough preparation schedule being followed correctly?' },
      { id: 'd5', text: 'Is dough waste being tracked and within acceptable limits?' }
    ]
  },
  {
    id: 'equipment',
    title: 'Equipment',
    color: '#2E7D32',
    questions: [
      { id: 'e1', text: 'Is the oven clean and operating at correct temperature?' },
      { id: 'e2', text: 'Is the mixer clean and in proper working order?' },
      { id: 'e3', text: 'Are all cutting tools/slicers clean, sharp, and safely stored?' },
      { id: 'e4', text: 'Is the dishwasher/sanitizing station operating properly?' },
      { id: 'e5', text: 'Are smallwares (trays, tongs, bags) clean and sufficient in quantity?' },
      { id: 'e6', text: 'Is the POS system functioning correctly?' },
      { id: 'e7', text: 'Is the coffee/beverage equipment clean and operating properly?' },
      { id: 'e8', text: 'Are all safety devices (guards, cut-off switches) in place and functional?' },
      { id: 'e9', text: 'Is preventive maintenance current for all major equipment?' }
    ]
  },
  {
    id: 'systems',
    title: 'JMC Systems',
    color: '#C62828',
    questions: [
      { id: 's1', text: 'Are opening and closing checklists being completed and signed daily?' },
      { id: 's2', text: 'Is the cash handling procedure being followed (drops, counts, safe)?' },
      { id: 's3', text: 'Are all team members in proper uniform and following dress code?' },
      { id: 's4', text: 'Is the food safety/allergen protocol being followed (gloves, handwashing)?' },
      { id: 's5', text: 'Are waste/shrink logs being completed accurately each day?' },
      { id: 's6', text: 'Is the ordering process following the established par levels?' },
      { id: 's7', text: 'Are training records current for all team members?' },
      { id: 's8', text: 'Is the scheduling process compliant with labor guidelines?' },
      { id: 's9', text: 'Are incident/accident reports completed and filed within 24 hours?' }
    ]
  }
];

// Flat list of all question IDs for progress tracking (35 total)
const ALL_QUESTION_IDS = [
  ...FORM_SECTIONS.flatMap(s => s.questions.map(q => q.id)),
  'noteworthy'
];

// Full question text map for CSV export
const QUESTION_TEXT_MAP = {};
FORM_SECTIONS.forEach(section => {
  section.questions.forEach(q => {
    QUESTION_TEXT_MAP[q.id] = `[${section.title}] ${q.text}`;
  });
});
QUESTION_TEXT_MAP['noteworthy'] = '[Noteworthy] Does this store have something noteworthy to share?';
