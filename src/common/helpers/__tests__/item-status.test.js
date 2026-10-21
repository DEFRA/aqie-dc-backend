import { describe, expect, test, vi, beforeEach } from 'vitest'

import { calculateItemStatus } from '#src/common/helpers/item-status.js'

describe('calculateItemStatus', () => {
  let db
  let collection

  beforeEach(() => {
    collection = {
      findOne: vi.fn(),
      updateOne: vi.fn()
    }
    db = {
      collection: vi.fn().mockReturnValue(collection)
    }
  })

  test('throws when db is missing', async () => {
    await expect(
      calculateItemStatus(null, 'appliance', 'APP-1')
    ).rejects.toThrow('Database instance is required')
  })

  test('throws when type is unsupported', async () => {
    await expect(calculateItemStatus(db, 'widget', 'ID-1')).rejects.toThrow(
      'Unsupported item type: widget'
    )
  })

  test('throws when itemId is missing', async () => {
    await expect(calculateItemStatus(db, 'appliance', '')).rejects.toThrow(
      'Item ID is required'
    )
  })

  test('throws when item is not found', async () => {
    collection.findOne.mockResolvedValue(null)

    await expect(calculateItemStatus(db, 'appliance', 'APP-1')).rejects.toThrow(
      'Item not found: APP-1'
    )
  })

  test('throws when technical review has not reached a final decision', async () => {
    collection.findOne.mockResolvedValue({
      technicalReview: { status: 'new' }
    })

    await expect(calculateItemStatus(db, 'appliance', 'APP-1')).rejects.toThrow(
      'Technical review at application stage is not complete'
    )
  })

  test('sets applianceStatus to rejected when technical review rejected', async () => {
    collection.findOne.mockResolvedValue({
      technicalReview: { status: 'rejected' }
    })

    const result = await calculateItemStatus(db, 'appliance', 'APP-1')

    expect(result).toBe('rejected')
    expect(collection.updateOne).toHaveBeenCalledWith(
      { id: 'APP-1' },
      { $set: { applianceStatus: 'rejected' } }
    )
  })

  test('sets fuelStatus to live when certified and visible', async () => {
    collection.findOne.mockResolvedValue({
      technicalReview: { status: 'accepted' },
      englandCertification: { status: 'certified' },
      scotlandCertification: { status: 'awaiting_decision' },
      walesCertification: { status: 'awaiting_decision' },
      nIrelandCertification: { status: 'awaiting_decision' },
      isVisibleToPublic: true
    })

    const result = await calculateItemStatus(db, 'fuel', 'FUEL-1')

    expect(result).toBe('live')
    expect(db.collection).toHaveBeenCalledWith('Fuels')
    expect(collection.updateOne).toHaveBeenCalledWith(
      { id: 'FUEL-1' },
      { $set: { fuelStatus: 'live' } }
    )
  })

  test('sets status to hidden when certified but not visible', async () => {
    collection.findOne.mockResolvedValue({
      technicalReview: { status: 'accepted' },
      englandCertification: { status: 'certified' },
      scotlandCertification: { status: 'awaiting_decision' },
      walesCertification: { status: 'awaiting_decision' },
      nIrelandCertification: { status: 'awaiting_decision' },
      isVisibleToPublic: false
    })

    const result = await calculateItemStatus(db, 'appliance', 'APP-1')

    expect(result).toBe('hidden')
  })

  test('sets status to hidden and resets visibility when uncertified', async () => {
    collection.findOne.mockResolvedValue({
      technicalReview: { status: 'accepted' },
      englandCertification: { status: 'uncertified' },
      scotlandCertification: { status: 'new' },
      walesCertification: { status: 'new' },
      nIrelandCertification: { status: 'new' },
      isVisibleToPublic: false
    })

    const result = await calculateItemStatus(db, 'appliance', 'APP-1')

    expect(result).toBe('hidden')
    expect(collection.updateOne).toHaveBeenCalledWith(
      { id: 'APP-1' },
      { $set: { applianceStatus: 'hidden', isVisibleToPublic: true } }
    )
  })

  test('sets status to pending when all countries undecided', async () => {
    collection.findOne.mockResolvedValue({
      technicalReview: { status: 'accepted' },
      englandCertification: { status: 'awaiting_decision' },
      scotlandCertification: { status: 'awaiting_decision' },
      walesCertification: { status: 'awaiting_decision' },
      nIrelandCertification: { status: 'awaiting_decision' },
      isVisibleToPublic: true
    })

    const result = await calculateItemStatus(db, 'appliance', 'APP-1')

    expect(result).toBe('pending')
    expect(collection.updateOne).toHaveBeenCalledWith(
      { id: 'APP-1' },
      { $set: { applianceStatus: 'pending', isVisibleToPublic: true } }
    )
  })

  test('sets status to pending when every country is still new', async () => {
    collection.findOne.mockResolvedValue({
      technicalReview: { status: 'accepted' },
      englandCertification: { status: 'new' },
      scotlandCertification: { status: 'new' },
      walesCertification: { status: 'new' },
      nIrelandCertification: { status: 'new' }
    })

    const result = await calculateItemStatus(db, 'appliance', 'APP-1')

    expect(result).toBe('pending')
  })

  test('sets status to hidden when every country is uncertified', async () => {
    collection.findOne.mockResolvedValue({
      technicalReview: { status: 'accepted' },
      englandCertification: { status: 'uncertified' },
      scotlandCertification: { status: 'uncertified' },
      walesCertification: { status: 'uncertified' },
      nIrelandCertification: { status: 'uncertified' }
    })

    const result = await calculateItemStatus(db, 'appliance', 'APP-1')

    expect(result).toBe('hidden')
  })

  test('treats countries with no certification as awaiting a decision', async () => {
    collection.findOne.mockResolvedValue({
      technicalReview: { status: 'accepted' }
    })

    const result = await calculateItemStatus(db, 'appliance', 'APP-1')

    expect(result).toBe('pending')
  })

  test('throws on an unexpected certification combination', async () => {
    collection.findOne.mockResolvedValue({
      technicalReview: { status: 'accepted' },
      englandCertification: { status: 'some_unknown_status' },
      scotlandCertification: { status: 'awaiting_decision' },
      walesCertification: { status: 'awaiting_decision' },
      nIrelandCertification: { status: 'awaiting_decision' },
      isVisibleToPublic: true
    })

    await expect(calculateItemStatus(db, 'appliance', 'APP-1')).rejects.toThrow(
      'Unexpected country certification combination'
    )
  })
})

