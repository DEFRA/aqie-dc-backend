// Example application payloads for tests and API documentation.
// Keep both examples available and switch the default export when needed for Swagger.

import { rebrandFuelExample, manufactureFuelExample } from './fuel-example.js'

export const applianceApplicationExample = {
  type: 'appliance',
  // id: 'app-uuid-12345',
  submittedAt: new Date('2026-04-24T12:00:00Z'),
  // createdAt: new Date('2026-07-01T10:00:00Z'),
  status: 'new', // auto-generated but can be set for Swagger input
  reviewedBy: {
    name: 'Test Reviewer',
    email: 'reviewer@example.com'
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
        name: 'Test Contact',
        email: 'contact@example.com',
        alternativeEmail: 'alt.contact@example.com',
        phone: '+447700900102'
      },
      isUkBased: true,
      // companyFullAddress: '1 Example Street, Unit 7, Birmingham, West Midlands, AB1 2CD',
      companyAddress: {
        line1: '1 Example Street',
        line2: 'Unit 7',
        city: 'Birmingham',
        county: 'West Midlands',
        postcode: 'AB1 2CD'
      },
      modelName: 'Model X',
      modelNumber: '123',
      applianceType: 'heat',
      isVariant: false,
      existingAuthorisedAppliance: 'Old Model',
      nominalOutput: 10,
      isMultifuelAppliance: true,
      permittedFuels: 'Wood Pellets',
      isPermittedToBurnWood: true,
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
        name: 'Test Contact',
        email: 'contact@example.com'
      },
      isUkBased: false,
      companyFullAddress: '4 Example Avenue',
      // companyAddress: {
      //   line1: '4 Example Avenue',
      //   city: 'London',
      //   postcode: 'W1A 1AA'
      // },
      modelName: 'Beta 2000',
      applianceType: 'heat',
      isVariant: true,
      existingAuthorisedAppliance: 'Beta 1000',
      nominalOutput: 12,
      isMultifuelAppliance: false,
      permittedFuels: 'Wood Pellets',
      isPermittedToBurnWood: false,
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
        status: 'uncertified'
      },
      nIrelandCertification: {
        status: 'uncertified'
      }
      // legacyRecord: false // default to false
    }
  ]
}

const fuelApplicationBase = {
  type: 'fuel',
  submittedAt: new Date('2026-04-24T12:00:00Z'),
  status: 'new',
  reviewedBy: {
    name: 'Test Reviewer',
    email: 'reviewer@example.com'
  },
  referenceNumber: 'referencenumber435435'
}

export const rebrandFuelApplicationExample = {
  ...fuelApplicationBase,
  fuels: [rebrandFuelExample]
}

export const manufactureFuelApplicationExample = {
  ...fuelApplicationBase,
  fuels: [manufactureFuelExample]
}

// Default fuel example, used by tests and Swagger
export const fuelApplicationExample = manufactureFuelApplicationExample
