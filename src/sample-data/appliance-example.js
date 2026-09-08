// Example appliance payload for tests and API documentation
/* export default {
  // Auto-generated fields
  // id: 'APP-abc123def456',
  // applicationId: 'app-uuid-12345',
  // createdAt: new Date('2026-07-01T10:00:00Z'),
  // updatedAt: new Date('2026-07-01T10:00:00Z'),
  companyName: 'ACME',
  companyContact: {
    name: 'John Doe',
    email: 'john@acme.com',
    alternativeEmail: 'alt@acme.com',
    phone: '+447537328906'
  },
  isUkBased: true,
  //companyFullAddress: '456 Factory Road, Unit 7, Birmingham, West Midlands, B1 2AB',
  companyAddress: {
    uprn: '10012345678',
    line1: '456 Factory Road',
    line2: 'Unit 7',
    city: 'Birmingham',
    county: 'West Midlands',
    postcode: 'B1 2AB'
  },
  modelName: 'Model X',
  modelNumber: '123',
  applianceType: 'heat',
  isVariant: false,
  existingAuthorisedAppliance: 'Old Model',
  nominalOutput: 10,
  multifuelAppliance: true,
  allowedFuels: 'Wood Pellets',
  declaration: true,
  // Admin Flow fields
  ratedOutput: 10,
  testedOutput: {
    rated: 10.5,
    low: 5.2
  },
  smokeEmissionOutput: {
    rated: 2.3,
    low: 1.1
  },
  airControlModifications: 'Modified secondary air controls',
  instructionManual: {
    title: 'Manual X',
    date: '2026-02-03',
    version: 'Version 1',
    additionalInfo: 'Extra info'
  },
  // Additional fields from DB migration
  servicingManual: {
    title: 'Service Manual X',
    date: '2026-02-01',
    version: 'Version 2',
    additionalInfo: 'Servicing instructions'
  },
  legacyRecord: true,
  legacy: {
    comments: 'Migrated from legacy database',
    id: 'LEG-12345',
    applicationId: 'LEG-APP-12345',
    linkedApplications: 'LEG-APP-54321'
  },
  //Reviews and certifications
  technicalReview: {
    status: 'accepted',
    reviewedBy: {
      name: 'John Reviewer',
      email: 'john.reviewer@example.com'
    },
    updatedAt: '2026-02-10',

    documentationChecks: {
      testReports: true,
      technicalDrawings: true,
      conformityMark: true,
      instructionManual: true
    },

    listingChecks: {
      applianceDetails: true,
      permittedFuels: true,
      additionalConditions: true
    }
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
  }
}
*/

// Minimum required to create a new appliance (for testing purposes)
export default {
  companyName: 'ACME',
  isUkBased: true,
  //companyFullAddress: '456 Factory Road, Unit 7, Birmingham, West Midlands, B1 2AB',
  companyAddress: {
    uprn: '10012345678',
    line1: '456 Factory Road',
    line2: 'Unit 7',
    city: 'Birmingham',
    county: 'West Midlands',
    postcode: 'B1 2AB'
  },
  companyContact: {
    name: 'John Doe',
    email: 'JD@email.com'
  },
  modelName: 'Model X',
  applianceType: 'heat',
  isVariant: false,
  existingAuthorisedAppliance: 'Old Model',
  nominalOutput: 10,
  multifuelAppliance: true,
  allowedFuels: 'Wood Pellets',
  declaration: true
}
