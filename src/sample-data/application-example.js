// Example application payload for tests and API documentation
export default {
  type: 'appliance',
  // id: 'app-uuid-12345',
  submittedDate: new Date('2026-04-24T12:00:00Z'),
  // createdAt: new Date('2026-07-01T10:00:00Z'),
  status: 'new', //auto-generated but can be set for Swagger input
  reviewer: {
    name: 'John Reviewer',
    email: 'john@reviewer.com'
  },
  referenceNumber: 'referencenumber435435',
  appliances: [
    {
      // NOTE: These fields are auto-generated/set by server
      // applicationId: 'app-uuid-12345',
      // applianceId: 'APP-abc123def456',
      // createdAt: new Date('2026-07-01T10:00:00Z'),
      // updatedAt: new Date('2026-07-01T10:00:00Z'),

      companyName: 'ACME',
      companyContactName: 'John Doe',
      companyContactEmail: 'john@acme.com',
      companyAlternateEmail: 'alt@acme.com',
      companyPhone: '+44753732890',
      isUkBased: true,
      companyAddress: '123 Street',
      companyAddressLine1: '456 Factory Road',
      companyAddressLine2: 'Unit 7',
      companyAddressCity: 'Birmingham',
      companyAddressCounty: 'West Midlands',
      companyAddressPostcode: 'B1 2AB',
      modelName: 'Model X',
      modelNumber: '123',
      applianceType: 'heat',
      isVariant: false,
      existingAuthorisedAppliance: 'Old Model',
      nominalOutput: 10,
      multifuelAppliance: true,
      allowedFuels: 'Wood Pellets',
      instructionManualTitle: 'Manual X',
      instructionManualDate: new Date('2026-02-03'),
      instructionManualVersion: 'Version 1',
      instructionManualAdditionalInfo: 'Extra info',
      declaration: true,
      // NOTE: Certification fields (optional) - Added for testing/demo purposes
      // In real workflows, these are populated later in the approval process
      technicalApproval: 'Certified',
      englandApproval: 'Certified',
      scotlandApproval: 'Certified',
      walesApproval: 'Certified',
      nIrelandApproval: 'Certified'
      //legacyRecord: false //default to false
    },
    {
      // NOTE: These fields are auto-generated/set by server
      // applicationId: 'app-uuid-12345',
      // applianceId: 'APP-xyz789uvw012',
      // createdAt: new Date('2026-07-01T10:00:00Z'),
      // updatedAt: new Date('2026-07-01T10:00:00Z'),

      companyName: 'Beta Heating',
      companyContactName: 'Jane Smith',
      companyContactEmail: 'jane@beta.com',
      isUkBased: false,
      companyAddress: '789 International Ave',
      modelName: 'Beta 2000',
      applianceType: 'heat',
      isVariant: true,
      existingAuthorisedAppliance: 'Beta 1000',
      nominalOutput: 12,
      multifuelAppliance: false,
      allowedFuels: 'Wood Pellets',
      instructionManualTitle: 'Beta Manual',
      instructionManualDate: new Date('2026-03-10'),
      declaration: true,
      // NOTE: Certification fields (optional) - Added for testing/demo purposes
      // In real workflows, these are populated later in the approval process
      technicalApproval: 'Certified',
      englandApproval: 'Certified',
      scotlandApproval: 'Certified',
      walesApproval: 'Revoked',
      nIrelandApproval: 'Uncertified'
      //legacyRecord: false //default to false
    }
  ]
}
