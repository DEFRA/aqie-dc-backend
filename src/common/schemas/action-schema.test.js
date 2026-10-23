import { describe, expect, test } from 'vitest'
import { actionSchema, actionDescriptions } from './action-schema.js'

describe('action-schema actionSchema', () => {
  test('accepts a valid action payload', () => {
    const payload = {
      id: 'ACT-1001',
      itemId: 'APP-12345',
      type: 'certification',
      action: 'englandCertified',
      completedBy: {
        name: 'Jane Reviewer',
        email: 'jane.reviewer@example.gov.uk'
      },
      completedAt: '2026-08-25T12:00:00.000Z'
    }

    const { error, value } = actionSchema.validate(payload)

    expect(error).toBeUndefined()
    expect(value.action).toBe('englandCertified')
  })

  test('rejects action values that are not in actionDescriptions', () => {
    const payload = {
      id: 'ACT-1002',
      itemId: 'APP-12345',
      type: 'certification',
      action: 'doesNotExist'
    }

    const { error } = actionSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].message).toContain('must be one of')
  })

  test('rejects unknown keys', () => {
    const payload = {
      id: 'ACT-1003',
      itemId: 'APP-12345',
      type: 'certification',
      action: 'englandCertified',
      unexpected: 'not-allowed'
    }

    const { error } = actionSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].type).toBe('object.unknown')
  })

  test('allows completedBy to be null', () => {
    const payload = {
      id: 'ACT-1004',
      itemId: 'APP-12345',
      type: 'certification',
      action: 'technicalReviewStarted',
      completedBy: null
    }

    const { error } = actionSchema.validate(payload)

    expect(error).toBeUndefined()
  })
})

describe('action-schema actionDescriptions', () => {
  test('contains the expected certification action keys', () => {
    expect(Object.keys(actionDescriptions)).toContain('englandCertified')
    expect(Object.keys(actionDescriptions)).toContain('scotlandCertified')
    expect(Object.keys(actionDescriptions)).toContain('walesCertified')
    expect(Object.keys(actionDescriptions)).toContain('nIrelandCertified')
  })

  test('describes certification decisions as "<status> in <country>"', () => {
    expect(actionDescriptions.englandCertified).toBe('Certified in England')
    expect(actionDescriptions.scotlandUncertified).toBe(
      'Uncertified in Scotland'
    )
    expect(actionDescriptions.walesAwaitingDecision).toBe(
      'Awaiting decision in Wales'
    )
    expect(actionDescriptions.nIrelandCertified).toBe(
      'Certified in Northern Ireland'
    )
    expect(actionDescriptions.nIrelandUncertified).toBe(
      'Uncertified in Northern Ireland'
    )
  })

  test('covers every country and status combination', () => {
    const countries = ['england', 'scotland', 'wales', 'nIreland']
    const statuses = ['Certified', 'Uncertified', 'AwaitingDecision']

    for (const country of countries) {
      for (const status of statuses) {
        expect(actionDescriptions[`${country}${status}`]).toBeDefined()
      }
    }
  })
})
