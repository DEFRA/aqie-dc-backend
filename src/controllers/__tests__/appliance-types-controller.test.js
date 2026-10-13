import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getApplianceTypes } from '../appliance-types-controller.js'

describe('appliance-types-controller', () => {
  let mockDb, mockLogger

  beforeEach(() => {
    mockDb = {
      collection: vi.fn()
    }
    mockLogger = {
      info: vi.fn(),
      error: vi.fn()
    }
  })

  describe('getApplianceTypes', () => {
    it('should return all appliance types when isPrimary is null', async () => {
      const mockApplianceTypes = [
        { value: 'Stove', isPrimary: true },
        { value: 'Boiler', isPrimary: true },
        { value: 'Air heater', isPrimary: false }
      ]

      const mockFind = vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue(mockApplianceTypes)
      })

      mockDb.collection.mockReturnValue({
        find: mockFind
      })

      const result = await getApplianceTypes(
        mockDb,
        { isPrimary: null },
        mockLogger
      )

      expect(mockDb.collection).toHaveBeenCalledWith('ApplianceTypes')
      expect(mockFind).toHaveBeenCalledWith({})
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockApplianceTypes)
      expect(mockLogger.info).toHaveBeenCalled()
    })

    it('should return only primary appliance types when isPrimary is true', async () => {
      const mockPrimaryTypes = [
        { value: 'Stove', isPrimary: true },
        { value: 'Boiler', isPrimary: true },
        { value: 'Inset appliance', isPrimary: true },
        { value: 'Cooker', isPrimary: true },
        { value: 'Pizza oven', isPrimary: true },
        { value: 'Other', isPrimary: true }
      ]

      const mockFind = vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue(mockPrimaryTypes)
      })

      mockDb.collection.mockReturnValue({
        find: mockFind
      })

      const result = await getApplianceTypes(
        mockDb,
        { isPrimary: true },
        mockLogger
      )

      expect(mockDb.collection).toHaveBeenCalledWith('ApplianceTypes')
      expect(mockFind).toHaveBeenCalledWith({ isPrimary: true })
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockPrimaryTypes)
      expect(result.data.length).toBe(6)
    })

    it('should return only secondary appliance types when isPrimary is false', async () => {
      const mockSecondaryTypes = [
        { value: 'Air heater', isPrimary: false },
        {
          value: 'Oven incinerator',
          isPrimary: false
        },
        {
          value: 'Cooker with boiler',
          isPrimary: false
        },
        {
          value: 'Wet room heater',
          isPrimary: false
        },
        { value: 'Gasifier', isPrimary: false }
      ]

      const mockFind = vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue(mockSecondaryTypes)
      })

      mockDb.collection.mockReturnValue({
        find: mockFind
      })

      const result = await getApplianceTypes(
        mockDb,
        { isPrimary: false },
        mockLogger
      )

      expect(mockDb.collection).toHaveBeenCalledWith('ApplianceTypes')
      expect(mockFind).toHaveBeenCalledWith({ isPrimary: false })
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockSecondaryTypes)
      expect(result.data.length).toBe(5)
    })

    it('should return empty array when no appliance types found', async () => {
      const mockFind = vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([])
      })

      mockDb.collection.mockReturnValue({
        find: mockFind
      })

      const result = await getApplianceTypes(
        mockDb,
        { isPrimary: true },
        mockLogger
      )

      expect(result.success).toBe(true)
      expect(result.data).toEqual([])
      expect(mockLogger.info).toHaveBeenCalledWith(
        'No appliance types found (isPrimary: true)'
      )
    })

    it('should throw error when database query fails', async () => {
      const dbError = new Error('Database connection failed')
      const mockFind = vi.fn().mockReturnValue({
        toArray: vi.fn().mockRejectedValue(dbError)
      })

      mockDb.collection.mockReturnValue({
        find: mockFind
      })

      await expect(
        getApplianceTypes(mockDb, { isPrimary: null }, mockLogger)
      ).rejects.toThrow('Database connection failed')
      expect(mockLogger.error).toHaveBeenCalledWith(
        dbError,
        'Failed to fetch appliance types'
      )
    })

    it('should handle null array response gracefully', async () => {
      const mockFind = vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue(null)
      })

      mockDb.collection.mockReturnValue({
        find: mockFind
      })

      const result = await getApplianceTypes(
        mockDb,
        { isPrimary: null },
        mockLogger
      )

      expect(result.success).toBe(true)
      expect(result.data).toEqual([])
      expect(mockLogger.info).toHaveBeenCalled()
    })
  })
})