describe('calculateItemStatus history', () => {
  let db
  let items
  let actions
  const logger = { error: vi.fn() }

  const certifiedEngland = {
    technicalReview: { status: 'accepted' },
    englandCertification: { status: 'certified' },
    scotlandCertification: { status: 'awaiting_decision' },
    walesCertification: { status: 'awaiting_decision' },
    nIrelandCertification: { status: 'awaiting_decision' }
  }
  const uncertifiedEngland = {
    ...certifiedEngland,
    englandCertification: { status: 'uncertified' }
  }

  const recorded = () => actions.insertOne.mock.calls.map(([entry]) => entry)

  beforeEach(() => {
    vi.clearAllMocks()
    items = { findOne: vi.fn(), updateOne: vi.fn() }
    actions = { insertOne: vi.fn().mockResolvedValue({ acknowledged: true }) }
    db = {
      collection: vi.fn((name) => (name === 'Actions' ? actions : items))
    }
  })

  test.each([
    ['pending', 'appliance', 'applianceStatus'],
    [undefined, 'appliance', 'applianceStatus'],
    ['hidden', 'appliance', 'applianceStatus'],
    ['pending', 'fuel', 'fuelStatus']
  ])(
    'records "live on public list" by the system when %s becomes live (%s)',
    async (previous, type, field) => {
      items.findOne.mockResolvedValue({
        ...certifiedEngland,
        [field]: previous
      })

      await calculateItemStatus(db, type, 'ITEM-1', { logger })

      expect(recorded()).toEqual([
        expect.objectContaining({
          itemId: 'ITEM-1',
          itemType: type,
          action: 'liveOnPublicList',
          description: 'Live on public list',
          completedBy: { name: 'System', type: 'system' }
        })
      ])
    }
  )

  test('records "hidden from public list" when a live item becomes hidden', async () => {
    items.findOne.mockResolvedValue({
      ...uncertifiedEngland,
      applianceStatus: 'live'
    })

    await calculateItemStatus(db, 'appliance', 'APP-1', { logger })

    expect(recorded()).toEqual([
      expect.objectContaining({
        itemId: 'APP-1',
        action: 'hiddenFromPublicList',
        description: 'Hidden from public list'
      })
    ])
  })

  test('records nothing when the status does not change', async () => {
    items.findOne.mockResolvedValue({
      ...certifiedEngland,
      applianceStatus: 'live'
    })

    await calculateItemStatus(db, 'appliance', 'APP-1', { logger })

    expect(actions.insertOne).not.toHaveBeenCalled()
  })

  test.each(['pending', undefined])(
    'does not record "hidden" for an item that was never live (%s)',
    async (previous) => {
      items.findOne.mockResolvedValue({
        ...uncertifiedEngland,
        applianceStatus: previous
      })

      await calculateItemStatus(db, 'appliance', 'APP-1', { logger })

      expect(actions.insertOne).not.toHaveBeenCalled()
    }
  )

  test('records nothing when the item is rejected', async () => {
    items.findOne.mockResolvedValue({
      technicalReview: { status: 'rejected' },
      applianceStatus: 'live'
    })

    await calculateItemStatus(db, 'appliance', 'APP-1', { logger })

    expect(actions.insertOne).not.toHaveBeenCalled()
  })

  test('saves the status before recording it', async () => {
    items.findOne.mockResolvedValue(certifiedEngland)

    await calculateItemStatus(db, 'appliance', 'APP-1', { logger })

    expect(items.updateOne.mock.invocationCallOrder[0]).toBeLessThan(
      actions.insertOne.mock.invocationCallOrder[0]
    )
  })

  test('still returns the status when the history cannot be written', async () => {
    items.findOne.mockResolvedValue(certifiedEngland)
    actions.insertOne.mockRejectedValue(new Error('mongo down'))

    const result = await calculateItemStatus(db, 'appliance', 'APP-1', {
      logger
    })

    expect(result).toBe('live')
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to record action liveOnPublicList')
    )
  })

  test('works without options', async () => {
    items.findOne.mockResolvedValue(certifiedEngland)

    await expect(calculateItemStatus(db, 'appliance', 'APP-1')).resolves.toBe(
      'live'
    )
  })
})
