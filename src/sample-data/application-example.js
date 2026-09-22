// Example application payloads for tests and API documentation.
// Keep both examples available and switch the default export when needed for Swagger.

export const applianceApplicationExample = {
  type: 'appliance',
  // id: 'app-uuid-12345',
  submittedAt: new Date('2026-04-24T12:00:00Z'),
  // createdAt: new Date('2026-07-01T10:00:00Z'),
  status: 'new', // auto-generated but can be set for Swagger input
  reviewedBy: {
    name: 'John Reviewer',
    email: 'john@reviewer.com'
  },
  referenceNumber: 'referencenumber435435',
  appliances: [
    {
      // NOTE: These fields are auto-generated/set by server
      // applicationId: 'app-uuid-12345',
      // id: 'APP-abc123def456',
      // createdAt: new Date('2026-07-01T10:00:00Z'),
      // updatedAt: new Date('2026-07-01T10:00:00Z'),

      companyName: 'ACME',
      companyContact: {
        name: 'John Doe',
        email: 'john@acme.com',
        alternativeEmail: 'alt@acme.com',
        phone: '+44753732890'
      },
      isUkBased: true,
      // companyFullAddress: '456 Factory Road, Unit 7, Birmingham, West Midlands, B1 2AB',
      companyAddress: {
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
      permittedFuels: 'Wood Pellets',
      instructionManual: {
        title: 'Manual X',
        publicationDate: new Date('2026-02-03'),
        version: 'Version 1',
        additionalInfo: 'Extra info'
      },
      declaration: true,
      // NOTE: Certification fields (optional) - Added for testing/demo purposes
      // In real workflows, these are populated later in the approval process
      technicalReview: {
        status: 'accepted'
      },
      englandCertification: {
        status: 'certified'
      },
      scotlandCertification: {
        status: 'certified'
      },
      walesCertification: {
        status: 'certified'
      },
      nIrelandCertification: {
        status: 'certified'
      }

      // legacyRecord: false // default to false
    },
    {
      // NOTE: These fields are auto-generated/set by server
      // applicationId: 'app-uuid-12345',
      // id: 'APP-xyz789uvw012',
      // createdAt: new Date('2026-07-01T10:00:00Z'),
      // updatedAt: new Date('2026-07-01T10:00:00Z'),

      companyName: 'Beta Heating',
      companyContact: {
        name: 'Jane Smith',
        email: 'jane@beta.com'
      },
      isUkBased: false,
      companyFullAddress: '789 International Ave',
      // companyAddress: {
      //   line1: '789 International Ave',
      //   city: 'London',
      //   postcode: 'W1A 1AA'
      // },
      modelName: 'Beta 2000',
      applianceType: 'heat',
      isVariant: true,
      existingAuthorisedAppliance: 'Beta 1000',
      nominalOutput: 12,
      multifuelAppliance: false,
      permittedFuels: 'Wood Pellets',
      instructionManual: {
        title: 'Beta Manual',
        publicationDate: new Date('2026-03-10')
      },
      declaration: true,
      // NOTE: Certification fields (optional) - Added for testing/demo purposes
      // In real workflows, these are populated later in the approval process
      technicalReview: {
        status: 'accepted'
      },
      englandCertification: {
        status: 'certified'
      },
      scotlandCertification: {
        status: 'certified'
      },
      walesCertification: {
        status: 'revoked'
      },
      nIrelandCertification: {
        status: 'rejected'
      }
      // legacyRecord: false // default to false
    }
  ]
}

export const fuelApplicationExample = {
  type: 'fuel',
  submittedAt: new Date('2026-04-24T12:00:00Z'),
  status: 'new',
  reviewedBy: {
    name: 'John Reviewer',
    email: 'john@reviewer.com'
  },
  referenceNumber: 'referencenumber435435',
  fuels: [
    {
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
      customerComplaints: false,
      fuelBagging: 'Bagged',
      fuelDescription: 'Premium pellets',
      manufacturerOrReseller: 'Manufacturer',
      fuelWeight: 20,
      fuelComposition: 'Wood 100%',
      sulphurContent: 0.7,
      manufacturingProcess: 'Kiln-dried',
      qualityControlSystem: 'ISO certified',
      brandNames: 'PelletBrand',
      declaration: true
    }
  ]
}
