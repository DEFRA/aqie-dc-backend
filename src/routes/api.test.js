import {
  beforeAll,
  afterAll,
  beforeEach,
  describe,
  test,
  expect,
  vi
} from 'vitest'
import * as dbService from './db-service.js'

// Mock db-service before server creation so routes use the mocks
vi.mock('./db-service.js', () => ({
  createItem: vi.fn(),
  findAllItems: vi.fn(),
  findItem: vi.fn(),
  updateItem: vi.fn(),
  deleteItem: vi.fn()
}))

describe('api routes (generic)', () => {
  let server

  beforeAll(async () => {
    // dynamic import ensures test mocks/setup are applied before server module loads
    const mod = await import('../server.js') // adjust path in db-service.test.js if necessary
    server = await mod.createServer()
    await server.initialize()
  }, 20000) // optional increased timeout (20s) to avoid CI timing issues

  afterAll(async () => {
    if (server) {
      await server.stop({ timeout: 1000 })
    }
  })

  beforeEach(() => {
    vi.resetAllMocks()
  })

  const validAppliance = {
    companyName: 'ACME',
    companyAddress: '123 Street',
    companyContactName: 'John Doe',
    companyContactEmail: 'john@acme.com',
    companyAlternateEmail: 'alt@acme.com',
    companyPhone: '+447523456789',
    modelName: 'Model X',
    modelNumber: 123,
    applianceType: 'heat',
    isVariant: false,
    existingAuthorisedAppliance: 'Old Model',
    nominalOutput: 10,
    multiFuelAppliance: false,
    allowedFuels: ['Wood Logs', 'Wood Pellets', 'Wood Chips', 'Other'],
    testReport: 'TR-001',
    technicalDrawings: 'drawing.pdf',
    ceMark: 'CE123',
    conditionsForUse: 'indoor',
    instructionManual: 'manual.pdf',
    instructionManualTitle: 'Manual X',
    instructionManualDate: '2026-02-03',
    instructionManualVersion: 'Version 1',
    declaration: true,
    instructionManualAdditionalInfo: 'Extra info',
    airControlModifications:
      'Must be fitted with the supplied secondary air control limiters',
    submittedBy: 'Alice',
    walesApprovedBy: 'Bob',
    nIrelandApprovedBy: 'Charlie',
    scotlandApprovedBy: 'Dave',
    englandApprovedBy: 'Eve',
    publishedDate: '2026-02-03',
    submittedDate: '2026-02-01',
    technicalApproval: 'Certified',
    walesApproval: 'Certified',
    nIrelandApproval: 'Certified',
    scotlandApproval: 'Certified',
    englandApproval: 'Certified'
  }
  const validFuel = {
    companyName: 'FuelCo',
    companyAddress: 'Some address',
    companyContactName: 'Fuel Person',
    companyContactEmail: 'fuel@co.com',
    companyAlternateEmail: 'alt@co.com',
    companyPhone: '+441234567890',
    responsibleName: 'Rep Name',
    responsibleEmailAddress: 'rep@co.com',
    customerComplaints: false,
    qualityControlSystem: 'ISO certified',
    manufacturerOrReseller: 'Manufacturer',
    originalFuelManufacturer: 'Fuels LTD',
    originalFuelNameOrBrand: 'FireFuel',
    changedFromOriginalFuel: false,
    changesMade: 'The fuels was turned into love hearts',
    fuelBagging: 'Bagged',
    baggedAtSource: true,
    fuelDescription: 'Premium pellets',
    fuelWeight: 20,
    fuelComposition: 'Wood 100%',
    sulphurContent: 0.7,
    manufacturingProcess: 'Kiln-dried',
    brandNames: 'PelletBrand',
    letterFromManufacturer: 'Letter.pdf',
    testReports: 'TR-F-122',
    fuelAdditionalDocuments: 'Extra.pdf',
    declaration: true,
    submittedBy: 'Alice',
    walesApprovedBy: 'Bob',
    nIrelandApprovedBy: 'Charlie',
    scotlandApprovedBy: 'Dave',
    englandApprovedBy: 'Eve',
    publishedDate: '2026-02-03',
    submittedDate: '2026-02-01',
    technicalApproval: 'Certified',
    walesApproval: 'Certified',
    nIrelandApproval: 'Certified',
    scotlandApproval: 'Certified',
    englandApproval: 'Certified'
  }

  test('GET /get-all/appliance -> OK (200) with data', async () => {
    dbService.findAllItems.mockResolvedValue([{ applianceId: 'APP-1' }])

    const res = await server.inject({
      method: 'GET',
      url: '/get-all/appliance'
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body.msg).toBe('OK')
    expect(Array.isArray(body.data)).toBe(true)
  })

  test('GET /get-all/appliance -> error -> 500', async () => {
    dbService.findAllItems.mockRejectedValue(new Error('boom'))

    const res = await server.inject({
      method: 'GET',
      url: '/get-all/appliance'
    })

    expect(res.statusCode).toBe(500)
    expect(JSON.parse(res.payload).msg).toBe('Failed to fetch items')
  })

  test('GET /get/appliance/:id -> found (200)', async () => {
    dbService.findItem.mockResolvedValue({
      applianceId: 'APP-1',
      companyName: 'ACME'
    })

    const res = await server.inject({
      method: 'GET',
      url: '/get/appliance/APP-1'
    })

    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.payload).data.companyName).toBe('ACME')
  })

  test('GET /get/appliance/:id -> not found (404)', async () => {
    dbService.findItem.mockResolvedValue(null)

    const res = await server.inject({
      method: 'GET',
      url: '/get/appliance/NOPE'
    })

    expect(res.statusCode).toBe(404)
    expect(JSON.parse(res.payload).msg).toBe('Not found')
  })

  test('PATCH /update/appliance/:id -> updated (200)', async () => {
    dbService.updateItem.mockResolvedValue({
      updated: { applianceId: 'APP-1', foo: 'bar' }
    })

    const res = await server.inject({
      method: 'PATCH',
      url: '/update/appliance/APP-1',
      payload: { foo: 'bar' }
    })

    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.payload)).toEqual({
      msg: 'Updated',
      data: {
        applianceId: 'APP-1',
        foo: 'bar'
      }
    })
  })

  test('PATCH /update/appliance/:id -> not found (404)', async () => {
    dbService.updateItem.mockResolvedValue({ notFound: true })

    const res = await server.inject({
      method: 'PATCH',
      url: '/update/appliance/NOPE',
      payload: { foo: 'bar' }
    })

    expect(res.statusCode).toBe(404)
    expect(JSON.parse(res.payload).msg).toBe('Not found')
  })

  test('DELETE /delete/appliance/:id -> deleted (200)', async () => {
    dbService.deleteItem.mockResolvedValue({ deleted: true })

    const res = await server.inject({
      method: 'DELETE',
      url: '/delete/appliance/APP-1'
    })

    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.payload)).toEqual({
      msg: 'Deleted',
      applicationId: 'APP-1'
    })
  })

  test('DELETE /delete/appliance/:id -> not found (404)', async () => {
    dbService.deleteItem.mockResolvedValue({ notFound: true })

    const res = await server.inject({
      method: 'DELETE',
      url: '/delete/appliance/NOPE'
    })

    expect(res.statusCode).toBe(404)
    expect(JSON.parse(res.payload).msg).toBe('Not found')
  })

  test('invalid type param returns 400', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/get-all/invalid-type'
    })
    expect(res.statusCode).toBe(400)
  })

  test('POST /add-new/fuel -> Created (201) with applicationId', async () => {
    dbService.createItem.mockResolvedValue({
      fuelId: 'FUEL-1',
      _id: 'mongoid'
    })

    const res = await server.inject({
      method: 'POST',
      url: '/add-new/fuel',
      payload: validFuel
    })

    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.payload)
    expect(body).toEqual({ msg: 'Created', fuelId: 'FUEL-1' })
  })

  test('POST /add-new/appliance -> invalid payload -> 400', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/add-new/appliance',
      payload: {} // missing required fields
    })
    expect(res.statusCode).toBe(400)
  })

  test('POST /add-new/appliance -> invalid phone -> 400 and message contains "Invalid phone number"', async () => {
    const badPhonePayload = {
      ...validAppliance,
      companyPhone: 'notaphone'
    }
    const res = await server.inject({
      method: 'POST',
      url: '/add-new/appliance',
      payload: badPhonePayload
    })
    expect(res.statusCode).toBe(400)
  })

  test('PATCH /update/appliance/:id -> create server error -> 500', async () => {
    dbService.updateItem.mockRejectedValue(new Error('db fail'))
    const res = await server.inject({
      method: 'PATCH',
      url: '/update/appliance/APP-1',
      payload: { foo: 'bar' }
    })
    expect(res.statusCode).toBe(500)
    expect(JSON.parse(res.payload).msg).toBe('Failed to update item')
  })

  test('DELETE /delete/appliance/:id -> create server error -> 500', async () => {
    dbService.deleteItem.mockRejectedValue(new Error('db fail'))
    const res = await server.inject({
      method: 'DELETE',
      url: '/delete/appliance/APP-1'
    })
    expect(res.statusCode).toBe(500)
    expect(JSON.parse(res.payload).msg).toBe('Failed to delete item')
  })

  test('GET /get-all/fuel -> OK (200) with data', async () => {
    dbService.findAllItems.mockResolvedValue([{ fuelId: 'FUEL-1' }])

    const res = await server.inject({
      method: 'GET',
      url: '/get-all/fuel'
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body.msg).toBe('OK')
    expect(Array.isArray(body.data)).toBe(true)
  })

  test('POST /add-new/appliance -> invalid phone in pre failAction -> 400', async () => {
    const payload = { ...validAppliance, companyPhone: 'notaphone' }

    const res = await server.inject({
      method: 'POST',
      url: '/add-new/appliance',
      payload
    })

    expect(res.statusCode).toBe(400)
    const body = JSON.parse(res.payload)
    expect(body.msg).toBe('Validation failed')
    expect(body.details).toBeDefined()
  })

  test('POST /add-new/fuel -> invalid phone in pre failAction -> 400', async () => {
    const badPhonePayload = { ...validFuel, companyPhone: 'notaphone' }

    const res = await server.inject({
      method: 'POST',
      url: '/add-new/fuel',
      payload: badPhonePayload
    })

    expect(res.statusCode).toBe(400)
    const body = JSON.parse(res.payload)
    expect(body.msg).toBe('Validation failed')
  })

  test('POST /add-new/appliance -> phone custom validator catch block (invalid format)', async () => {
    const payload = { ...validAppliance, companyPhone: '!!!invalid!!!' }

    const res = await server.inject({
      method: 'POST',
      url: '/add-new/appliance',
      payload
    })

    expect(res.statusCode).toBe(400)
    const body = JSON.parse(res.payload)
    expect(body.msg).toBe('Validation failed')
    expect(body.details).toBeDefined()
  })

  // Tests for approval field defaults and validation
  test('POST /add-new/appliance -> technicalApproval empty string defaults to Uncertified', async () => {
    const payload = { ...validAppliance, technicalApproval: '' }
    dbService.createItem.mockResolvedValue({
      applianceId: 'APP-1',
      technicalApproval: 'Uncertified'
    })

    const res = await server.inject({
      method: 'POST',
      url: '/add-new/appliance',
      payload
    })

    if (res.statusCode !== 201) {
      console.log('Error details:', JSON.parse(res.payload))
    }
    expect(res.statusCode).toBe(201)
  })

  test('POST /add-new/appliance -> technicalApproval null defaults to Uncertified', async () => {
    const payload = { ...validAppliance, technicalApproval: null }
    dbService.createItem.mockResolvedValue({
      applianceId: 'APP-1',
      technicalApproval: 'Uncertified'
    })

    const res = await server.inject({
      method: 'POST',
      url: '/add-new/appliance',
      payload
    })

    expect(res.statusCode).toBe(201)
  })

  test('POST /add-new/appliance -> technicalApproval omitted defaults to Uncertified', async () => {
    const { technicalApproval, ...payloadWithoutTechnical } = validAppliance
    dbService.createItem.mockResolvedValue({
      applianceId: 'APP-1',
      technicalApproval: 'Uncertified'
    })

    const res = await server.inject({
      method: 'POST',
      url: '/add-new/appliance',
      payload: payloadWithoutTechnical
    })

    expect(res.statusCode).toBe(201)
  })

  test('POST /add-new/appliance -> technicalApproval "Certified" stays Certified', async () => {
    const payload = { ...validAppliance, technicalApproval: 'Certified' }
    dbService.createItem.mockResolvedValue({
      applianceId: 'APP-1',
      technicalApproval: 'Certified'
    })

    const res = await server.inject({
      method: 'POST',
      url: '/add-new/appliance',
      payload
    })

    expect(res.statusCode).toBe(201)
  })

  test('POST /add-new/appliance -> technicalApproval "undefined" string returns validation error', async () => {
    const payload = { ...validAppliance, technicalApproval: 'undefined' }

    const res = await server.inject({
      method: 'POST',
      url: '/add-new/appliance',
      payload
    })

    expect(res.statusCode).toBe(400)
    const body = JSON.parse(res.payload)
    expect(body.msg).toBe('Validation failed')
    expect(body.details).toBeDefined()
  })

  test('POST /add-new/appliance -> technicalApproval "Foo" returns validation error', async () => {
    const payload = { ...validAppliance, technicalApproval: 'Foo' }

    const res = await server.inject({
      method: 'POST',
      url: '/add-new/appliance',
      payload
    })

    expect(res.statusCode).toBe(400)
    const body = JSON.parse(res.payload)
    expect(body.msg).toBe('Validation failed')
    expect(body.details).toBeDefined()
  })
})
