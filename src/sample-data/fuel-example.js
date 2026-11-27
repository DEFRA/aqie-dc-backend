// Example fuel payload for tests and API documentation
/* export default {
  companyName: 'FuelCo',
  isUkBased: true,
  //companyFullAddress: '2 Example Street, Building C, Manchester, Greater Manchester, AB1 2CD',
  companyAddress: {
    line1: '2 Example Street',
    line2: 'Building C',
    city: 'Manchester',
    county: 'Greater Manchester',
    postcode: 'AB1 2CD'
  },
  companyContact: {
    name: 'Test Contact',
    email: 'contact@example.com',
    alternativeEmail: 'alt.contact@example.com',
    phone: '+447700900101'
  },
  responsibleName: 'Test Responsible Person',
  responsibleEmailAddress: 'responsible@example.com',
  hasCustomerComplaintsSystem: false,
  fuelBagging: 'Bagged',
  //   baggedAtSource: true,
  supplierType: 'Manufacture',
  appearance: 'Premium pellets',

  //If reseller:
  // originalFuel: {
  //   manufacturer: 'Fuels LTD',
  //   name: 'FireFuel',
  //   isChangedOrMixed: false,
  //   changes: 'The fuels was turned into love hearts'
  // },

  //If manufacturer:
  weight: 20,
  composition: 'Wood 100%',
  sulphurContent: 0.7,
  manufacturingProcess: 'Kiln-dried',
  hasQualityControlSystem: true,
  brandName: 'PelletBrand',

  declaration: true,

  technicalReview: {
    status: 'accepted',
    reviewedBy: {
      name: 'Test Reviewer',
      email: 'reviewer@example.com'
    },
    updatedAt: '2026-02-10'
  },

  englandCertification: {
    status: 'certified',
    decidedAt: '2026-02-07T10:00:00Z',
    decidedBy: {
      name: 'England Approver',
      email: 'england@example.com'
    },
    firstCertifiedAt: '2026-02-07',
    lastCertifiedAt: '2026-02-15'
  },

  scotlandCertification: {
    status: 'certified',
    decidedAt: '2026-02-06T10:00:00Z',
    decidedBy: {
      name: 'Scotland Approver',
      email: 'scotland@example.com'
    },
    firstCertifiedAt: '2026-02-06',
    lastCertifiedAt: '2026-02-14'
  },

  walesCertification: {
    status: 'certified',
    decidedAt: '2026-02-04T10:00:00Z',
    decidedBy: {
      name: 'Wales Approver',
      email: 'wales@example.com'
    },
    firstCertifiedAt: '2026-02-04',
    lastCertifiedAt: '2026-02-12'
  },

  nIrelandCertification: {
    status: 'certified',
    decidedAt: '2026-02-05T10:00:00Z',
    decidedBy: {
      name: 'NI Approver',
      email: 'ni@example.com'
    },
    firstCertifiedAt: '2026-02-05',
    lastCertifiedAt: '2026-02-13'
  },

  legacyRecord: true
}
*/

//Simplified versions for testing purposes
const baseFuel = {
  companyName: 'FuelCo',
  isUkBased: true,
  companyAddress: {
    uprn: '000000000002',
    line1: '3 Example Street',
    line2: 'Example Road',
    city: 'Birmingham',
    postcode: 'AB1 2CD'
  },
  companyContact: {
    name: 'Test Contact',
    email: 'contact@example.com',
    alternativeEmail: 'alt.contact@example.com',
    phone: '07700900103'
  },
  responsiblePerson: {
    name: 'Test Responsible Person',
    email: 'responsible@example.com'
  },
  hasCustomerComplaintsSystem: true,
  fuelBagging: 'Loose (unbagged)',
  brandName: 'PelletBrand',
  additionalBrandNames: 'Brand Two',
  declaration: true
}

export const rebrandFuelExample = {
  ...baseFuel,
  supplierType: 'Rebrand',
  originalFuel: {
    manufacturer: 'Fuels LTD',
    name: 'FireFuel',
    isChangedOrMixed: true,
    changes: 'The fuel was mixed with another fuel'
  }
}

export const manufactureFuelExample = {
  ...baseFuel,
  supplierType: 'Manufacture',
  fuelDescription: {
    appearance: 'Premium pellets',
    weight: '20kg',
    composition: 'Wood 100%',
    sulphurContent: 0.7
  },
  manufacturingProcess: 'Kiln-dried',
  hasQualityControlSystem: true
}

export default rebrandFuelExample
