// Mapping dictionary
const keyMapAppliance = {
  CTGxGs: 'companyName',
  TbMaXV: 'isUkBased',

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

  NGfXVf: 'instructionManualTitle',
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
  // const logger = require('../common/helpers/logging/logger.js').createLogger()

  // logger.debug(`Starting to map keys for type: ${type}`)
  // logger.debug(`Input keys to map: ${Object.keys(input).join(', ')}`)

  const result = {}
  let mappedCount = 0
  let skippedCount = 0

  for (const [key, value] of Object.entries(input)) {
    const mappedKey =
      type === 'appliance' ? keyMapAppliance[key] : keyMapFuel[key]
    if (mappedKey) {
      result[mappedKey] = value
      console.log(`Mapped key: ${key} → ${mappedKey}`)
      mappedCount++
    } else {
      console.log(`Key not in mapping dictionary, skipped: ${key}`)
      skippedCount++
    }
    // keys mapped to null or missing are skipped
  }

  console.log(
    `Key mapping completed for type ${type}: ${mappedCount} keys mapped, ${skippedCount} keys skipped`
  )

  return result
}
