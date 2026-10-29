// Example fuel payload for tests and API documentation
/* export default {
  companyName: 'FuelCo',
  isUkBased: true,
  //companyFullAddress: '789 Industrial Estate, Building C, Manchester, Greater Manchester, M1 3CD',
  companyAddress: {
    line1: '789 Industrial Estate',
    line2: 'Building C',
    city: 'Manchester',
    county: 'Greater Manchester',
    postcode: 'M1 3CD'
  },
  companyContact: {
    name: 'Fuel Person',
    email: 'fuel@co.com',
    alternativeEmail: 'alt@co.com',
    phone: '+447537328906'
  },
  responsibleName: 'Rep Name',
  responsibleEmailAddress: 'rep@co.com',
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
      name: 'Fuel Reviewer',
      email: 'reviewer@fuel.com'
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

//Simplified version for testing purposes
export default {
  companyName: 'FuelCo',
  isUkBased: false,
  companyFullAddress:
    '789 Industrial Estate, Building C, Manchester, Greater Manchester, M1 3CD',
  companyContact: {
    name: 'Fuel Person',
    email: 'JD@email.com'
  },
  responsiblePerson: {
    name: 'Rep Name',
    email: 'rep@co.com'
  },
  hasCustomerComplaintsSystem: false,
  fuelBagging: 'Bagged',
  supplierType: 'Manufacture', //or Rebrand
  //If manufacturer:
  fuelDescription: {
    appearance: 'Premium pellets',
    weight: 20,
    composition: 'Wood 100%',
    sulphurContent: 0.7
  },
  manufacturingProcess: 'Kiln-dried',
  hasQualityControlSystem: true,
  brandName: 'PelletBrand',
  //If reseller:
  // originalFuel: {
  //   manufacturer: 'Fuels LTD',
  //   name: 'FireFuel',
  //   isChangedOrMixed: false,
  //   changes: 'The fuels was turned into love hearts'
  // },
  declaration: true
}
