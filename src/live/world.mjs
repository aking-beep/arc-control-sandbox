// The people, customers and systems of a Meridian (and Northwind) working day.
//
// Everything here is fictional. The originals from company.mjs (cus-101,
// cus-102, T-1001, emp-201) stay first, so the integration scenarios and
// Phase 2 checks, which address them by id, see exactly what they always did.

/** Small, fast, seedable PRNG (mulberry32). The same seed gives the same day. */
export function rng(seed) {
  let a = (Number(seed) >>> 0) || 1;
  const next = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: list => list[Math.floor(next() * list.length)],
    chance: p => next() < p,
    money: (min, max) => Math.round((min + next() * (max - min)) * 100) / 100
  };
}

const COMPANIES = [
  'Brightwater Foods', 'Cobalt Robotics', 'Delta Harbor Shipping', 'Evergreen Clinics', 'Fieldstone Apparel',
  'Granite Peak Outfitters', 'Helios Solar Supply', 'Ironwood Furniture', 'Juniper Pet Care', 'Keystone Builders',
  'Larkspur Studios', 'Meadowbrook Dairy', 'Northstar Telecom', 'Oakline Pharmacy', 'Pinecrest Hotels',
  'Quarry Lane Coffee', 'Redwood Analytics', 'Silverline Couriers', 'Tidewater Marine', 'Union Square Books',
  'Vantage Optics', 'Willow Creek Farms'
];
const TIERS = ['Enterprise', 'Growth', 'Growth', 'Starter'];
const REGIONS = ['NA-East', 'NA-West', 'EMEA', 'APAC'];

export const CUSTOMERS = COMPANIES.map((name, i) => ({ id: `cus-${103 + i}`, name, tier: TIERS[i % TIERS.length], region: REGIONS[i % REGIONS.length] }));

const PEOPLE = [
  ['Priya Raman', 'Finance'], ['Marcus Bell', 'Finance'], ['Ines Duarte', 'Customer Support'], ['Tobias Grant', 'Customer Support'],
  ['Hana Sato', 'Customer Support'], ['Diego Alvarez', 'Sales'], ['Grace Okonkwo', 'Sales'], ['Owen Fletcher', 'Engineering'],
  ['Mei Lin', 'Engineering'], ['Samuel Adeyemi', 'Engineering'], ['Clara Novak', 'People'], ['Ravi Menon', 'Security'],
  ['Elena Petrova', 'Operations'], ['Jonah Weiss', 'Operations'], ['Aisha Karim', 'Legal'], ['Felix Moreau', 'Marketing']
];
export const EMPLOYEES = PEOPLE.map(([name, department], i) => ({ id: `emp-${202 + i}`, name, department, salary: 62000 + ((i * 7919) % 68000) }));

export const SERVICES = ['checkout', 'catalog', 'payments-gateway', 'search', 'notifications', 'inventory', 'customer-portal', 'reporting'];
export const FEATURE_BRANCHES = ['develop', 'feature/cart-redesign', 'feature/faster-search', 'fix/timeout-retry', 'feature/loyalty-points', 'chore/deps-update'];
export const PROTECTED_BRANCHES = ['main', 'release'];
export const TICKET_SUBJECTS = [
  'Order arrived damaged', 'Refund not received', 'Wrong size shipped', 'Cannot log in to portal', 'Invoice shows wrong VAT',
  'Delivery delayed again', 'Duplicate charge on card', 'Need to change shipping address', 'Discount code not applied', 'Missing item in package'
];
export const TICKET_STATUSES = ['in_progress', 'waiting_on_customer', 'resolved'];
export const QUARANTINE_TARGETS = [
  ['laptop-mer-0412', 'malware signature detected by EDR'], ['s3://meridian-exports-tmp', 'bucket made public by misconfiguration'],
  ['vm-build-07', 'outbound traffic to known C2 domain'], ['laptop-mer-0388', 'repeated failed MFA from new country'],
  ['svc-account:etl-nightly', 'credential found in public paste'], ['container:search-indexer-3', 'crypto-miner process detected']
];
export const EXPORT_SCOPES = ['region:EMEA', 'region:NA-West', 'tier:Enterprise', 'churn-risk-list', 'all'];

/** Synthetic approvers. Distinct from every agent owner, so separation of duties allows them. */
export const APPROVERS = {
  'finance-manager': ['dana.okafor@meridian.example', 'luis.ortega@meridian.example'],
  'security-manager': ['lee.park@meridian.example', 'ruth.amsel@meridian.example'],
  'hr-manager': ['sam.rivera@meridian.example'],
  'treasury-manager': ['irene.walsh@northwind.example', 'tom.becker@northwind.example', 'yusuf.demir@northwind.example'],
  'compliance-officer': ['nadia.farouk@northwind.example']
};

export const BENEFICIARY_NAMES = [
  ['Alder & Finch Supplies', 'GB'], ['Baltic Freight OU', 'EE'], ['Cascadia Timber Co', 'CA'], ['Dunmore Textiles', 'IE'],
  ['Estrella Imports SA', 'MX'], ['Fjord Seafood AS', 'NO'], ['Golden Gate Packaging', 'US'], ['Hanseatic Metals GmbH', 'DE']
];
export const WIRE_COUNTRIES = ['DE', 'SG', 'GB', 'JP', 'CA', 'FR', 'AU', 'NL'];
export const SANCTIONED_COUNTRIES = ['IR', 'KP', 'SY', 'CU'];
