import { afterEach, describe, expect, test, vi } from 'vitest'
import { ENTITY_CONFIG, ENTITY_TYPES } from './entity-config.js'

const { transform, buildActions } = ENTITY_CONFIG[ENTITY_TYPES.APPLIANCES]

const baseRow = () => ({
  'Appliance ID': 9001,
  'Appliance Name (Title)': 'Stove X',
  'Fuel Types': 'Mineral'
})

describe('legacy appliances with no review dates and no certification', () => {
  afterEach(() => vi.restoreAllMocks())

  test.each([
    ['a reviewer is assigned', { 'Reviewer Assign Date': '2020-01-05' }],
    ['no reviewer is assigned', {}]
  ])('%s: accepted by System, hidden and flagged', (_label, extra) => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const row = { ...baseRow(), ...extra }

    const appliance = transform(row)
    const actions = buildActions(row, { ...appliance, id: '2026-0001' })

    expect(appliance.modelName).toBe('Stove X')
    expect(appliance.legacy.comments).toEqual([
      expect.stringContaining('hidden from the public to be checked by HETAS')
    ])
    expect(appliance.isVisibleToPublic).toBe(false)
    expect(appliance.technicalReview.status).toBe('accepted')
    expect(appliance.technicalReview.reviewedBy).toEqual({ name: 'System' })
    expect(actions).toHaveLength(1)
    expect(actions[0]).toMatchObject({
      action: 'acceptedAtApplication',
      completedBy: { name: 'System', type: 'system' }
    })
    expect(
      log.mock.calls.some(([message]) =>
        String(message).includes(
          'Technical review needed for legacy appliance 9001'
        )
      )
    ).toBe(true)
  })

  test('an appliance with a reviewer approve date is left alone', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const appliance = transform({
      ...baseRow(),
      'Reviewer Approve Date': '2020-01-05'
    })

    expect(appliance.modelName).toBe('Stove X')
    expect(appliance.technicalReview.status).toBe('accepted')
  })
})

describe('country certification for Draft or empty statuses', () => {
  afterEach(() => vi.restoreAllMocks())

  test('awaiting_decision when the technical review is accepted', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const row = {
      ...baseRow(),
      'Reviewer Approve Date': '2020-01-05',
      'England Status': 'Draft (10)',
      'Wales Status': 'Rejected by DA (80)'
    }

    const appliance = transform(row)

    expect(appliance.englandCertification.status).toBe('awaiting_decision')
    expect(appliance.scotlandCertification.status).toBe('awaiting_decision')
    expect(appliance.walesCertification.status).toBe('uncertified')
  })

  test('stays new when the technical review is rejected', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const row = {
      ...baseRow(),
      'Reviewer Reject Date': '2020-01-05',
      'England Status': 'Draft (10)'
    }

    const appliance = transform(row)

    expect(appliance.technicalReview.status).toBe('rejected')
    expect(appliance.englandCertification.status).toBe('new')
    expect(appliance.scotlandCertification.status).toBe('new')
  })
})
