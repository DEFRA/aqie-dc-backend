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
  eDOPFB: 'companyContact.alternateEmail',
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
        const mappedValue = mapKeys(value, type)

        if (mappedKey === 'addressObject') {
          Object.assign(result, mappedValue)
        } else {
          result[mappedKey] = mappedValue
        }
      } else {
        result[mappedKey] = value
      }
    }
  }

  return result
}
