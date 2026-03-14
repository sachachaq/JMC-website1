// JMC Walkthrough Data

const STORE_NUMBERS = [
  { number: '3302', name: '3302' },
  { number: '3304', name: '3304' },
  { number: '3305', name: '3305' },
  { number: '3310', name: '3310' },
  { number: '3320', name: '3320' },
  { number: '3327', name: '3327' },
  { number: '3330', name: '3330' },
  { number: '3331', name: '3331' },
  { number: '3372', name: '3372' },
  { number: '3414', name: '3414' },
  { number: '3420', name: '3420' },
  { number: '3425', name: '3425' },
  { number: '3426', name: '3426' },
  { number: '3427', name: '3427' },
  { number: '3457', name: '3457' },
  { number: '3463', name: '3463' },
  { number: '3507', name: '3507' },
  { number: '3510', name: '3510' },
  { number: '3516', name: '3516' },
  { number: '3552', name: '3552' },
  { number: '3555', name: '3555' },
  { number: '3557', name: '3557' },
  { number: '3558', name: '3558' },
  { number: '3602', name: '3602' },
  { number: '3680', name: '3680' },
  { number: '3685', name: '3685' },
  { number: '3687', name: '3687' },
  { number: '3688', name: '3688' },
  { number: '3689', name: '3689' },
  { number: '3692', name: '3692' }
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


// ---- Template config (used by InspectionEngine) ----
// Other templates (OA, FSE, Evaluation) follow the same shape in their own data files.
const WALKTHROUGH_CONFIG = {
  templateId:      'walkthrough',
  templateName:    'Walkthrough',
  idPrefix:        'WT',
  sections:        FORM_SECTIONS,
  allQuestionIds:  ALL_QUESTION_IDS,
  questionTextMap: QUESTION_TEXT_MAP,
  storeNumbers:    STORE_NUMBERS,
  scoring: {
    passThreshold: 80,
    warnThreshold: 60,
    passLabel:     'Passing',
    warnLabel:     'Needs Work',
    failLabel:     'At Risk'
  }
};
