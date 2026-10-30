import { describe, test, expect, vi } from 'vitest'
import { applicationExistsByReference } from '#src/controllers/applications-controller.js'

const dbWith = (found) => {
  const findOne = vi.fn(async () => found)
  const collection = vi.fn(() => ({ findOne }))
  return { db: { collection }, collection, findOne }
}

describe('applicationExistsByReference', () => {
  test('returns false without querying when no reference is given', async () => {
    const { db, collection } = dbWith(null)

    expect(await applicationExistsByReference(db, undefined)).toBe(false)
    expect(collection).not.toHaveBeenCalled()
  })

  test('returns true when an application with the reference exists', async () => {
    const { db, collection, findOne } = dbWith({ _id: 'a1' })

    expect(await applicationExistsByReference(db, 'REF-1')).toBe(true)
    expect(collection).toHaveBeenCalledWith('Applications')
    expect(findOne).toHaveBeenCalledWith(
      { referenceNumber: 'REF-1' },
      { projection: { _id: 1 } }
    )
  })

  test('returns false when no application matches', async () => {
    const { db } = dbWith(null)

    expect(await applicationExistsByReference(db, 'REF-2')).toBe(false)
  })
})
