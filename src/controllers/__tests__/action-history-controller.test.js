import { beforeEach, describe, expect, test, vi } from 'vitest'

import { getActionHistory } from '#src/controllers/action-history-controller.js'

describe('action-history-controller getActionHistory', () => {
  let db
  let itemsCollection
  let actionsCollection
  let cursor
  let logger

  beforeEach(() => {
    cursor = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      toArray: vi.fn()
    }
    itemsCollection = { findOne: vi.fn() }
    actionsCollection = {
      find: vi.fn().mockReturnValue(cursor),
      countDocuments: vi.fn().mockResolvedValue(0)
    }
    db = {
      collection: vi.fn((name) =>
        name === 'Actions' ? actionsCollection : itemsCollection
      )
    }
    logger = { info: vi.fn(), error: vi.fn() }
  })

  test('returns the item name and its actions, newest first', async () => {
    itemsCollection.findOne.mockResolvedValue({ modelName: 'Ecoburn 5F plus' })
    cursor.toArray.mockResolvedValue([
      {
        _id: 'x2',
        id: 'ACT-2',
        description: 'Hidden from public list',
        completedBy: { name: 'System', type: 'system' },
        completedAt: new Date('2026-01-24T10:00:00Z')
      },
      {
        _id: 'x1',
        id: 'ACT-1',
        description: 'Uncertified on behalf of Wales',
        completedBy: {
          name: 'Calvin May',
          email: 'calvin@defra.gov.uk',
          type: 'user'
        },
        completedAt: new Date('2026-01-24T09:00:00Z')
      }
    ])

    const result = await getActionHistory(db, 'appliance', 'APP-1', logger)

    expect(db.collection).toHaveBeenCalledWith('Appliances')
    expect(itemsCollection.findOne).toHaveBeenCalledWith(
      { id: 'APP-1' },
      { projection: { modelName: 1, _id: 0 } }
    )
    expect(actionsCollection.find).toHaveBeenCalledWith({
      itemId: 'APP-1',
      itemType: 'appliance'
    })
    expect(cursor.sort).toHaveBeenCalledWith({ completedAt: -1, _id: -1 })
    expect(cursor.skip).toHaveBeenCalledWith(0)
    expect(cursor.limit).toHaveBeenCalledWith(10)
    expect(result).toEqual({
      success: true,
      data: {
        id: 'APP-1',
        name: 'Ecoburn 5F plus',
        actions: [
          {
            id: 'ACT-2',
            description: 'Hidden from public list',
            completedBy: 'System',
            completedAt: new Date('2026-01-24T10:00:00Z')
          },
          {
            id: 'ACT-1',
            description: 'Uncertified on behalf of Wales',
            completedBy: 'Calvin May',
            completedAt: new Date('2026-01-24T09:00:00Z')
          }
        ]
      },
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
    })
  })

  test('returns the requested page of 10 with the paging details', async () => {
    itemsCollection.findOne.mockResolvedValue({ modelName: 'Stove' })
    actionsCollection.countDocuments.mockResolvedValue(25)
    cursor.toArray.mockResolvedValue([])

    const result = await getActionHistory(db, 'appliance', 'APP-1', logger, {
      page: 3
    })

    expect(actionsCollection.countDocuments).toHaveBeenCalledWith({
      itemId: 'APP-1',
      itemType: 'appliance'
    })
    expect(cursor.skip).toHaveBeenCalledWith(20)
    expect(cursor.limit).toHaveBeenCalledWith(10)
    expect(result.pagination).toEqual({
      page: 3,
      limit: 10,
      total: 25,
      totalPages: 3
    })
  })

  test('does not expose who completed an action beyond their name', async () => {
    itemsCollection.findOne.mockResolvedValue({ modelName: 'Stove' })
    cursor.toArray.mockResolvedValue([
      {
        id: 'ACT-1',
        description: 'Accepted at application',
        completedBy: { name: 'Calvin May', email: 'c@defra.gov.uk' },
        completedAt: new Date()
      }
    ])

    const { data } = await getActionHistory(db, 'appliance', 'APP-1', logger)

    expect(JSON.stringify(data)).not.toContain('c@defra.gov.uk')
  })

  test('returns an empty list when nothing has been recorded', async () => {
    itemsCollection.findOne.mockResolvedValue({ modelName: 'Stove' })
    cursor.toArray.mockResolvedValue([])

    const result = await getActionHistory(db, 'appliance', 'APP-1', logger)

    expect(result.data.actions).toEqual([])
  })

  test('uses the fuel collection and name field for a fuel', async () => {
    itemsCollection.findOne.mockResolvedValue({ brandName: 'Smokeless Coal' })
    cursor.toArray.mockResolvedValue([])

    const result = await getActionHistory(db, 'fuel', 'FUEL-1', logger)

    expect(db.collection).toHaveBeenCalledWith('Fuels')
    expect(result.data.name).toBe('Smokeless Coal')
  })

  test.each([
    ['appliance', 'Appliance not found'],
    ['fuel', 'Fuel not found']
  ])('returns notFound for a missing %s', async (type, message) => {
    itemsCollection.findOne.mockResolvedValue(null)

    const result = await getActionHistory(db, type, 'X-1', logger)

    expect(result).toEqual({ success: false, message, notFound: true })
    expect(actionsCollection.find).not.toHaveBeenCalled()
  })

  test('throws for an unsupported item type', async () => {
    await expect(getActionHistory(db, 'widget', 'W-1', logger)).rejects.toThrow(
      'Unsupported item type: widget'
    )
  })

  test('throws when the logger is missing', async () => {
    await expect(getActionHistory(db, 'appliance', 'APP-1')).rejects.toThrow(
      'logger is required'
    )
  })

  test('logs and rethrows on a database failure', async () => {
    const error = new Error('Database error')
    itemsCollection.findOne.mockRejectedValue(error)

    await expect(
      getActionHistory(db, 'appliance', 'APP-1', logger)
    ).rejects.toThrow('Database error')

    expect(logger.error).toHaveBeenCalledWith(
      error,
      'Failed to fetch action history'
    )
  })
})
