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
import { createServer } from '../server.js'

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
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 1000 })
  })

  beforeEach(() => {
    vi.resetAllMocks()
  })

  const validAppliance = {
    permittedFuels: 'wood',
    manufacturer: 'ACME',
    manufacturerAddress: '123 Street',
    manufacturerContactName: 'John Doe',
    manufacturerContactEmail: 'john@acme.com',
    manufacturerAlternateContactEmail: 'alt@acme.com',
    modelName: 'Model X',
    modelNumber: 123,
    applianceType: 'heat',
    isVariant: false,
    nominalOutput: 10,
    allowedFuels: 'wood',
    testReport: 'TR-001',
    technicalDrawings: 'drawing.pdf',
    ceMark: 'CE123',
    conditionForUse: 'indoor',
    instructionManualTitle: 'Manual X',
    instructionManualDate: '2026-02-03',
    instructionManualReference: 'IM-123',
    submittedBy: 'Alice',
    approvedBy: 'Bob',
    publishedDate: '2026-02-03'
  }

  test('POST /add-new/appliance -> createItem throws -> 500', async () => {
    dbService.createItem.mockRejectedValue(new Error('insert failed'))

    const res = await server.inject({
      method: 'POST',
      url: '/add-new/appliance',
      payload: validAppliance
    })

    expect(res.statusCode).toBe(500)
    const body = JSON.parse(res.payload)
    expect(body).toMatchObject({ msg: 'Failed to create item' })
  })

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
      manufacturer: 'ACME'
    })

    const res = await server.inject({
      method: 'GET',
      url: '/get/appliance/APP-1'
    })

    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.payload).data.manufacturer).toBe('ACME')
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
  test('POST /add-new/appliance -> Created (201) with applicationId', async () => {
    dbService.createItem.mockResolvedValue({
      applianceId: 'APP-1',
      _id: 'mongoid'
    })

    const res = await server.inject({
      method: 'POST',
      url: '/add-new/appliance',
      payload: validAppliance
    })

    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.payload)
    expect(body).toEqual({ msg: 'Created', applicationId: 'APP-1' })
  })

  test('POST /add-new/fuel -> Created (201) with applicationId', async () => {
    dbService.createItem.mockResolvedValue({
      fuelId: 'FUEL-1',
      _id: 'mongoid'
    })

    const payload = {
      manufacturer: 'FuelCo',
      manufacturerAddress: 'Addr',
      manufacturerContactName: 'Name',
      manufacturerContactEmail: 'a@b.com',
      manufacturerAlternateContactEmail: 'b@c.com',
      manufacturerPhone: '+441234567890',
      representativeName: 'Rep',
      representativeEmailAddress: 'rep@co.com',
      customerComplaints: false,
      qualityControlSystem: 'ISO',
      certificationScheme: 'Scheme',
      fuelName: 'Pellets',
      fuelBagging: 'Bag',
      baggedAtSource: true,
      fuelDescription: 'Desc',
      fuelWeight: 20,
      fuelComposition: 'Wood',
      sulphurContent: 0.7,
      manufacturingProcess: 'Proc',
      rebrandedProduct: false,
      changedFromOriginalFuel: false,
      brandNames: 'Brand',
      testReports: 'TR',
      fuelAdditionalDocuments: 'Doc'
    }

    const res = await server.inject({
      method: 'POST',
      url: '/add-new/fuel',
      payload
    })

    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.payload)
    expect(body).toEqual({ msg: 'Created', applicationId: 'FUEL-1' })
  })

  test('POST /add-new/appliance -> uses _id fallback when no domain id returned', async () => {
    dbService.createItem.mockResolvedValue({ _id: 'mongo-id-only' })

    const res = await server.inject({
      method: 'POST',
      url: '/add-new/appliance',
      payload: validAppliance
    })

    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.payload)
    expect(body.applicationId).toBe('mongo-id-only')
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
      manufacturerPhone: 'notaphone'
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
    const payload = { ...validAppliance, manufacturerPhone: 'notaphone' }

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
    const fuelPayload = {
      manufacturer: 'FuelCo',
      manufacturerAddress: 'Addr',
      manufacturerContactName: 'Name',
      manufacturerContactEmail: 'a@b.com',
      manufacturerAlternateContactEmail: 'b@c.com',
      manufacturerPhone: 'bad-phone',
      representativeName: 'Rep',
      representativeEmailAddress: 'rep@co.com',
      customerComplaints: false,
      qualityControlSystem: 'ISO',
      certificationScheme: 'Scheme',
      fuelName: 'Pellets',
      fuelBagging: 'Bag',
      baggedAtSource: true,
      fuelDescription: 'Desc',
      fuelWeight: 20,
      fuelComposition: 'Wood',
      sulphurContent: 0.7,
      manufacturingProcess: 'Proc',
      rebrandedProduct: false,
      changedFromOriginalFuel: false,
      brandNames: 'Brand',
      testReports: 'TR',
      fuelAdditionalDocuments: 'Doc'
    }

    const res = await server.inject({
      method: 'POST',
      url: '/add-new/fuel',
      payload: fuelPayload
    })

    expect(res.statusCode).toBe(400)
    const body = JSON.parse(res.payload)
    expect(body.msg).toBe('Validation failed')
  })

  test('POST /add-new/appliance -> phone custom validator catch block (invalid format)', async () => {
    const payload = { ...validAppliance, manufacturerPhone: '!!!invalid!!!' }

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
