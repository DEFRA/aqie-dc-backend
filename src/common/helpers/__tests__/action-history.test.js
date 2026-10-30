import { beforeEach, describe, expect, test, vi } from 'vitest'

import {
  SYSTEM_ACTOR,
  recordAction,
  toGovernmentActor,
  toUserActor
} from '#src/common/helpers/action-history.js'

describe('toGovernmentActor', () => {
  test.each([
    ['england', 'Defra'],
    ['scotland', 'Scottish Government'],
    ['wales', 'Welsh Government'],
    ['northern-ireland', 'DAERA']
  ])('names the government for %s', (country, name) => {
    expect(toGovernmentActor(country)).toEqual({ name, type: 'government' })
  })

  test('rejects an unknown country', () => {
    expect(() => toGovernmentActor('atlantis')).toThrow(
      'Unknown country: atlantis'
    )
  })
})

describe('toUserActor', () => {
  test('describes a signed-in user', () => {
    expect(
      toUserActor({ name: 'Calvin May', email: 'c@defra.gov.uk' })
    ).toEqual({ name: 'Calvin May', email: 'c@defra.gov.uk', type: 'user' })
  })

  test('omits the email when there is none', () => {
    expect(toUserActor({ name: 'Calvin May' })).toEqual({
      name: 'Calvin May',
      type: 'user'
    })
  })

  test.each([[undefined], [null], [{}], [{ email: 'a@b.com' }]])(
    'attributes the action to the system when there is no user name (%j)',
    (user) => {
      expect(toUserActor(user)).toBe(SYSTEM_ACTOR)
    }
  )
})

describe('recordAction', () => {
  let db
  let insertOne
  let logger

  beforeEach(() => {
    insertOne = vi.fn().mockResolvedValue({ acknowledged: true })
    db = { collection: vi.fn().mockReturnValue({ insertOne }) }
    logger = { error: vi.fn() }
  })

  test('inserts a worded entry into the Actions collection', async () => {
    const at = new Date('2026-01-24T10:00:00Z')

    await recordAction(
      db,
      {
        itemId: 'APP-1',
        itemType: 'appliance',
        action: 'uncertifiedOnBehalf',
        country: 'northern-ireland',
        actor: toUserActor({ name: 'Calvin May' }),
        at,
        details: { fromStatus: 'certified', toStatus: 'uncertified' }
      },
      logger
    )

    expect(db.collection).toHaveBeenCalledWith('Actions')
    expect(insertOne).toHaveBeenCalledWith({
      id: expect.stringMatching(/^ACT-/),
      itemId: 'APP-1',
      itemType: 'appliance',
      action: 'uncertifiedOnBehalf',
      description: 'Uncertified on behalf of Northern Ireland',
      country: 'northern-ireland',
      fromStatus: 'certified',
      toStatus: 'uncertified',
      completedBy: { name: 'Calvin May', type: 'user' },
      completedAt: at
    })
    expect(logger.error).not.toHaveBeenCalled()
  })

  test('records a government decision with the government as actor', async () => {
    await recordAction(
      db,
      {
        itemId: 'APP-1',
        itemType: 'appliance',
        action: 'certified',
        country: 'wales',
        actor: toGovernmentActor('wales')
      },
      logger
    )

    expect(insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Certified in Wales',
        completedBy: { name: 'Welsh Government', type: 'government' }
      })
    )
  })

  test.each([
    'certified',
    'uncertified',
    'certifiedOnBehalf',
    'uncertifiedOnBehalf',
    'certificationSuspended'
  ])('does not record %s without a country', async (action) => {
    await recordAction(
      db,
      { itemId: 'APP-1', itemType: 'appliance', action, actor: SYSTEM_ACTOR },
      logger
    )

    expect(insertOne).not.toHaveBeenCalled()
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('"country" is required')
    )
  })

  test('does not record an unknown country', async () => {
    await recordAction(
      db,
      {
        itemId: 'APP-1',
        itemType: 'appliance',
        action: 'certified',
        country: 'atlantis',
        actor: SYSTEM_ACTOR
      },
      logger
    )

    expect(insertOne).not.toHaveBeenCalled()
  })

  test('words and stores a system action without a country', async () => {
    await recordAction(
      db,
      {
        itemId: 'FUEL-1',
        itemType: 'fuel',
        action: 'liveOnPublicList',
        actor: SYSTEM_ACTOR
      },
      logger
    )

    const [entry] = insertOne.mock.calls[0]
    expect(entry).toMatchObject({
      itemType: 'fuel',
      description: 'Live on public list',
      completedBy: { name: 'System', type: 'system' }
    })
    expect(entry).not.toHaveProperty('country')
    expect(entry.completedAt).toBeInstanceOf(Date)
  })

  test('does not insert an invalid entry, and logs instead of throwing', async () => {
    await expect(
      recordAction(
        db,
        {
          itemId: 'APP-1',
          itemType: 'appliance',
          action: 'notAnAction',
          actor: SYSTEM_ACTOR
        },
        logger
      )
    ).resolves.toBeUndefined()

    expect(insertOne).not.toHaveBeenCalled()
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to record action notAnAction for APP-1')
    )
  })

  test('swallows a database failure so the change it describes still succeeds', async () => {
    insertOne.mockRejectedValueOnce(new Error('mongo down'))

    await expect(
      recordAction(
        db,
        {
          itemId: 'APP-1',
          itemType: 'appliance',
          action: 'acceptedAtApplication',
          actor: SYSTEM_ACTOR
        },
        logger
      )
    ).resolves.toBeUndefined()

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('mongo down')
    )
  })

  test('tolerates a missing logger', async () => {
    insertOne.mockRejectedValueOnce(new Error('mongo down'))

    await expect(
      recordAction(db, {
        itemId: 'APP-1',
        itemType: 'appliance',
        action: 'acceptedAtApplication',
        actor: SYSTEM_ACTOR
      })
    ).resolves.toBeUndefined()
  })
})
