import { describe, test, expect, vi } from 'vitest'
import { getCompleteApplicationRecordsFilter } from './complete-application-records-filter.js'

describe('getCompleteApplicationRecordsFilter', () => {
  test('returns a filter with completed application IDs', async () => {
    const db = {
      collection: vi.fn(() => ({
        find: vi.fn(() => ({
          project: vi.fn(() => ({
            toArray: vi.fn(async () => [
              { applicationId: 'app_1' },
              { applicationId: 'app_2' }
            ])
          }))
        }))
      }))
    }

    const filter = await getCompleteApplicationRecordsFilter(db)

    expect(filter).toEqual({ applicationId: { $in: ['app_1', 'app_2'] } })
    expect(db.collection).toHaveBeenCalledWith('Applications')
  })

  test('filters out falsy application IDs', async () => {
    const db = {
      collection: vi.fn(() => ({
        find: vi.fn(() => ({
          project: vi.fn(() => ({
            toArray: vi.fn(async () => [
              { applicationId: 'app_1' },
              { applicationId: null },
              { applicationId: '' },
              { applicationId: 'app_2' }
            ])
          }))
        }))
      }))
    }

    const filter = await getCompleteApplicationRecordsFilter(db)

    expect(filter).toEqual({ applicationId: { $in: ['app_1', 'app_2'] } })
  })
})
