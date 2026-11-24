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

//Simplified versions for testing purposes
const baseFuel = {
  companyName: 'FuelCo',
  isUkBased: true,
  companyAddress: {
    uprn: '100071384716',
    line1: 'Unit 6 Caxton Gate',
    line2: 'Corporation Street',
    city: 'Birmingham',
    postcode: 'B2 4LP'
  },
  companyContact: {
    name: 'Fuel Person',
    email: 'JD@email.com',
    alternativeEmail: 'alt@email.com',
    phone: '07594416260'
  },
  responsiblePerson: {
    name: 'Rep Name',
    email: 'rep@co.com'
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

// Admin fuel record examples (GET /admin/fuels/{id}), one per record status.
// All have passed technical review; fuelStatus matches what calculateItemStatus derives.
const acceptedReview = {
  status: 'accepted',
  reviewedBy: { name: 'HETAS Reviewer', email: 'reviewer@hetas.co.uk' },
  reviewedAt: '2025-05-01T10:00:00.000Z'
}

const countryCertification = (status, firstCertifiedAt = null) => ({
  status,
  firstCertifiedAt,
  lastCertifiedAt: firstCertifiedAt
})

const certifiedExceptScotland = {
  englandCertification: countryCertification(
    'certified',
    '2025-05-10T00:00:00.000Z'
  ),
  scotlandCertification: countryCertification('uncertified'),
  walesCertification: countryCertification(
    'certified',
    '2025-05-25T00:00:00.000Z'
  ),
  nIrelandCertification: countryCertification(
    'certified',
    '2025-05-15T00:00:00.000Z'
  )
}

export const adminFuelRecordExamples = {
  live: {
    ...manufactureFuelExample,
    id: '7756-0101',
    applicationId: '7756-0307',
    brandName: 'Cosytherm Briquettes',
    technicalReview: acceptedReview,
    ...certifiedExceptScotland,
    isVisibleToPublic: true,
    fuelStatus: 'live'
  },
  hiddenByHetas: {
    ...manufactureFuelExample,
    id: '7756-0102',
    applicationId: '7756-0308',
    brandName: 'Cosytherm Logs',
    technicalReview: acceptedReview,
    ...certifiedExceptScotland,
    isVisibleToPublic: false,
    fuelStatus: 'hidden'
  },
  hiddenUncertified: {
    ...rebrandFuelExample,
    id: '7756-0103',
    applicationId: '7756-0248',
    brandName: 'Coalfire Plus',
    technicalReview: acceptedReview,
    englandCertification: countryCertification('uncertified'),
    scotlandCertification: countryCertification('uncertified'),
    walesCertification: countryCertification('uncertified'),
    nIrelandCertification: countryCertification('uncertified'),
    isVisibleToPublic: true,
    fuelStatus: 'hidden'
  },
  pending: {
    ...rebrandFuelExample,
    id: '7756-0104',
    applicationId: '7756-0304',
    brandName: 'Centra Firelog',
    technicalReview: acceptedReview,
    englandCertification: countryCertification('awaiting_decision'),
    scotlandCertification: countryCertification('awaiting_decision'),
    walesCertification: countryCertification('awaiting_decision'),
    nIrelandCertification: countryCertification('awaiting_decision'),
    isVisibleToPublic: true,
    fuelStatus: 'pending'
  },
  liveRebrand: {
    ...rebrandFuelExample,
    id: '7756-0105',
    applicationId: '7756-0309',
    brandName: 'Centra Hotlog',
    technicalReview: acceptedReview,
    ...certifiedExceptScotland,
    isVisibleToPublic: true,
    fuelStatus: 'live'
  },
  hiddenByHetasRebrand: {
    ...rebrandFuelExample,
    id: '7756-0106',
    applicationId: '7756-0310',
    brandName: 'Centra Ember',
    technicalReview: acceptedReview,
    ...certifiedExceptScotland,
    isVisibleToPublic: false,
    fuelStatus: 'hidden'
  },
  hiddenUncertifiedManufacture: {
    ...manufactureFuelExample,
    id: '7756-0107',
    applicationId: '7756-0311',
    brandName: 'Cosytherm Pellets',
    technicalReview: acceptedReview,
    englandCertification: countryCertification('uncertified'),
    scotlandCertification: countryCertification('uncertified'),
    walesCertification: countryCertification('uncertified'),
    nIrelandCertification: countryCertification('uncertified'),
    isVisibleToPublic: true,
    fuelStatus: 'hidden'
  },
  pendingManufacture: {
    ...manufactureFuelExample,
    id: '7756-0108',
    applicationId: '7756-0312',
    brandName: 'Cosytherm Smokeless',
    technicalReview: acceptedReview,
    englandCertification: countryCertification('awaiting_decision'),
    scotlandCertification: countryCertification('awaiting_decision'),
    walesCertification: countryCertification('awaiting_decision'),
    nIrelandCertification: countryCertification('awaiting_decision'),
    isVisibleToPublic: true,
    fuelStatus: 'pending'
  },
  // Edge: one country certified, the rest still awaiting decision - still live.
  liveSingleCountryManufacture: {
    ...manufactureFuelExample,
    id: '7756-0109',
    applicationId: '7756-0313',
    brandName: 'Cosytherm Ovoids',
    technicalReview: acceptedReview,
    englandCertification: countryCertification(
      'certified',
      '2025-06-01T00:00:00.000Z'
    ),
    scotlandCertification: countryCertification('awaiting_decision'),
    walesCertification: countryCertification('awaiting_decision'),
    nIrelandCertification: countryCertification('awaiting_decision'),
    isVisibleToPublic: true,
    fuelStatus: 'live'
  },
  // Edge: none certified, mix of uncertified and awaiting decision - hidden, no button.
  hiddenMixedRebrand: {
    ...rebrandFuelExample,
    id: '7756-0110',
    applicationId: '7756-0314',
    brandName: 'Centra Glow',
    technicalReview: acceptedReview,
    englandCertification: countryCertification('uncertified'),
    scotlandCertification: countryCertification('awaiting_decision'),
    walesCertification: countryCertification('uncertified'),
    nIrelandCertification: countryCertification('awaiting_decision'),
    isVisibleToPublic: true,
    fuelStatus: 'hidden'
  }
}
