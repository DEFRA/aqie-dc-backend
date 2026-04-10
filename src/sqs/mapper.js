// Mapping dictionary
const keyMapAppliance = {
  CTGxGs: 'companyName',
  TbMaXV: 'isUkBased',

  mwGItn: 'addressObject', //Address comes in this block
  addressLine1: 'companyAddressLine1',
  addressLine2: 'companyAddressLine2',
  town: 'companyAddressCity',
  county: 'companyAddressCounty',
  postcode: 'companyAddressPostcode',

  kIndJV: 'companyAddress', // non‑UK

  CfdMSm: 'companyContactName',
  gTshkc: 'companyContactEmail',
  eDOPFB: 'companyAlternateEmail',
  JIeTGU: 'companyPhone',

  cciwNV: 'modelName',
  oSUxHw: 'modelNumber',

  LkASfn: 'applianceType',

  xlcDZp: 'isVariant', // variant yes/no
  mVqdEy: 'isVariant',

  GFREno: 'existingAuthorisedAppliance',
  jxCIYY: 'nominalOutput',
  Ltjqls: 'allowedFuels',
  NGfXVf: 'otherFuelDetails', //schema change needed

  tBhcJV: 'instructionManualTitle',
  PebAxQ: 'instructionManualDate',
  ZvUEHQ: 'instructionManualVersion',
  DiJXuZ: 'instructionManualAdditionalInfo',

  tiRhSf: 'declaration',

  userConfirmationEmailAddress: 'userConfirmationEmailAddress'
}
// Mapping dictionary for second set
const keyMapFuel = {
  XpAWNK: 'companyName',
  IIQWii: 'isUkBased',

  mwGItn: 'addressObject', //Address comes in this block
  addressLine1: 'companyAddressLine1',
  addressLine2: 'companyAddressLine2',
  town: 'companyAddressCity',
  county: 'companyAddressCounty',
  postcode: 'companyAddressPostcode',

  uCHKMq: 'companyAddress', // non‑UK

  lhhoTX: 'companyContactName',
  zCPkvh: 'companyContactEmail',
  FwtbfD: 'companyAlternateEmail',
  OIMWWP: 'companyPhone',

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
// Mapper function
export function mapKeys(input, type) {
  const result = {}
  const keyMap = type === 'appliance' ? keyMapAppliance : keyMapFuel

  for (const [key, value] of Object.entries(input)) {
    const mappedKey = keyMap[key]

    if (mappedKey) {
      // If value is an object (but not null or array), recursively map it
      if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
      ) {
        result[mappedKey] = mapKeys(value, type)
      } else {
        result[mappedKey] = value
      }
    }
    // keys mapped to null or missing are skipped
  }

  return result
}
