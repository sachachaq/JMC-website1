// JMC — Domino's Operations Assessment 2026 Data

const OA_SITES = [
  'Poughkeepsie',
  'West Haverstraw',
  'Fishkill',
  'Mamaroneck',
  '89th & Columbus',
  'Hyde Park',
  'Wappingers Falls',
  '116th Street',
  'Spring Valley',
  'Yonkers',
  'Other'
];

const OA_PIZZA_SUB_QS = [
  { key: 'rim',       label: '1.0 Rim' },
  { key: 'size',      label: '1.1 Size' },
  { key: 'portion',   label: '1.2 Portion' },
  { key: 'placement', label: '1.3 Placement' },
  { key: 'bake',      label: '1.4 Bake' }
];

const OA_SIDE_SUB_QS = [
  { key: 'size',      label: '1.0 Size' },
  { key: 'portion',   label: '1.1 Portion' },
  { key: 'placement', label: '1.2 Placement' },
  { key: 'bake',      label: '1.3 Bake' }
];

const OA_SECTIONS = [
  {
    id: 'pp',
    title: 'Section 2 — Product Procedures',
    color: '#E8572A',
    penalty: false,
    questions: [
      { id: 'pp1', text: 'Dough in-use properly proofed' },
      { id: 'pp2', text: 'Dough systems evident and in-use' },
      { id: 'pp3', text: 'Pizza procedures in-use' },
      { id: 'pp4', text: 'Proper side item procedure in use' },
      { id: 'pp5', text: 'Dating procedures upheld' },
      { id: 'pp6', text: 'Product handling procedures upheld' },
      { id: 'pp7', text: 'Pizza Cheese and Pizza Sauce systems evident and in-use' },
      { id: 'pp8', text: 'Store set up and PRP' },
      { id: 'pp9', text: "Store has required tools for producing Domino's product" }
    ]
  },
  {
    id: 'cfs',
    title: 'Section 3 — Cleanliness & Food Safety',
    color: '#0078AC',
    penalty: false,
    questions: [
      { id: 'cfs1',  text: 'Store interior clean and in good repair' },
      { id: 'cfs2',  text: 'All products not expired' },
      { id: 'cfs3',  text: 'All refrigerated products held within specified temperature ranges' },
      { id: 'cfs4',  text: 'All cooked product meet required bake temperatures' },
      { id: 'cfs5',  text: 'Pest control standards maintained' },
      { id: 'cfs6',  text: 'Oven is operational, clean, and in good repair' },
      { id: 'cfs7',  text: 'Walk-in is operational, clean, and in good repair' },
      { id: 'cfs8',  text: 'Makeline is operational, clean, and in good repair' },
      { id: 'cfs9',  text: 'Store personnel maintain proper appearance and hygiene standards' },
      { id: 'cfs10', text: 'Food prep surfaces and storage areas are clean and in good repair' },
      { id: 'cfs11', text: 'Hand sinks and 3 compartment sinks are operational, clean, and stocked' },
      { id: 'cfs12', text: 'Store has sufficient supply of approved smallwares and bakewares' }
    ]
  },
  {
    id: 'bi',
    title: 'Section 4 — Brand Image',
    color: '#5B4FCF',
    penalty: false,
    questions: [
      { id: 'bi1', text: "Domino's Brand uniform worn properly" },
      { id: 'bi2', text: 'Customer area is clean and in good repair' },
      { id: 'bi3', text: 'Store exterior is clean and in good repair' },
      { id: 'bi4', text: "Domino's Technology is operational and clean" },
      { id: 'bi5', text: 'Customer Greeting' },
      { id: 'bi6', text: 'Delivery vehicles represent a positive brand image' },
      { id: 'bi7', text: 'Signage is clean, illuminated, not damaged' },
      { id: 'bi8', text: 'Sufficient number of hot bags cleaned and in good repair' }
    ]
  },
  {
    id: 'bs',
    title: 'Section 5 — Brand Safety',
    color: '#2E7D32',
    penalty: false,
    questions: [
      { id: 'bs1', text: 'Store follows safe cash procedures' },
      { id: 'bs2', text: 'No weapons including pocket knives, mace, pepper spray' },
      { id: 'bs3', text: 'Security callbacks are completed' }
    ]
  },
  {
    id: 'coe',
    title: 'Section 6 — Critical Operations Elements',
    color: '#C62828',
    penalty: true,
    questions: [
      { id: 'coe1',  text: 'Product: Dough management procedures neglected' },
      { id: 'coe2',  text: 'Product: Excessive Remakes' },
      { id: 'coe3',  text: 'Brand Image: Five or more core apparel / appearance / hygiene violations' },
      { id: 'coe4',  text: 'Brand Image: Mature content found on store premises' },
      { id: 'coe5',  text: 'Brand Safety: Firearms, knives, illegal drugs, marijuana, or alcohol found on store' },
      { id: 'coe6',  text: 'Cleanliness & Food Safety: Four or more sizes of expired products' },
      { id: 'coe7',  text: 'Cleanliness & Food Safety: Lack of cleaning supplies or functioning hand sink' },
      { id: 'coe8',  text: 'Cleanliness & Food Safety: Hazardous temperatures past critical thresholds' },
      { id: 'coe9',  text: 'Cleanliness & Food Safety: Pest control standards past critical thresholds' },
      { id: 'coe10', text: 'Cleanliness & Food Safety: Mold found on food products or food contact surfaces' }
    ]
  }
];

// Base IDs always required (product top-level + all standard sections)
const OA_BASE_IDS = (function () {
  var ids = ['pz1','pz2','pz3','pz4','pz5','pz6','pz7','sd1','sd2','sd3'];
  OA_SECTIONS.forEach(function (s) {
    s.questions.forEach(function (q) { ids.push(q.id); });
  });
  return ids;
})();

// Returns all currently visible question IDs (base + any active sub-questions)
function getOAVisibleIds(answers) {
  var ids = OA_BASE_IDS.slice();
  for (var i = 1; i <= 7; i++) {
    if (answers['pz' + i] === 'Remake') {
      OA_PIZZA_SUB_QS.forEach(function (sq) { ids.push('pz' + i + '_' + sq.key); });
    }
  }
  for (var j = 1; j <= 3; j++) {
    if (answers['sd' + j] === 'Remake') {
      OA_SIDE_SUB_QS.forEach(function (sq) { ids.push('sd' + j + '_' + sq.key); });
    }
  }
  return ids;
}
