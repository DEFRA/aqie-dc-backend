// Mapping dictionary
const keyMapAppliance = {
  CTGxGs: 'companyName',
  TbMaXV: 'isUkBased',

  mwGItn: 'addressObject', //Address comes in this block
  addressLine1: 'companyAddress.line1',
  addressLine2: 'companyAddress.line2',
  town: 'companyAddress.city',
  county: 'companyAddress.county',
  postcode: 'companyAddress.postcode',

  kIndJV: 'companyFullAddress', // non‑UK

  CfdMSm: 'companyContact.name',
  gTshkc: 'companyContact.email',
  eDOPFB: 'companyContact.alternativeEmail',
  JIeTGU: 'companyContact.phone',

  cciwNV: 'modelName',
  oSUxHw: 'modelNumber',

  LkASfn: 'applianceType',

  mVqdEy: 'isVariant',

  GFREno: 'existingAuthorisedAppliance',
  jxCIYY: 'nominalOutput',
  Ltjqls: 'multifuelAppliance',
  NGfXVf: 'allowedFuels',

  tiRhSf: 'declaration',

  userConfirmationEmailAddress: 'userConfirmationEmailAddress'
}
// Mapping dictionary for second set
const keyMapFuel = {
  XpAWNK: 'companyName',
  IIQWii: 'isUkBased',

  mwGItn: 'addressObject', //Address comes in this block
  addressLine1: 'companyAddress.line1',
  addressLine2: 'companyAddress.line2',
  town: 'companyAddress.city',
  county: 'companyAddress.county',
  postcode: 'companyAddress.postcode',

  uCHKMq: 'companyFullAddress', // non‑UK

  lhhoTX: 'companyContact.name',
  zCPkvh: 'companyContact.email',
  FwtbfD: 'companyContact.alternateEmail',
  OIMWWP: 'companyContact.phone',

  ChfkKZ: 'responsibleName',
  OOrscG: 'responsibleEmailAddress',

  Buaprr: 'customerComplaints',
  gefTHa: 'fuelBagging',
  AmmLSb: 'manufacturerOrReseller',

  iqYLKO: 'fuelDescription',

  // Rebrand-only fields
  mGVwfX: 'originalFuelManufacturer',
  qHMgAu: 'originalFuelNameOrBrand',
  wSvNbv: 'changedFromOriginalFuel',
  UPvcFc: 'changesMade',
  gGFSnh: 'resellBrandName',

  // Manufacture-only fields
  vUJklv: 'fuelWeight',
  rIyajj: 'fuelComposition',
  kOXZSk: 'sulphurContent',
  Hdxrqy: 'manufacturingProcess',
  dDwQia: 'qualityManufacturedSystem',
  GgFWEK: 'brandNames',

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
      setByPath(result, mappedKey, value)
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
