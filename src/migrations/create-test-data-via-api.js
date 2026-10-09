/**
 * Create test appliance records via API
 * This script simulates Swagger API calls to create test data
 * Run with: node src/migrations/create-test-data-via-api.js
 */

const BASE_URL = 'http://localhost:3001'

const testAppliances = [
  {
    // Status: Pending Review
    modelName: 'Pending Review Model',
    modelNumber: 'PENDING-001',
    applianceType: 'heat',
    companyName: 'Test Company',
    companyContact: {
      name: 'John Doe',
      email: 'john@test.com',
      phone: '+447537328906'
    },
    isUkBased: true,
    companyAddress: {
      line1: '456 Factory Road',
      line2: 'Unit 7',
      city: 'Birmingham',
      county: 'West Midlands',
      postcode: 'B1 2AB'
    },
    nominalOutput: 10,
    permittedFuels: 'Wood Pellets',
    isVariant: false,
    multifuelAppliance: true,
    additionalConditions: 'Standard additional conditions',
    isVisibleToPublic: false,
    technicalReview: {
      status: 'accepted',
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
    englandCertification: { status: 'awaiting_decision' },
    scotlandCertification: { status: 'awaiting_decision' },
    walesCertification: { status: 'awaiting_decision' },
    nIrelandCertification: { status: 'awaiting_decision' }
  },
  {
    // Status: Hidden (Mixed Statuses) - 1 certified
    modelName: 'Mixed Status Model 1',
    modelNumber: 'MIXED-001',
    applianceType: 'heat',
    companyName: 'Test Company',
    companyContact: {
      name: 'Jane Smith',
      email: 'jane@test.com',
      phone: '+447537328906'
    },
    isUkBased: true,
    companyAddress: {
      line1: '789 Industrial Park',
      city: 'London',
      postcode: 'SW1A 1AA'
    },
    nominalOutput: 12,
    permittedFuels: 'Natural Gas',
    isVariant: false,
    multifuelAppliance: false,
    additionalConditions: 'Special requirements',
    isVisibleToPublic: false,
    technicalReview: {
      status: 'accepted',
      documentationChecks: {
        testReports: true,
        technicalDrawings: true,
        conformityMark: true,
        instructionManual: true
      }
    },
    englandCertification: {
      status: 'certified',
      decidedAt: '2026-08-15T10:00:00Z',
      decidedBy: { name: 'England Approver', email: 'approver@defra.gov.uk' }
    },
    scotlandCertification: { status: 'awaiting_decision' },
    walesCertification: { status: 'awaiting_decision' },
    nIrelandCertification: { status: 'awaiting_decision' }
  },
  {
    // Status: Hidden (Multiple Certified) - 2 certified
    modelName: 'Mixed Status Model 2',
    modelNumber: 'MIXED-002',
    applianceType: 'heat',
    companyName: 'Test Company',
    companyContact: {
      name: 'Bob Johnson',
      email: 'bob@test.com',
      phone: '+447537328906'
    },
    isUkBased: true,
    companyAddress: {
      line1: '123 Main Street',
      city: 'Manchester',
      postcode: 'M1 1AA'
    },
    nominalOutput: 15,
    permittedFuels: 'Oil',
    isVariant: true,
    multifuelAppliance: true,
    additionalConditions: 'Oil supply requirements',
    isVisibleToPublic: false,
    technicalReview: {
      status: 'accepted',
      documentationChecks: {
        testReports: true,
        technicalDrawings: true,
        conformityMark: true,
        instructionManual: true
      }
    },
    englandCertification: {
      status: 'certified',
      decidedAt: '2026-08-10T10:00:00Z',
      decidedBy: { name: 'England Approver', email: 'approver@defra.gov.uk' }
    },
    scotlandCertification: {
      status: 'certified',
      decidedAt: '2026-08-12T10:00:00Z',
      decidedBy: {
        name: 'Scotland Approver',
        email: 'approver@scotland.gov.uk'
      }
    },
    walesCertification: { status: 'awaiting_decision' },
    nIrelandCertification: { status: 'awaiting_decision' }
  },
  {
    // Status: Hidden (Multiple Certified) - 3 certified
    modelName: 'Mixed Status Model 3',
    modelNumber: 'MIXED-003',
    applianceType: 'heat',
    companyName: 'Test Company',
    companyContact: {
      name: 'Alice Brown',
      email: 'alice@test.com',
      phone: '+447537328906'
    },
    isUkBased: true,
    companyAddress: {
      line1: '999 Steel Works',
      city: 'Sheffield',
      postcode: 'S1 1AA'
    },
    nominalOutput: 18,
    permittedFuels: 'Coal',
    isVariant: false,
    multifuelAppliance: false,
    additionalConditions: 'Coal burning certification required',
    isVisibleToPublic: false,
    technicalReview: {
      status: 'accepted',
      documentationChecks: {
        testReports: true,
        technicalDrawings: true,
        conformityMark: true,
        instructionManual: true
      }
    },
    englandCertification: {
      status: 'certified',
      decidedAt: '2026-08-05T10:00:00Z',
      decidedBy: { name: 'England Approver', email: 'approver@defra.gov.uk' }
    },
    scotlandCertification: {
      status: 'certified',
      decidedAt: '2026-08-08T10:00:00Z',
      decidedBy: {
        name: 'Scotland Approver',
        email: 'approver@scotland.gov.uk'
      }
    },
    walesCertification: {
      status: 'certified',
      decidedAt: '2026-08-07T10:00:00Z',
      decidedBy: { name: 'Wales Approver', email: 'approver@wales.gov.uk' }
    },
    nIrelandCertification: { status: 'awaiting_decision' }
  },
  {
    // Status: Live (All Certified & Visible)
    modelName: 'All Certified Model',
    modelNumber: 'CERT-001',
    applianceType: 'heat',
    companyName: 'Test Company',
    companyContact: {
      name: 'Charlie Davis',
      email: 'charlie@test.com',
      phone: '+447537328906'
    },
    isUkBased: true,
    companyAddress: {
      line1: '555 Tech Park',
      city: 'Cambridge',
      postcode: 'CB1 1AA'
    },
    nominalOutput: 20,
    permittedFuels: 'Biomass Pellets',
    isVariant: false,
    multifuelAppliance: false,
    additionalConditions: 'Biomass certified model',
    isVisibleToPublic: true,
    technicalReview: {
      status: 'accepted',
      reviewedBy: {
        name: 'Senior Reviewer',
        email: 'senior@defra.gov.uk'
      },
      documentationChecks: {
        testReports: true,
        technicalDrawings: true,
        conformityMark: true,
        instructionManual: true
      }
    },
    englandCertification: {
      status: 'certified',
      decidedAt: '2026-07-01T10:00:00Z',
      decidedBy: { name: 'England Approver', email: 'approver@defra.gov.uk' }
    },
    scotlandCertification: {
      status: 'certified',
      decidedAt: '2026-07-02T10:00:00Z',
      decidedBy: {
        name: 'Scotland Approver',
        email: 'approver@scotland.gov.uk'
      }
    },
    walesCertification: {
      status: 'certified',
      decidedAt: '2026-07-03T10:00:00Z',
      decidedBy: { name: 'Wales Approver', email: 'approver@wales.gov.uk' }
    },
    nIrelandCertification: {
      status: 'certified',
      decidedAt: '2026-07-04T10:00:00Z',
      decidedBy: { name: 'NI Approver', email: 'approver@ni.gov.uk' }
    }
  },
  {
    // Status: Rejected
    modelName: 'Rejected Model',
    modelNumber: 'REJECT-001',
    applianceType: 'heat',
    companyName: 'Test Company',
    companyContact: {
      name: 'Eve Wilson',
      email: 'eve@test.com',
      phone: '+447537328906'
    },
    isUkBased: true,
    companyAddress: {
      line1: '222 Factory Blvd',
      city: 'Leeds',
      postcode: 'LS1 1AA'
    },
    nominalOutput: 8,
    permittedFuels: 'Wood Logs',
    isVariant: false,
    multifuelAppliance: false,
    additionalConditions: 'Does not meet standards',
    isVisibleToPublic: false,
    technicalReview: {
      status: 'rejected',
      reviewedBy: {
        name: 'Technical Reviewer',
        email: 'tech@defra.gov.uk'
      },
      documentationChecks: {
        testReports: false,
        technicalDrawings: true,
        conformityMark: false,
        instructionManual: true
      }
    },
    englandCertification: {
      status: 'rejected',
      decidedAt: '2026-08-20T10:00:00Z',
      decidedBy: { name: 'England Approver', email: 'approver@defra.gov.uk' }
    },
    scotlandCertification: {
      status: 'rejected',
      decidedAt: '2026-08-21T10:00:00Z',
      decidedBy: {
        name: 'Scotland Approver',
        email: 'approver@scotland.gov.uk'
      }
    },
    walesCertification: {
      status: 'rejected',
      decidedAt: '2026-08-22T10:00:00Z',
      decidedBy: { name: 'Wales Approver', email: 'approver@wales.gov.uk' }
    },
    nIrelandCertification: {
      status: 'rejected',
      decidedAt: '2026-08-23T10:00:00Z',
      decidedBy: { name: 'NI Approver', email: 'approver@ni.gov.uk' }
    }
  }
]

async function createTestData() {
  console.log('🚀 Creating test appliances via API...\n')

  const results = []

  for (let i = 0; i < testAppliances.length; i++) {
    const appliance = testAppliances[i]
    try {
      const response = await fetch(`${BASE_URL}/appliances`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(appliance)
      })

      const data = await response.json()

      if (response.ok && data.success) {
        results.push({
          modelName: appliance.modelName,
          id: data.data?.id,
          success: true
        })
        console.log(`✅ (${i + 1}/6) Created: ${appliance.modelName}`)
        console.log(`   ID: ${data.data?.id}`)
      } else {
        results.push({
          modelName: appliance.modelName,
          success: false,
          error: data.message || response.statusText
        })
        console.log(`❌ (${i + 1}/6) Failed: ${appliance.modelName}`)
        console.log(`   Error: ${data.message || response.statusText}`)
      }
    } catch (error) {
      results.push({
        modelName: appliance.modelName,
        success: false,
        error: error.message
      })
      console.log(`❌ (${i + 1}/6) Error: ${appliance.modelName}`)
      console.log(`   ${error.message}`)
    }
  }

  // Summary
  console.log('\n📋 Summary:')
  console.log('=' + '='.repeat(50))
  const successCount = results.filter((r) => r.success).length
  const failCount = results.filter((r) => !r.success).length

  results.forEach((result) => {
    const status = result.success ? '✅' : '❌'
    console.log(`${status} ${result.modelName}`)
    if (result.id) {
      console.log(`   → http://localhost:3000/appliance-record/${result.id}`)
    }
  })

  console.log('=' + '='.repeat(50))
  console.log(
    `\n✅ Successfully created: ${successCount}/${testAppliances.length}`
  )
  if (failCount > 0) {
    console.log(`❌ Failed: ${failCount}/${testAppliances.length}`)
  }

  if (successCount === testAppliances.length) {
    console.log('\n🎉 All test appliances created successfully!')
    console.log(
      '🌐 Visit http://localhost:3000/appliance-record/{id} to view them'
    )
  }
}

// Check if backend is running
async function checkBackendHealth() {
  try {
    const response = await fetch(`${BASE_URL}/health`)
    return response.ok
  } catch {
    return false
  }
}

// Main
;(async () => {
  const isHealthy = await checkBackendHealth()
  if (!isHealthy) {
    console.error('❌ Backend server is not running at ' + BASE_URL)
    console.error('Please start the backend with: npm start')
    process.exit(1)
  }

  await createTestData()
})()
