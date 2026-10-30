const COMPANY_PHONE = 'companyContact.phone'
const ADDRESS_OBJECT = 'addressObject'

// Mapping dictionary
const keyMapAppliance = {
  CTGxGs: 'companyName',
  TbMaXV: 'isUkBased',

  mwGItn: ADDRESS_OBJECT, //Address comes in this block
  uprn: 'companyAddress.uprn',
  addressLine1: 'companyAddress.line1',
  addressLine2: 'companyAddress.line2',
  town: 'companyAddress.city',
  county: 'companyAddress.county',
  postcode: 'companyAddress.postcode',

  kIndJV: 'companyFullAddress', // non‑UK

  CfdMSm: 'companyContact.name',
  gTshkc: 'companyContact.email',
  eDOPFB: 'companyContact.alternativeEmail',
  JIeTGU: COMPANY_PHONE,

  cciwNV: 'modelName',
  oSUxHw: 'modelNumber',

  LkASfn: 'applianceType',

  mVqdEy: 'isVariant',

  GFREno: 'existingAuthorisedAppliance',
  jxCIYY: 'nominalOutput',
  Ltjqls: 'multifuelAppliance',
  NGfXVf: 'permittedFuels',

  tiRhSf: 'declaration',

  userConfirmationEmailAddress: 'userConfirmationEmailAddress'
}
// Mapping dictionary for second set
const keyMapFuel = {
  XpAWNK: 'companyName',
  IIQWii: 'isUkBased',

  mwGItn: ADDRESS_OBJECT, //Address comes in this block
  koQFjV: ADDRESS_OBJECT, // Address block for Fuels
  uprn: 'companyAddress.uprn',
  addressLine1: 'companyAddress.line1',
  addressLine2: 'companyAddress.line2',
  town: 'companyAddress.city',
  county: 'companyAddress.county',
  postcode: 'companyAddress.postcode',

  uCHKMq: 'companyFullAddress', // non‑UK

  lhhoTX: 'companyContact.name',
  zCPkvh: 'companyContact.email',
  FwtbfD: 'companyContact.alternativeEmail',
  OIMWWP: COMPANY_PHONE,
  yDTjQn: COMPANY_PHONE, //For fuels

  ChfkKZ: 'responsiblePerson.name',
  OOrscG: 'responsiblePerson.email',

  //Buaprr: 'hasCustomerComplaintsSystem',
  BUaprr: 'hasCustomerComplaintsSystem',
  gefTHa: 'fuelBagging',
  AmmLSb: 'supplierType',

  // Rebrand-only fields
  mGVwfX: 'originalFuel.manufacturer',
  qHMgAu: 'originalFuel.name',
  wSvNbv: 'originalFuel.isChangedOrMixed',
  UPvcFc: 'originalFuel.changes',

  // Manufacture-only fields
  iqYLKO: 'fuelDescription.appearance',
  vUJklv: 'fuelDescription.weight',
  rIyajj: 'fuelDescription.composition',
  kOXZSk: 'fuelDescription.sulphurContent',
  Hdxrqy: 'manufacturingProcess',
  dDwQia: 'hasQualityControlSystem',

  GgFWEK: 'brandName',
  fvgxNC: 'additionalBrandNames',
  dytkGm: 'declaration',

  userConfirmationEmailAddress: 'userConfirmationEmailAddress'
}
// Sets a value on an object using a dot-notation path, creating nested objects as needed
function setByPath(obj, path, value) {
  const keys = path.split('.')
  const lastKey = keys.pop()
  const target = keys.reduce((acc, key) => {
    if (typeof acc[key] !== 'object' || acc[key] === null) {
      acc[key] = {}
    }
    return acc[key]
  }, obj)

  target[lastKey] = value
}

// Mapper function
export function mapKeys(input, type) {
  const result = {}
  const keyMap = type === 'appliance' ? keyMapAppliance : keyMapFuel

  for (const [key, value] of Object.entries(input)) {
    const mappedKey = keyMap[key]

    if (!mappedKey) {
      continue
    }

    // If value is an object (but not null or array), recursively map it
    const isObject =
      typeof value === 'object' && value !== null && !Array.isArray(value)

    if (!isObject) {
      // The form sends a sentence ("Yes, the fuel has been changed...") not a boolean
      const isYesNoText =
        mappedKey === 'originalFuel.isChangedOrMixed' &&
        typeof value === 'string'
      setByPath(result, mappedKey, isYesNoText ? /^yes/i.test(value) : value)
      continue
    }

    const mappedValue = mapKeys(value, type)

    if (mappedKey === 'addressObject') {
      Object.assign(result, mappedValue)
    } else {
      setByPath(result, mappedKey, mappedValue)
    }
  }

  return result
}
