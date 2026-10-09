import { describe, expect, test } from 'vitest'

import {
  UNCERTIFIED_CERTIFICATION_STATUSES,
  UNDECIDED_CERTIFICATION_STATUSES
} from '#src/common/helpers/certification-status.js'

describe('certification-status helpers', () => {
  test('marks revoked and rejected as uncertified', () => {
    expect(UNCERTIFIED_CERTIFICATION_STATUSES.has('revoked')).toBe(true)
    expect(UNCERTIFIED_CERTIFICATION_STATUSES.has('rejected')).toBe(true)
    expect(UNCERTIFIED_CERTIFICATION_STATUSES.has('certified')).toBe(false)
  })

  test('marks new and awaiting_decision as undecided', () => {
    expect(UNDECIDED_CERTIFICATION_STATUSES.has('new')).toBe(true)
    expect(UNDECIDED_CERTIFICATION_STATUSES.has('awaiting_decision')).toBe(true)
    expect(UNDECIDED_CERTIFICATION_STATUSES.has('certified')).toBe(false)
  })
})
