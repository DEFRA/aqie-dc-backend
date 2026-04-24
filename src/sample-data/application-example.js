import { applicationsSchema } from "../routes/schema.js";

// Example application payload for tests and API documentation
export default {
    applicationId: 'APP-EXAMPLE-001',
	applicationType: 'appliance',
	submittedAt: '2026-04-24T12:00:00Z',
	status: 'New',
	reviewerEmail: 'reviewer@person.co.uk',
	appliances: [
		{
			applicationId: 'APP-EXAMPLE-001',
			companyName: 'ACME',
			companyContactName: 'John Doe',
			companyContactEmail: 'john@acme.com',
			companyAlternateEmail: 'alt@acme.com',
			companyPhone: '+447537328906',
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
			allowedFuels: ['Wood Logs', 'Wood Pellets', 'Wood Chips', 'Other'],
			instructionManualTitle: 'Manual X',
			instructionManualDate: '2026-02-03',
			instructionManualVersion: 'Version 1',
			instructionManualAdditionalInfo: 'Extra info',
			declaration: true
		},
		{
			applicationId: 'APP-EXAMPLE-001',
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
			allowedFuels: ['Wood Pellets'],
			instructionManualTitle: 'Beta Manual',
			instructionManualDate: '2026-03-10',
			declaration: true
		}
	]
}