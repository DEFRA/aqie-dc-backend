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
      scotlandCertification: { status: 'new' },
      walesCertification: { status: 'new' },
      nIrelandCertification: { status: 'new' },
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
      scotlandCertification: { status: 'new' },
      walesCertification: { status: 'new' },
      nIrelandCertification: { status: 'new' },
      isVisibleToPublic: false
    })

    const result = await calculateItemStatus(db, 'appliance', 'APP-1')

    expect(result).toBe('hidden')
  })

  test('sets status to hidden and resets visibility when revoked/rejected', async () => {
    collection.findOne.mockResolvedValue({
      technicalReview: { status: 'accepted' },
      englandCertification: { status: 'revoked' },
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
      englandCertification: { status: 'new' },
      scotlandCertification: { status: 'awaiting_decision' },
      walesCertification: { status: 'new' },
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

  test('throws on an unexpected certification combination', async () => {
    collection.findOne.mockResolvedValue({
      technicalReview: { status: 'accepted' },
      englandCertification: { status: 'some_unknown_status' },
      scotlandCertification: { status: 'new' },
      walesCertification: { status: 'new' },
      nIrelandCertification: { status: 'new' },
      isVisibleToPublic: true
    })

    await expect(calculateItemStatus(db, 'appliance', 'APP-1')).rejects.toThrow(
      'Unexpected country certification combination'
    )
  })
})
