import {
  beforeAll,
  afterAll,
  beforeEach,
  describe,
  test,
  expect,
  vi
} from 'vitest'
import {
  createItem,
  findAllItems,
  findItem,
  updateItem,
  deleteItem
} from './db-service.js'

describe('db-service', () => {
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

  beforeEach(async () => {
    await server.db.collection('Appliance').deleteMany({})
    await server.db.collection('Fuel').deleteMany({})
  })

  test('createItem throws for missing db/type', async () => {
    await expect(createItem(undefined, 'appliance', {})).rejects.toThrow(
      'db is required'
    )
    await expect(createItem(server.db, undefined, {})).rejects.toThrow(
      'type is required'
    )
  })

  test('createItem throws for unknown type', async () => {
    await expect(createItem(server.db, 'unknown', {})).rejects.toThrow(
      'Unknown type: unknown'
    )
  })

  test('createItem inserts appliance and returns generated ids and timestamps', async () => {
    const res = await createItem(server.db, 'appliance', {
      manufacturer: 'ACME'
    })
    expect(res.applianceId).toMatch(/^APP-/)
    expect(res.createdAt).toBeInstanceOf(Date)
    expect(res.updatedAt).toBeInstanceOf(Date)
    expect(res._id).toBeDefined()

    const saved = await server.db
      .collection('Appliance')
      .findOne({ applianceId: res.applianceId })
    expect(saved).not.toBeNull()
    expect(saved.manufacturer).toBe('ACME')
  })

  test('findAllItems and findItem return expected data', async () => {
    const a1 = await createItem(server.db, 'appliance', {
      manufacturer: 'A1',
      technicalApproval: 'Approved',
      walesApproval: 'Approved',
      nIrelandApproval: 'Approved',
      scotlandApproval: 'Approved',
      englandApproval: 'Approved'
    })
    const all = await findAllItems(server.db, 'appliance')
    expect(Array.isArray(all)).toBe(true)

    const found = await findItem(server.db, 'appliance', a1.applianceId)
    expect(found).not.toBeNull()
    expect(found.manufacturer).toBe('A1')
  })
  test('findAllFeuel and findItem return expected data', async () => {
    const a1 = await createItem(server.db, 'fuel', {
      manufacturer: 'A1',
      technicalApproval: 'Approved',
      walesApproval: 'Approved',
      nIrelandApproval: 'Approved',
      scotlandApproval: 'Approved',
      englandApproval: 'Approved'
    })
    const all = await findAllItems(server.db, 'fuel')
    expect(Array.isArray(all)).toBe(true)

    const found = await findItem(server.db, 'fuel', a1.fuelId)
    expect(found).not.toBeNull()
    expect(found.manufacturer).toBe('A1')
  })

  test('updateItem updates document and returns updated document', async () => {
    const created = await createItem(server.db, 'appliance', {
      manufacturer: 'Old'
    })
    const { updated } = await updateItem(
      server.db,
      'appliance',
      created.applianceId,
      { manufacturer: 'New' }
    )
    expect(updated).toBeDefined()
    expect(updated.manufacturer).toBe('New')
  })

  test('updateItem returns notFound for missing document', async () => {
    const r = await updateItem(server.db, 'appliance', 'NONEXISTENT', {
      foo: 'bar'
    })
    expect(r.notFound).toBe(true)
  })

  test('deleteItem deletes document and returns deleted true', async () => {
    const created = await createItem(server.db, 'fuel', {
      manufacturer: 'ToDelete'
    })
    const r = await deleteItem(server.db, 'fuel', created.fuelId)
    expect(r.deleted).toBe(true)
    const found = await server.db
      .collection('Fuel')
      .findOne({ fuelId: created.fuelId })
    expect(found).toBeNull()
  })

  test('deleteItem returns notFound for missing document', async () => {
    const r = await deleteItem(server.db, 'fuel', 'NOPE')
    expect(r.notFound).toBe(true)
  })

  test('findAllItems throws for unknown type', async () => {
    await expect(findAllItems(server.db, 'unknown')).rejects.toThrow(
      'Unknown type: unknown'
    )
  })

  test('findItem returns null when item not found', async () => {
    const result = await findItem(server.db, 'appliance', 'APP-NONEXISTENT123')
    expect(result).toBeNull()
  })

  test('findItem returns null for fuel when not found', async () => {
    const result = await findItem(server.db, 'fuel', 'FUEL-NONEXISTENT456')
    expect(result).toBeNull()
  })

  test('findItem for appliance includes all manufacturer fields', async () => {
    await createItem(server.db, 'appliance', {
      modelName: 'Model X',
      applianceId: 'APP-TEST-001',
      companyName: 'Acme Corp',
      companyAddress: '123 Main St',
      companyContactName: 'John Doe',
      companyContactEmail: 'john@acme.com',
      companyAlternateEmail: 'john.doe@acme.com',
      companyPhone: '555-1234',
      walesApproval: 'Certified',
      nIrelandApproval: 'Uncertified',
      scotlandApproval: 'Certified',
      englandApproval: 'Certified'
    })

    const found = await findItem(server.db, 'appliance', 'APP-TEST-001')

    expect(found).not.toBeNull()
    expect(found.manufacturerName).toBe('Acme Corp')
    expect(found.manufacturerAddress).toBe('123 Main St')
    expect(found.manufacturerContactName).toBe('John Doe')
    expect(found.manufacturerContactEmail).toBe('john@acme.com')
    expect(found.manufacturerAlternateEmail).toBe('john.doe@acme.com')
    expect(found.manufacturerPhone).toBe('555-1234')
    expect(found.name).toBe('Model X')
    expect(found.id).toBe('APP-TEST-001')
  })

  test('findItem for fuel includes all manufacturer fields', async () => {
    await createItem(server.db, 'fuel', {
      brandNames: 'FuelBrand X',
      fuelId: 'FUEL-TEST-001',
      companyName: 'FuelCo Ltd',
      companyAddress: '456 Fuel St',
      companyContactName: 'Jane Smith',
      companyContactEmail: 'jane@fuelco.com',
      companyAlternateEmail: 'jane.smith@fuelco.com',
      companyPhone: '555-5678',
      walesApproval: 'Uncertified',
      nIrelandApproval: 'Certified',
      scotlandApproval: 'Certified',
      englandApproval: 'Uncertified'
    })

    const found = await findItem(server.db, 'fuel', 'FUEL-TEST-001')

    expect(found).not.toBeNull()
    expect(found.manufacturerName).toBe('FuelCo Ltd')
    expect(found.manufacturerAddress).toBe('456 Fuel St')
    expect(found.manufacturerContactName).toBe('Jane Smith')
    expect(found.manufacturerContactEmail).toBe('jane@fuelco.com')
    expect(found.manufacturerAlternateEmail).toBe('jane.smith@fuelco.com')
    expect(found.manufacturerPhone).toBe('555-5678')
    expect(found.name).toBe('FuelBrand X')
  })

  test('findItem handles undefined manufacturer fields with empty strings', async () => {
    await createItem(server.db, 'appliance', {
      modelName: 'Simple Model',
      applianceId: 'APP-TEST-002'
      // no company fields provided
    })

    const found = await findItem(server.db, 'appliance', 'APP-TEST-002')

    expect(found).not.toBeNull()
    expect(found.manufacturerName).toBe('')
    expect(found.manufacturerAddress).toBe('')
    expect(found.manufacturerContactName).toBe('')
    expect(found.manufacturerContactEmail).toBe('')
    expect(found.manufacturerAlternateEmail).toBe('')
    expect(found.manufacturerPhone).toBe('')
  })

  test('findAllItems filters by technicalApproval and regional approvals correctly for appliances', async () => {
    // Create appliance with Certified status in all regions
    await createItem(server.db, 'appliance', {
      modelName: 'Certified Model',
      technicalApproval: 'Certified',
      walesApproval: 'Certified',
      nIrelandApproval: 'Certified',
      scotlandApproval: 'Certified',
      englandApproval: 'Certified'
    })

    // Create appliance with missing technicalApproval
    await createItem(server.db, 'appliance', {
      modelName: 'Missing Technical Approval',
      walesApproval: 'Certified',
      nIrelandApproval: 'Certified',
      scotlandApproval: 'Certified',
      englandApproval: 'Certified'
    })

    // Create appliance with non-Certified regional approvals (no Certified region)
    await createItem(server.db, 'appliance', {
      modelName: 'No Regional Approval',
      technicalApproval: 'Certified',
      walesApproval: 'Uncertified',
      nIrelandApproval: 'Uncertified',
      scotlandApproval: 'Uncertified',
      englandApproval: 'Uncertified'
    })

    const results = await findAllItems(server.db, 'appliance')

    // Should only return the first appliance with Certified technical and at least one Certified region
    expect(results.length).toBe(1)
    expect(results[0].name).toBe('Certified Model')
  })

  test('findAllItems filters by technicalApproval and regional approvals correctly for fuels', async () => {
    // Create fuel with Certified status in all regions
    await createItem(server.db, 'fuel', {
      brandNames: 'Certified Fuel',
      technicalApproval: 'Certified',
      walesApproval: 'Certified',
      nIrelandApproval: 'Certified',
      scotlandApproval: 'Certified',
      englandApproval: 'Certified'
    })

    // Create fuel with missing technicalApproval
    await createItem(server.db, 'fuel', {
      brandNames: 'Missing Approval',
      walesApproval: 'Certified',
      nIrelandApproval: 'Certified',
      scotlandApproval: 'Certified',
      englandApproval: 'Certified'
    })

    const results = await findAllItems(server.db, 'fuel')

    // Should only return the first fuel with all Certified approvals
    expect(results.length).toBe(1)
    expect(results[0].name).toBe('Certified Fuel')
  })

  test('findAllItems for appliances includes all required fields', async () => {
    await createItem(server.db, 'appliance', {
      modelName: 'Test Appliance',
      modelNumber: 'MOD-001',
      applianceType: 'Boiler',
      allowedFuels: ['Gas', 'Oil'],
      companyName: 'TestCorp',
      technicalApproval: 'Certified',
      walesApproval: 'Certified',
      nIrelandApproval: 'Certified',
      scotlandApproval: 'Certified',
      englandApproval: 'Certified'
    })

    const results = await findAllItems(server.db, 'appliance')

    expect(results.length).toBe(1)
    expect(results[0]).toHaveProperty('name')
    expect(results[0]).toHaveProperty('id')
    expect(results[0]).toHaveProperty('manufacturer')
    expect(results[0]).toHaveProperty('fuels')
    expect(results[0]).toHaveProperty('type')
    expect(results[0]).toHaveProperty('modelNumber')
    expect(results[0]).toHaveProperty('authorisedIn')
    expect(results[0].fuels).toBe('Gas, Oil')
  })

  test('findAllItems for fuels includes all required fields', async () => {
    await createItem(server.db, 'fuel', {
      brandNames: 'Test Fuel',
      companyName: 'FuelTestCorp',
      technicalApproval: 'Certified',
      walesApproval: 'Certified',
      nIrelandApproval: 'Certified',
      scotlandApproval: 'Certified',
      englandApproval: 'Certified'
    })

    const results = await findAllItems(server.db, 'fuel')

    expect(results.length).toBe(1)
    expect(results[0]).toHaveProperty('name')
    expect(results[0]).toHaveProperty('id')
    expect(results[0]).toHaveProperty('manufacturer')
    expect(results[0]).toHaveProperty('authorisedIn')
  })

  test('authorisedIn field correctly identifies regional certifications for appliance', async () => {
    await createItem(server.db, 'appliance', {
      modelName: 'Regional Test',
      technicalApproval: 'Certified',
      walesApproval: 'Certified',
      nIrelandApproval: 'Certified',
      scotlandApproval: 'Uncertified',
      englandApproval: 'Certified'
    })

    const results = await findAllItems(server.db, 'appliance')

    expect(results[0].authorisedIn).toEqual([
      'Wales',
      'Northern Ireland',
      'England'
    ])
  })

  test('authorisedIn field correctly identifies regional certifications for appliance via findItem', async () => {
    await createItem(server.db, 'appliance', {
      modelName: 'Regional Test 2',
      applianceId: 'APP-REGION-TEST',
      technicalApproval: 'Certified',
      walesApproval: 'Uncertified',
      nIrelandApproval: 'Certified',
      scotlandApproval: 'Certified',
      englandApproval: 'Uncertified'
    })

    const found = await findItem(server.db, 'appliance', 'APP-REGION-TEST')

    expect(found.authorisedIn).toEqual(['Northern Ireland', 'Scotland'])
  })

  test('authorisedIn field correctly identifies regional certifications for fuel via findItem', async () => {
    await createItem(server.db, 'fuel', {
      brandNames: 'Regional Fuel Test',
      fuelId: 'FUEL-REGION-TEST',
      technicalApproval: 'Certified',
      walesApproval: 'Certified',
      nIrelandApproval: 'Uncertified',
      scotlandApproval: 'Uncertified',
      englandApproval: 'Certified'
    })

    const found = await findItem(server.db, 'fuel', 'FUEL-REGION-TEST')

    expect(found.authorisedIn).toEqual(['Wales', 'England'])
  })

  test('createItem with existing id preserves provided id', async () => {
    const customId = 'APP-CUSTOM-ID'
    const result = await createItem(server.db, 'appliance', {
      applianceId: customId,
      modelName: 'Custom ID Model'
    })

    expect(result.applianceId).toBe(customId)

    const found = await findItem(server.db, 'appliance', customId)
    expect(found).not.toBeNull()
  })

  test('createItem with fuel and existing fuelId preserves provided id', async () => {
    const customId = 'FUEL-CUSTOM-ID'
    const result = await createItem(server.db, 'fuel', {
      fuelId: customId,
      brandNames: 'Custom Fuel'
    })

    expect(result.fuelId).toBe(customId)

    const found = await findItem(server.db, 'fuel', customId)
    expect(found).not.toBeNull()
  })

  test('createItem throws when insertOne does not acknowledge', async () => {
    // Mock the collection's insertOne to return unacknowledged result
    const mockCollection = {
      insertOne: vi.fn().mockResolvedValue({ acknowledged: false })
    }
    const mockDb = {
      collection: vi.fn().mockReturnValue(mockCollection)
    }

    await expect(
      createItem(mockDb, 'appliance', { modelName: 'Test' })
    ).rejects.toThrow('Failed to insert document')
  })
})
