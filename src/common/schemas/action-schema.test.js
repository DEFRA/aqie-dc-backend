import { describe, expect, test } from 'vitest'
import { actionSchema, actionWording } from './action-schema.js'

const validEntry = {
  id: 'ACT-1001',
  itemId: 'APP-12345',
  itemType: 'appliance',
  action: 'certifiedOnBehalf',
  description: 'Certified on behalf of England',
  country: 'england',
  completedBy: {
    name: 'Jane Reviewer',
    email: 'jane.reviewer@example.gov.uk',
    type: 'user'
  },
  completedAt: '2026-08-25T12:00:00.000Z'
}

describe('action-schema actionSchema', () => {
  test('accepts a valid entry', () => {
    const { error } = actionSchema.validate(validEntry)

    expect(error).toBeUndefined()
  })

  test('accepts a system action with no email or country', () => {
    const { error } = actionSchema.validate({
      ...validEntry,
      action: 'liveOnPublicList',
      description: 'Live on public list',
      country: undefined,
      completedBy: { name: 'System', type: 'system' }
    })

    expect(error).toBeUndefined()
  })

  test('accepts a fuel entry', () => {
    const { error } = actionSchema.validate({
      ...validEntry,
      itemId: 'FUEL-1',
      itemType: 'fuel'
    })

    expect(error).toBeUndefined()
  })

  test.each([
    ['an unknown action', { action: 'doesNotExist' }],
    ['an unknown item type', { itemType: 'widget' }],
    ['an unknown country', { country: 'france' }],
    ['a missing description', { description: undefined }],
    ['a missing completedBy', { completedBy: undefined }],
    ['a missing completedAt', { completedAt: undefined }],
    ['an unknown actor type', { completedBy: { name: 'Jane', type: 'robot' } }],
    ['an unexpected key', { unexpected: 'not-allowed' }]
  ])('rejects %s', (_label, override) => {
    const { error } = actionSchema.validate({ ...validEntry, ...override })

    expect(error).toBeDefined()
  })
})

describe('action-schema actionWording', () => {
  test('covers every action in the requirements', () => {
    expect(Object.keys(actionWording).sort()).toEqual(
      [
        'acceptedAtApplication',
        'sentToGovernments',
        'certified',
        'uncertified',
        'certifiedOnBehalf',
        'uncertifiedOnBehalf',
        'certificationSuspended',
        'liveOnPublicList',
        'hiddenFromPublicList',
        'retestPassed',
        'retestFailed'
      ].sort()
    )
  })

  test.each([
    ['acceptedAtApplication', undefined, 'Accepted at application'],
    ['sentToGovernments', undefined, 'Sent to governments for approval'],
    ['certified', 'Wales', 'Certified in Wales'],
    ['uncertified', 'Scotland', 'Uncertified in Scotland'],
    [
      'certifiedOnBehalf',
      'Northern Ireland',
      'Certified on behalf of Northern Ireland'
    ],
    ['uncertifiedOnBehalf', 'England', 'Uncertified on behalf of England'],
    [
      'certificationSuspended',
      'England',
      'Certification suspended for England'
    ],
    ['liveOnPublicList', undefined, 'Live on public list'],
    ['hiddenFromPublicList', undefined, 'Hidden from public list'],
    ['retestPassed', undefined, 'Retest passed'],
    ['retestFailed', undefined, 'Retest failed']
  ])('words %s as expected', (action, place, expected) => {
    expect(actionWording[action](place)).toBe(expected)
  })
})
