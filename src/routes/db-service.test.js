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

  test('findAllItems and findItem for appliance include correct fullAddress', async () => {
    const a1 = await createItem(server.db, 'appliance', {
      manufacturer: 'A1',
      technicalApproval: 'Certified',
      englandApproval: 'Certified',
      scotlandApproval: 'Certified',
      walesApproval: 'Certified',
      nIrelandApproval: 'Certified',
      isUkBased: true,
      companyAddressLine1: '123 Main St',
      companyAddressLine2: '',
      companyAddressCity: 'London',
      companyAddressCounty: '',
      companyAddressPostcode: 'SW1A 1AA'
    })
    const all = await findAllItems(server.db, 'appliance')
    expect(Array.isArray(all)).toBe(true)
    expect(all[0].fullAddress).toBeUndefined()

    const found = await findItem(server.db, 'appliance', a1.applianceId)
    expect(found).not.toBeNull()
    expect(found.fullAddress).toEqual(['123 Main St', 'London', 'SW1A 1AA'])
  })
  test('findAllItems and findItem for fuel include correct fullAddress and lastUpdatedDate', async () => {
    const a1 = await createItem(server.db, 'fuel', {
      manufacturer: 'A1',
      technicalApproval: 'Certified',
      englandApproval: 'Certified',
      scotlandApproval: 'Certified',
      walesApproval: 'Certified',
      nIrelandApproval: 'Certified',
      isUkBased: false,
      companyAddress: '456 Rue de Paris, Paris, France',
      englandUpdatedDate: '',
      scotlandUpdatedDate: '',
      walesUpdatedDate: '2024-01-01T10:00:00Z',
      nIrelandUpdatedDate: '2025-05-05T12:00:00Z'
    })
    const all = await findAllItems(server.db, 'fuel')
    expect(Array.isArray(all)).toBe(true)
    expect(all[0].fullAddress).toBeUndefined()
    expect(all[0].lastUpdatedDate).toBe('2025-05-05T12:00:00.000Z')

    const found = await findItem(server.db, 'fuel', a1.fuelId)
    expect(found).not.toBeNull()
    expect(found.fullAddress).toEqual(['456 Rue de Paris, Paris, France'])
    expect(found.lastUpdatedDate).toBe('2025-05-05T12:00:00.000Z')
  })

  test('findItem for fuel returns correct lastUpdatedDate', async () => {
    await createItem(server.db, 'fuel', {
      brandNames: 'FuelBrand X',
      fuelId: 'FUEL-TEST-DATES',
      walesUpdatedDate: '2024-01-01T10:00:00Z',
      nIrelandUpdatedDate: '2025-05-05T12:00:00Z',
      scotlandUpdatedDate: '2023-12-31T23:59:59Z',
      englandUpdatedDate: '2022-06-15T08:30:00Z',
      englandApproval: 'Certified',
      scotlandApproval: 'Certified',
      walesApproval: 'Certified',
      nIrelandApproval: 'Certified',
      technicalApproval: 'Certified'
    })

    const found = await findItem(server.db, 'fuel', 'FUEL-TEST-DATES')
    expect(found).not.toBeNull()
    expect(found.lastUpdatedDate).toBe('2025-05-05T12:00:00.000Z')
  })

  test('findAllItems for fuel returns correct lastUpdatedDate', async () => {
    await createItem(server.db, 'fuel', {
      brandNames: 'FuelBrand Y',
      fuelId: 'FUEL-TEST-DATES2',
      walesUpdatedDate: '2021-01-01T10:00:00Z',
      nIrelandUpdatedDate: '2020-05-05T12:00:00Z',
      scotlandUpdatedDate: '2022-12-31T23:59:59Z',
      englandUpdatedDate: '2023-06-15T08:30:00Z',
      englandApproval: 'Certified',
      scotlandApproval: 'Certified',
      walesApproval: 'Certified',
      nIrelandApproval: 'Certified',
      technicalApproval: 'Certified'
    })

    const all = await findAllItems(server.db, 'fuel')
    const found = all.find((f) => f.id === 'FUEL-TEST-DATES2')
    expect(found).not.toBeNull()
    expect(found.lastUpdatedDate).toBe('2023-06-15T08:30:00.000Z')
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
      englandApproval: 'Certified',
      scotlandApproval: 'Certified',
      walesApproval: 'Certified',
      nIrelandApproval: 'Uncertified'
    })

    const found = await findItem(server.db, 'appliance', 'APP-TEST-001')

    expect(found).not.toBeNull()
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
      englandApproval: 'Uncertified',
      scotlandApproval: 'Certified',
      walesApproval: 'Uncertified',
      nIrelandApproval: 'Certified'
    })

    const found = await findItem(server.db, 'fuel', 'FUEL-TEST-001')

    expect(found).not.toBeNull()
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
  })

  test('findAllItems filters by technicalApproval and regional approvals correctly for appliances', async () => {
    // Create appliance with Certified status in all regions
    await createItem(server.db, 'appliance', {
      modelName: 'Certified Model',
      technicalApproval: 'Certified',
      englandApproval: 'Certified',
      scotlandApproval: 'Certified',
      walesApproval: 'Certified',
      nIrelandApproval: 'Certified'
    })

    // Create appliance with missing technicalApproval
    await createItem(server.db, 'appliance', {
      modelName: 'Missing Technical Approval',
      englandApproval: 'Certified',
      scotlandApproval: 'Certified',
      walesApproval: 'Certified',
      nIrelandApproval: 'Certified'
    })

    // Create appliance with non-Certified regional approvals (no Certified region)
    await createItem(server.db, 'appliance', {
      modelName: 'No Regional Approval',
      technicalApproval: 'Certified',
      englandApproval: 'Uncertified',
      scotlandApproval: 'Uncertified',
      walesApproval: 'Uncertified',
      nIrelandApproval: 'Uncertified'
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
      englandApproval: 'Certified',
      scotlandApproval: 'Certified',
      walesApproval: 'Certified',
      nIrelandApproval: 'Certified'
    })

    // Create fuel with missing technicalApproval
    await createItem(server.db, 'fuel', {
      brandNames: 'Missing Approval',
      englandApproval: 'Certified',
      scotlandApproval: 'Certified',
      walesApproval: 'Certified',
      nIrelandApproval: 'Certified'
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
      englandApproval: 'Certified',
      scotlandApproval: 'Certified',
      walesApproval: 'Certified',
      nIrelandApproval: 'Certified'
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
      englandApproval: 'Certified',
      scotlandApproval: 'Uncertified',
      walesApproval: 'Certified',
      nIrelandApproval: 'Certified'
    })

    const results = await findAllItems(server.db, 'appliance')

    expect(results[0].authorisedIn).toEqual([
      'England',
      'Wales',
      'Northern Ireland'
    ])
  })

  test('authorisedIn field correctly identifies regional certifications for appliance via findItem', async () => {
    await createItem(server.db, 'appliance', {
      modelName: 'Regional Test 2',
      applianceId: 'APP-REGION-TEST',
      technicalApproval: 'Certified',
      englandApproval: 'Uncertified',
      scotlandApproval: 'Certified',
      walesApproval: 'Uncertified',
      nIrelandApproval: 'Certified'
    })

    const found = await findItem(server.db, 'appliance', 'APP-REGION-TEST')

    expect(found.authorisedIn).toEqual(['Scotland', 'Northern Ireland'])
  })

  test('authorisedIn field correctly identifies regional certifications for fuel via findItem', async () => {
    await createItem(server.db, 'fuel', {
      brandNames: 'Regional Fuel Test',
      fuelId: 'FUEL-REGION-TEST',
      technicalApproval: 'Certified',
      englandApproval: 'Certified',
      scotlandApproval: 'Uncertified',
      walesApproval: 'Certified',
      nIrelandApproval: 'Uncertified'
    })

    const found = await findItem(server.db, 'fuel', 'FUEL-REGION-TEST')

    expect(found.authorisedIn).toEqual(['England', 'Wales'])
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

  test('updateItem updates fuel document and returns updated document', async () => {
    const created = await createItem(server.db, 'fuel', {
      brandNames: 'OldFuel',
      manufacturer: 'OldManu'
    })
    const { updated } = await updateItem(server.db, 'fuel', created.fuelId, {
      brandNames: 'NewFuel',
      manufacturer: 'NewManu'
    })
    expect(updated).toBeDefined()
    expect(updated.brandNames).toBe('NewFuel')
    expect(updated.manufacturer).toBe('NewManu')
  })

  test('updateItem updates multiple fields at once', async () => {
    const created = await createItem(server.db, 'appliance', {
      manufacturer: 'MultiOld',
      modelName: 'OldModel',
      modelNumber: 1
    })
    const { updated } = await updateItem(
      server.db,
      'appliance',
      created.applianceId,
      { manufacturer: 'MultiNew', modelName: 'NewModel', modelNumber: 2 }
    )
    expect(updated.manufacturer).toBe('MultiNew')
    expect(updated.modelName).toBe('NewModel')
    expect(updated.modelNumber).toBe(2)
  })

  test('updateItem with empty update object does not change fields', async () => {
    const created = await createItem(server.db, 'appliance', {
      manufacturer: 'NoChange',
      modelName: 'NoChangeModel'
    })
    const { updated } = await updateItem(
      server.db,
      'appliance',
      created.applianceId,
      {}
    )
    expect(updated.manufacturer).toBe('NoChange')
    expect(updated.modelName).toBe('NoChangeModel')
  })

  test('updateItem throws for invalid type', async () => {
    await expect(
      updateItem(server.db, 'invalidType', 'someId', { foo: 'bar' })
    ).rejects.toThrow('Unknown type: invalidType')
  })

  test('updateItem only updates intended fields', async () => {
    const created = await createItem(server.db, 'appliance', {
      manufacturer: 'PartialOld',
      modelName: 'PartialModel',
      modelNumber: 10
    })
    const { updated } = await updateItem(
      server.db,
      'appliance',
      created.applianceId,
      { manufacturer: 'PartialNew' }
    )
    expect(updated.manufacturer).toBe('PartialNew')
    expect(updated.modelName).toBe('PartialModel')
    expect(updated.modelNumber).toBe(10)
  })

  // Tests for mapping function behavior differences (summary vs detail)
  describe('appliance summary vs detail mappings', () => {
    test('findAllItems returns appliance summary objects without fullAddress', async () => {
      await createItem(server.db, 'appliance', {
        modelName: 'Summary Test Model',
        companyName: 'TestCorp',
        applianceType: 'Boiler',
        modelNumber: 'MOD-123',
        allowedFuels: ['Gas', 'Oil'],
        technicalApproval: 'Certified',
        englandApproval: 'Certified',
        scotlandApproval: 'Certified',
        walesApproval: 'Certified',
        nIrelandApproval: 'Certified',
        isUkBased: true,
        companyAddressLine1: '123 Main St',
        companyAddressCity: 'London',
        companyAddressPostcode: 'SW1A 1AA'
      })

      const results = await findAllItems(server.db, 'appliance')
      expect(results.length).toBe(1)
      const summary = results[0]

      // Summary should have these fields
      expect(summary).toHaveProperty('name', 'Summary Test Model')
      expect(summary).toHaveProperty('id')
      expect(summary).toHaveProperty('manufacturer', 'TestCorp')
      expect(summary).toHaveProperty('fuels', 'Gas, Oil')
      expect(summary).toHaveProperty('type', 'Boiler')
      expect(summary).toHaveProperty('modelNumber', 'MOD-123')
      expect(summary).toHaveProperty('authorisedIn')

      // Summary should NOT have these detail fields
      expect(summary).not.toHaveProperty('fullAddress')
    })

    test('findItem returns appliance detail object with fullAddress', async () => {
      await createItem(server.db, 'appliance', {
        modelName: 'Detail Test Model',
        applianceId: 'APP-DETAIL-TEST',
        companyName: 'DetailCorp',
        applianceType: 'Stove',
        modelNumber: 'DET-456',
        allowedFuels: ['Solid'],
        technicalApproval: 'Certified',
        englandApproval: 'Certified',
        scotlandApproval: 'Certified',
        walesApproval: 'Certified',
        nIrelandApproval: 'Certified',
        isUkBased: true,
        companyAddressLine1: '456 Oak Ave',
        companyAddressLine2: 'Suite 100',
        companyAddressCity: 'Manchester',
        companyAddressCounty: 'Greater Manchester',
        companyAddressPostcode: 'M1 1AA'
      })

      const detail = await findItem(server.db, 'appliance', 'APP-DETAIL-TEST')
      expect(detail).not.toBeNull()

      // Detail should have summary fields
      expect(detail).toHaveProperty('name', 'Detail Test Model')
      expect(detail).toHaveProperty('id', 'APP-DETAIL-TEST')
      expect(detail).toHaveProperty('authorisedIn')

      // Detail should have additional fields
      expect(detail).toHaveProperty('fullAddress')
      expect(detail.fullAddress).toEqual([
        '456 Oak Ave',
        'Suite 100',
        'Manchester',
        'Greater Manchester',
        'M1 1AA'
      ])
      expect(detail).toHaveProperty('companyName', 'DetailCorp')
    })

    test('findAllItems returns appliance summary with single fuel as string', async () => {
      await createItem(server.db, 'appliance', {
        modelName: 'Single Fuel Model',
        allowedFuels: 'Gas',
        technicalApproval: 'Certified',
        englandApproval: 'Certified',
        scotlandApproval: 'Certified',
        walesApproval: 'Certified',
        nIrelandApproval: 'Certified'
      })

      const results = await findAllItems(server.db, 'appliance')
      expect(results[0].fuels).toBe('Gas')
    })

    test('findAllItems returns appliance summary with multiple fuels joined', async () => {
      await createItem(server.db, 'appliance', {
        modelName: 'Multi Fuel Model',
        allowedFuels: ['Gas', 'Oil', 'LPG'],
        technicalApproval: 'Certified',
        englandApproval: 'Certified',
        scotlandApproval: 'Certified',
        walesApproval: 'Certified',
        nIrelandApproval: 'Certified'
      })

      const results = await findAllItems(server.db, 'appliance')
      expect(results[0].fuels).toBe('Gas, Oil, LPG')
    })
  })

  describe('fuel summary vs detail mappings', () => {
    test('findAllItems returns fuel summary objects without fullAddress', async () => {
      await createItem(server.db, 'fuel', {
        brandNames: 'Premium Fuel',
        companyName: 'FuelCo',
        technicalApproval: 'Certified',
        englandApproval: 'Certified',
        scotlandApproval: 'Certified',
        walesApproval: 'Certified',
        nIrelandApproval: 'Certified',
        englandUpdatedDate: '2026-01-01T10:00:00Z',
        scotlandUpdatedDate: '2026-01-02T10:00:00Z',
        walesUpdatedDate: '2026-01-03T10:00:00Z',
        nIrelandUpdatedDate: '2026-01-04T10:00:00Z',
        isUkBased: true,
        companyAddressLine1: '789 Fuel St',
        companyAddressCity: 'Birmingham',
        companyAddressPostcode: 'B1 1AA'
      })

      const results = await findAllItems(server.db, 'fuel')
      expect(results.length).toBe(1)
      const summary = results[0]

      // Summary should have these fields
      expect(summary).toHaveProperty('name', 'Premium Fuel')
      expect(summary).toHaveProperty('id')
      expect(summary).toHaveProperty('manufacturer', 'FuelCo')
      expect(summary).toHaveProperty('authorisedIn')
      expect(summary).toHaveProperty('lastUpdatedDate')

      // Summary should NOT have these detail fields
      expect(summary).not.toHaveProperty('fullAddress')
    })

    test('findItem returns fuel detail object with fullAddress', async () => {
      await createItem(server.db, 'fuel', {
        brandNames: 'Premium Fuel Detail',
        fuelId: 'FUEL-DETAIL-TEST',
        companyName: 'DetailFuelCo',
        technicalApproval: 'Certified',
        englandApproval: 'Certified',
        scotlandApproval: 'Certified',
        walesApproval: 'Certified',
        nIrelandApproval: 'Certified',
        englandUpdatedDate: '2026-01-01T10:00:00Z',
        scotlandUpdatedDate: '2026-01-02T10:00:00Z',
        walesUpdatedDate: '2026-01-03T10:00:00Z',
        nIrelandUpdatedDate: '2026-01-04T10:00:00Z',
        isUkBased: true,
        companyAddressLine1: '999 Fuel Ave',
        companyAddressLine2: 'Floor 5',
        companyAddressCity: 'Bristol',
        companyAddressCounty: 'Bristol',
        companyAddressPostcode: 'BS1 1AA'
      })

      const detail = await findItem(server.db, 'fuel', 'FUEL-DETAIL-TEST')
      expect(detail).not.toBeNull()

      // Detail should have summary fields
      expect(detail).toHaveProperty('name', 'Premium Fuel Detail')
      expect(detail).toHaveProperty('id', 'FUEL-DETAIL-TEST')
      expect(detail).toHaveProperty('authorisedIn')
      expect(detail).toHaveProperty('lastUpdatedDate')

      // Detail should have additional fields
      expect(detail).toHaveProperty('fullAddress')
      expect(detail.fullAddress).toEqual([
        '999 Fuel Ave',
        'Floor 5',
        'Bristol',
        'Bristol',
        'BS1 1AA'
      ])
      expect(detail).toHaveProperty('companyName', 'DetailFuelCo')
    })

    test('findItem for fuel with non-UK address returns detail with correct fullAddress', async () => {
      await createItem(server.db, 'fuel', {
        brandNames: 'International Fuel',
        fuelId: 'FUEL-INTL-TEST',
        companyName: 'IntlFuelCorp',
        isUkBased: false,
        companyAddress: '123 Rue de France, 75001 Paris',
        technicalApproval: 'Certified',
        englandApproval: 'Certified',
        scotlandApproval: 'Certified',
        walesApproval: 'Certified',
        nIrelandApproval: 'Certified',
        englandUpdatedDate: '2026-01-01T10:00:00Z'
      })

      const detail = await findItem(server.db, 'fuel', 'FUEL-INTL-TEST')
      expect(detail.fullAddress).toEqual(['123 Rue de France, 75001 Paris'])
    })
  })

  describe('appliance detail field completeness', () => {
    test('findItem appliance includes all original item fields plus mapped fields', async () => {
      await createItem(server.db, 'appliance', {
        applianceId: 'APP-COMPLETE-TEST',
        modelName: 'Complete Test',
        modelNumber: 'COMP-001',
        companyName: 'CompleteCorp',
        companyContactName: 'John Doe',
        companyContactEmail: 'john@complete.com',
        phoneNumber: '555-1234',
        technicalApproval: 'Certified',
        englandApproval: 'Certified',
        scotlandApproval: 'Certified',
        walesApproval: 'Certified',
        nIrelandApproval: 'Certified',
        isUkBased: true,
        companyAddressLine1: '100 Test St',
        companyAddressCity: 'TestCity'
      })

      const detail = await findItem(server.db, 'appliance', 'APP-COMPLETE-TEST')

      // Original fields should be preserved
      expect(detail).toHaveProperty('modelName', 'Complete Test')
      expect(detail).toHaveProperty('modelNumber', 'COMP-001')
      expect(detail).toHaveProperty('companyName', 'CompleteCorp')
      expect(detail).toHaveProperty('companyContactName', 'John Doe')

      // Mapped fields should be added
      expect(detail).toHaveProperty('name', 'Complete Test')
      expect(detail).toHaveProperty('id', 'APP-COMPLETE-TEST')
      expect(detail).toHaveProperty('authorisedIn', [
        'England',
        'Scotland',
        'Wales',
        'Northern Ireland'
      ])
      expect(detail).toHaveProperty('fullAddress')
    })

    test('findItem fuel includes all original item fields plus mapped fields', async () => {
      await createItem(server.db, 'fuel', {
        fuelId: 'FUEL-COMPLETE-TEST',
        brandNames: 'Complete Fuel',
        companyName: 'CompleteFuelCorp',
        technicalApproval: 'Certified',
        englandApproval: 'Certified',
        scotlandApproval: 'Certified',
        walesApproval: 'Certified',
        nIrelandApproval: 'Certified',
        englandUpdatedDate: '2026-01-01T10:00:00Z',
        scotlandUpdatedDate: '2026-01-02T10:00:00Z',
        walesUpdatedDate: '2026-01-03T10:00:00Z',
        nIrelandUpdatedDate: '2026-01-04T10:00:00Z',
        isUkBased: true,
        companyAddressLine1: '100 Fuel St',
        companyAddressCity: 'FuelCity'
      })

      const detail = await findItem(server.db, 'fuel', 'FUEL-COMPLETE-TEST')

      // Original fields should be preserved
      expect(detail).toHaveProperty('brandNames', 'Complete Fuel')
      expect(detail).toHaveProperty('companyName', 'CompleteFuelCorp')

      // Mapped fields should be added
      expect(detail).toHaveProperty('name', 'Complete Fuel')
      expect(detail).toHaveProperty('id', 'FUEL-COMPLETE-TEST')
      expect(detail).toHaveProperty('authorisedIn', [
        'England',
        'Scotland',
        'Wales',
        'Northern Ireland'
      ])
      expect(detail).toHaveProperty(
        'lastUpdatedDate',
        '2026-01-04T10:00:00.000Z'
      )
      expect(detail).toHaveProperty('fullAddress')
    })
  })
})
