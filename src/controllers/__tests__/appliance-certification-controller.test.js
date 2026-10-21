import { describe, test, expect, vi, beforeEach } from 'vitest'
import { updateCertificationStatus } from '#src/controllers/appliance-certification-controller.js'
import { calculateItemStatus } from '#src/common/helpers/item-status.js'

vi.mock('#src/common/helpers/item-status.js', () => ({
  calculateItemStatus: vi.fn()
}))

const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
const decidedBy = { name: 'Ada', email: 'ada@example.com' }

function makeDb(appliance) {
  const actions = []
  const appliances = {
    findOne: vi.fn().mockResolvedValue(appliance),
    findOneAndUpdate: vi.fn(async (_filter, update) => ({
      ...appliance,
      ...update.$set
    }))
  }
  const actionsCollection = {
    insertOne: vi.fn(async (doc) => {
      actions.push(doc)
      return { acknowledged: true }
    }),
    find: vi.fn(() => ({
      sort: () => ({ project: () => ({ toArray: async () => actions }) })
    }))
  }

  return {
    db: {
      collection: (name) =>
        name === 'Actions' ? actionsCollection : appliances
    },
    appliances,
    actionsCollection,
    actions
  }
}

describe('appliance-certification-controller updateCertificationStatus', () => {
  beforeEach(() => vi.clearAllMocks())

  test('rejects an unknown country', async () => {
    const { db } = makeDb({ id: 'APP-1' })

    const result = await updateCertificationStatus(
      db,
      'APP-1',
      'france',
      'certified',
      decidedBy,
      logger
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain('Invalid country')
  })

  test('returns not found when the appliance is missing', async () => {
    const { db, appliances } = makeDb(null)
    appliances.findOne.mockResolvedValue(null)

    const result = await updateCertificationStatus(
      db,
      'APP-404',
      'england',
      'certified',
      decidedBy,
      logger
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain('not found')
  })

  test('certifies from awaiting_decision and stamps the milestones', async () => {
    const { db, appliances } = makeDb({
      id: 'APP-1',
      englandCertification: { status: 'awaiting_decision' }
    })

    const result = await updateCertificationStatus(
      db,
      'APP-1',
      'england',
      'certified',
      decidedBy,
      logger
    )

    expect(result.success).toBe(true)
    const { $set } = appliances.findOneAndUpdate.mock.calls[0][1]
    expect($set.englandCertification.status).toBe('certified')
    expect($set.englandCertification.decidedBy).toEqual(decidedBy)
    expect($set.englandCertification.firstCertifiedAt).toBeInstanceOf(Date)
    expect($set.englandCertification.lastCertifiedAt).toBeInstanceOf(Date)
  })

  test('uncertifies from awaiting_decision', async () => {
    const { db, appliances } = makeDb({
      id: 'APP-1',
      englandCertification: { status: 'awaiting_decision' }
    })

    const result = await updateCertificationStatus(
      db,
      'APP-1',
      'england',
      'uncertified',
      decidedBy,
      logger
    )

    expect(result.success).toBe(true)
    const { $set } = appliances.findOneAndUpdate.mock.calls[0][1]
    expect($set.englandCertification.status).toBe('uncertified')
    expect($set.englandCertification.firstCertifiedAt).toBeNull()
  })

  test('preserves firstCertifiedAt on re-certification', async () => {
    const firstCertifiedAt = new Date('2020-01-01')
    const { db, appliances } = makeDb({
      id: 'APP-1',
      englandCertification: { status: 'uncertified', firstCertifiedAt }
    })

    await updateCertificationStatus(
      db,
      'APP-1',
      'england',
      'certified',
      decidedBy,
      logger
    )

    const { $set } = appliances.findOneAndUpdate.mock.calls[0][1]
    expect($set.englandCertification.firstCertifiedAt).toEqual(firstCertifiedAt)
    expect($set.englandCertification.lastCertifiedAt).not.toEqual(
      firstCertifiedAt
    )
  })

  test('keeps the milestones when moving to uncertified', async () => {
    const lastCertifiedAt = new Date('2024-06-01')
    const { db, appliances } = makeDb({
      id: 'APP-1',
      englandCertification: {
        status: 'certified',
        firstCertifiedAt: lastCertifiedAt,
        lastCertifiedAt
      }
    })

    await updateCertificationStatus(
      db,
      'APP-1',
      'england',
      'uncertified',
      decidedBy,
      logger
    )

    const { $set } = appliances.findOneAndUpdate.mock.calls[0][1]
    expect($set.englandCertification.status).toBe('uncertified')
    expect($set.englandCertification.lastCertifiedAt).toEqual(lastCertifiedAt)
  })

  test('treats an unchanged status as a no-op', async () => {
    const { db, appliances, actionsCollection } = makeDb({
      id: 'APP-1',
      englandCertification: { status: 'certified' }
    })

    const result = await updateCertificationStatus(
      db,
      'APP-1',
      'england',
      'certified',
      decidedBy,
      logger
    )

    expect(result.success).toBe(true)
    expect(appliances.findOneAndUpdate).not.toHaveBeenCalled()
    expect(actionsCollection.insertOne).not.toHaveBeenCalled()
  })

  test('rejects going from certified back to awaiting_decision', async () => {
    const { db } = makeDb({
      id: 'APP-1',
      englandCertification: { status: 'certified' }
    })

    const result = await updateCertificationStatus(
      db,
      'APP-1',
      'england',
      'awaiting_decision',
      decidedBy,
      logger
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain('Cannot change status')
  })

  test('records an audit action with who changed what', async () => {
    const { db, actions } = makeDb({
      id: 'APP-1',
      nIrelandCertification: { status: 'certified' }
    })

    await updateCertificationStatus(
      db,
      'APP-1',
      'northern-ireland',
      'uncertified',
      decidedBy,
      logger
    )

    expect(actions).toHaveLength(1)
    expect(actions[0]).toMatchObject({
      itemId: 'APP-1',
      itemType: 'appliance',
      action: 'uncertifiedOnBehalf',
      description: 'Uncertified on behalf of Northern Ireland',
      country: 'northern-ireland',
      fromStatus: 'certified',
      toStatus: 'uncertified',
      completedBy: { ...decidedBy, type: 'user' }
    })
    expect(actions[0].id).toMatch(/^ACT-/)
  })

  test('words a certification as "on behalf of" the country', async () => {
    const { db, actions } = makeDb({
      id: 'APP-1',
      walesCertification: { status: 'awaiting_decision' }
    })

    await updateCertificationStatus(
      db,
      'APP-1',
      'wales',
      'certified',
      decidedBy,
      logger
    )

    expect(actions[0]).toMatchObject({
      action: 'certifiedOnBehalf',
      description: 'Certified on behalf of Wales'
    })
  })

  test('recalculates the appliance status before recording the action', async () => {
    const { db, actionsCollection } = makeDb({
      id: 'APP-1',
      englandCertification: { status: 'certified' }
    })

    await updateCertificationStatus(
      db,
      'APP-1',
      'england',
      'uncertified',
      decidedBy,
      logger
    )

    expect(calculateItemStatus).toHaveBeenCalledWith(db, 'appliance', 'APP-1', {
      logger
    })
    expect(calculateItemStatus.mock.invocationCallOrder[0]).toBeLessThan(
      actionsCollection.insertOne.mock.invocationCallOrder[0]
    )
  })

  test('still succeeds and records the action when the recalculation fails', async () => {
    const { db, actions } = makeDb({
      id: 'APP-1',
      englandCertification: { status: 'certified' }
    })
    calculateItemStatus.mockRejectedValueOnce(
      new Error('Technical review at application stage is not complete')
    )

    const result = await updateCertificationStatus(
      db,
      'APP-1',
      'england',
      'uncertified',
      decidedBy,
      logger
    )

    expect(result.success).toBe(true)
    expect(actions).toHaveLength(1)
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to recalculate applianceStatus')
    )
  })

  test('does not recalculate when nothing changed', async () => {
    const { db } = makeDb({
      id: 'APP-1',
      englandCertification: { status: 'certified' }
    })

    await updateCertificationStatus(
      db,
      'APP-1',
      'england',
      'certified',
      decidedBy,
      logger
    )

    expect(calculateItemStatus).not.toHaveBeenCalled()
  })

  test('still succeeds when the audit write fails', async () => {
    const { db, actionsCollection } = makeDb({
      id: 'APP-1',
      englandCertification: { status: 'certified' }
    })
    actionsCollection.insertOne.mockRejectedValueOnce(new Error('mongo down'))

    const result = await updateCertificationStatus(
      db,
      'APP-1',
      'england',
      'uncertified',
      decidedBy,
      logger
    )

    expect(result.success).toBe(true)
    expect(logger.error).toHaveBeenCalled()
  })

  test.each([
    ['db', [null, 'APP-1', 'england', 'certified', { name: 'A' }, {}]],
    ['applianceId', [{}, '', 'england', 'certified', { name: 'A' }, {}]],
    ['country', [{}, 'APP-1', '', 'certified', { name: 'A' }, {}]],
    ['newStatus', [{}, 'APP-1', 'england', '', { name: 'A' }, {}]],
    ['decidedBy', [{}, 'APP-1', 'england', 'certified', null, {}]],
    ['logger', [{}, 'APP-1', 'england', 'certified', { name: 'A' }, null]]
  ])('throws when %s is missing', async (name, args) => {
    await expect(updateCertificationStatus(...args)).rejects.toThrow(
      `${name} is required`
    )
  })

  test('defaults a missing certification field to awaiting_decision', async () => {
    const { db, appliances } = makeDb({ id: 'APP-1' })

    const result = await updateCertificationStatus(
      db,
      'APP-1',
      'england',
      'certified',
      decidedBy,
      logger
    )

    expect(result.success).toBe(true)
    const { $set } = appliances.findOneAndUpdate.mock.calls[0][1]
    expect($set.englandCertification.status).toBe('certified')
  })

  test('rejects a transition from an unrecognised stored status', async () => {
    const { db } = makeDb({
      id: 'APP-1',
      englandCertification: { status: 'revoked' }
    })

    const result = await updateCertificationStatus(
      db,
      'APP-1',
      'england',
      'certified',
      decidedBy,
      logger
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain('Cannot change status')
  })

  test('returns an error when the update matches nothing', async () => {
    const { db, appliances } = makeDb({
      id: 'APP-1',
      englandCertification: { status: 'certified' }
    })
    appliances.findOneAndUpdate.mockResolvedValueOnce(null)

    const result = await updateCertificationStatus(
      db,
      'APP-1',
      'england',
      'uncertified',
      decidedBy,
      logger
    )

    expect(result.success).toBe(false)
    expect(result.error).toBe('Failed to update appliance')
  })

  test('returns a generic error when the database throws', async () => {
    const { db, appliances } = makeDb({ id: 'APP-1' })
    appliances.findOne.mockRejectedValueOnce(new Error('connection lost'))

    const result = await updateCertificationStatus(
      db,
      'APP-1',
      'england',
      'certified',
      decidedBy,
      logger
    )

    expect(result.success).toBe(false)
    expect(result.error).toBe('Internal server error')
    expect(logger.error).toHaveBeenCalled()
  })
})
