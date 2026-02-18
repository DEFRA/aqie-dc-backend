import { beforeAll, afterAll, beforeEach, describe, test, expect } from 'vitest'
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
    // const before = await server.db
    //   .collection('Appliance')
    //   .findOne({ applianceId: created.applianceId })
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
      .collection('Fuels')
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
})
