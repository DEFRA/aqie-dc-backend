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
        fuelDescription: { appearance: 'Solid fuel description' }
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

    test('merges the fuel-specific koQFjV address block', () => {
      const result = mapKeys(
        { koQFjV: { addressLine1: 'Fuel Lane', town: 'York' } },
        'fuel'
      )

      expect(result).toEqual({
        companyAddress: { line1: 'Fuel Lane', city: 'York' }
      })
    })

    test('maps both fuel phone keys to companyContact.phone', () => {
      expect(mapKeys({ OIMWWP: '0111' }, 'fuel')).toEqual({
        companyContact: { phone: '0111' }
      })
      expect(mapKeys({ yDTjQn: '0222' }, 'fuel')).toEqual({
        companyContact: { phone: '0222' }
      })
    })

    test('maps supplier, complaints and bagging fields', () => {
      const result = mapKeys(
        { AmmLSb: 'Rebrand', BUaprr: true, gefTHa: false },
        'fuel'
      )

      expect(result).toEqual({
        supplierType: 'Rebrand',
        hasCustomerComplaintsSystem: true,
        fuelBagging: false
      })
    })

    test('maps rebrand-only originalFuel fields', () => {
      const result = mapKeys(
        { mGVwfX: 'Maker', qHMgAu: 'Coal', UPvcFc: 'Dried' },
        'fuel'
      )

      expect(result).toEqual({
        originalFuel: { manufacturer: 'Maker', name: 'Coal', changes: 'Dried' }
      })
    })

    test.each([
      ['Yes, the fuel has been changed', true],
      ['yes', true],
      ['No, the fuel has not been changed', false]
    ])('converts isChangedOrMixed text "%s" to %s', (text, expected) => {
      expect(mapKeys({ wSvNbv: text }, 'fuel')).toEqual({
        originalFuel: { isChangedOrMixed: expected }
      })
    })

    test('keeps a boolean isChangedOrMixed value unchanged', () => {
      expect(mapKeys({ wSvNbv: true }, 'fuel')).toEqual({
        originalFuel: { isChangedOrMixed: true }
      })
    })

    test('maps manufacture-only fields', () => {
      const result = mapKeys(
        {
          vUJklv: '10g',
          rIyajj: 'Wood',
          kOXZSk: '0.1%',
          Hdxrqy: 'Kiln',
          dDwQia: true,
          GgFWEK: 'Brand',
          fvgxNC: ['Alt'],
          dytkGm: 'agreed',
          userConfirmationEmailAddress: 'a@b.com'
        },
        'fuel'
      )

      expect(result).toEqual({
        fuelDescription: {
          weight: '10g',
          composition: 'Wood',
          sulphurContent: '0.1%'
        },
        manufacturingProcess: 'Kiln',
        hasQualityControlSystem: true,
        brandName: 'Brand',
        additionalBrandNames: ['Alt'],
        declaration: 'agreed',
        userConfirmationEmailAddress: 'a@b.com'
      })
    })

    test('does not recurse into array values', () => {
      expect(mapKeys({ fvgxNC: ['a', 'b'] }, 'fuel')).toEqual({
        additionalBrandNames: ['a', 'b']
      })
    })
  })
})
