import { describe, test, expect } from 'vitest'
import { mapKeys } from '../mapper.js'

describe('mapKeys', () => {
  describe('appliance mapping', () => {
    test('maps simple appliance fields', () => {
      const input = {
        CTGxGs: 'Acme Ltd',
        TbMaXV: true,
        cciwNV: 'Stove Model X',
        oSUxHw: 'SM-100'
      }

      const result = mapKeys(input, 'appliance')

      expect(result).toEqual({
        companyName: 'Acme Ltd',
        isUkBased: true,
        modelName: 'Stove Model X',
        modelNumber: 'SM-100'
      })
    })

    test('merges nested addressObject fields into the top level result', () => {
      const input = {
        mwGItn: {
          uprn: '100071384716',
          addressLine1: 'Line 1',
          addressLine2: 'Line 2',
          town: 'Birmingham',
          postcode: 'B2 4LP'
        }
      }

      const result = mapKeys(input, 'appliance')

      expect(result).toEqual({
        companyAddress: {
          uprn: '100071384716',
          line1: 'Line 1',
          line2: 'Line 2',
          city: 'Birmingham',
          postcode: 'B2 4LP'
        }
      })
    })

    test('sets nested dot-path fields such as companyContact', () => {
      const input = {
        CfdMSm: 'Jane Doe',
        gTshkc: 'jane@example.com',
        eDOPFB: 'alt@example.com',
        JIeTGU: '01234567891'
      }

      const result = mapKeys(input, 'appliance')

      expect(result).toEqual({
        companyContact: {
          name: 'Jane Doe',
          email: 'jane@example.com',
          alternativeEmail: 'alt@example.com',
          phone: '01234567891'
        }
      })
    })

    test('ignores keys that are not present in the key map', () => {
      const input = {
        unknownKey: 'ignored',
        CTGxGs: 'Acme Ltd'
      }

      const result = mapKeys(input, 'appliance')

      expect(result).toEqual({ companyName: 'Acme Ltd' })
    })
  })

  describe('fuel mapping', () => {
    test('maps simple fuel fields', () => {
      const input = {
        XpAWNK: 'Fuel Co',
        IIQWii: false,
        iqYLKO: 'Solid fuel description'
      }

      const result = mapKeys(input, 'fuel')

      expect(result).toEqual({
        companyName: 'Fuel Co',
        isUkBased: false,
        fuelDescription: 'Solid fuel description'
      })
    })

    test('merges nested addressObject fields for fuel mapping', () => {
      const input = {
        mwGItn: {
          uprn: '123',
          addressLine1: 'Line 1',
          town: 'Leeds',
          postcode: 'LS1 1AA'
        }
      }

      const result = mapKeys(input, 'fuel')

      expect(result).toEqual({
        companyAddress: {
          uprn: '123',
          line1: 'Line 1',
          city: 'Leeds',
          postcode: 'LS1 1AA'
        }
      })
    })

    test('maps responsiblePerson nested fields', () => {
      const input = {
        ChfkKZ: 'John Smith',
        OOrscG: 'john@example.com'
      }

      const result = mapKeys(input, 'fuel')

      expect(result).toEqual({
        responsiblePerson: {
          name: 'John Smith',
          email: 'john@example.com'
        }
      })
    })
  })
})
