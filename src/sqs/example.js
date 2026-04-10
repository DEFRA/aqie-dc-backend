//Parsed message.body for appliance with find address
export const exampleA = {
  meta: {
    schemaVersion: 1,
    timestamp: '2026-04-08T21:33:06.160Z',
    referenceNumber: 'CT9-YB2-8B3',
    formName:
      'Get a stove or other appliance certified for use in smoke control areas',
    formId: '69a80de205ec1896e96af1c6',
    formSlug:
      'get-a-stove-or-other-appliance-certified-for-use-in-smoke-control-areas',
    status: 'draft',
    isPreview: true,
    notificationEmail: 'person@abc.com',
    versionMetadata: { versionNumber: 3, createdAt: '2026-03-04T10:48:34.590Z' }
  },
  data: {
    main: {
      CTGxGs: 'Hello',
      TbMaXV: true,
      mwGItn: {
        uprn: '38002618',
        addressLine1: 'Coopers Coffee Shop 362',
        addressLine2: 'Aigburth Road',
        town: 'Liverpool',
        postcode: 'L17 6AE'
      },
      CfdMSm: 'test',
      gTshkc: 'etes@gmail.com',
      eDOPFB: null,
      JIeTGU: null,
      tBhcJV: 'InstructionalManualDetailsTitleTest1',
      PebAxQ: '12/01/1998',
      ZvUEHQ: '1111',
      DiJXuZ: 'Additional information (optional)',
      tiRhSf: 'true'
    },
    repeaters: {
      LbZxXf: [
        {
          cciwNV: 'ModelName',
          oSUxHw: '2121',
          LkASfn: 'Stove',
          xlcDZp: 'other type',
          mVqdEy: true,
          GFREno: 'certified app test 1',
          Ltjqls: ['Wood logs'],
          NGfXVf:
            'If other, what fuel types will the appliance be certified to burn? (optional) test 1'
        }
      ]
    },
    files: {}
  },
  result: {
    files: {
      main: '35f4d1da-b60b-42b5-bbc5-13d9867c527c',
      repeaters: { LbZxXf: 'e7ae84d9-13f3-4f00-8c58-5ef2b8fe548d' }
    }
  }
}

//resulting payload for appliance with find address: Calling internal API for type: appliance with payload:
export const resultA = {
  company: {
    'company****** ******': true,
    contact: {
      'companyContact****** ******': 'testemail@gmail.com',
      companyAlternateEmail: 'alternate1@email.com',
      companyPhone: '******'
    }
  },
  instructionManual: {
    instructionManualTitle:
      'If other, what fuel types will the appliance be certified to burn? (optional) test 1',
    instructionManualDate: '12/01/1998',
    instructionManualVersion: '1111',
    instructionManualAdditionalInfo: 'Additional information (optional)'
  },
  declaration: {
    declaration: 'true'
  },
  appliance: {
    model: {
      'model****** Model ******': '1111'
    },
    applianceType: 'Stove',
    isVariant: true,
    existingAuthorisedAppliance: 'certified app test 1',
    nominalOutput: 12,
    allowedFuels: ['Wood logs']
  }
}

export const exampleB = {
  meta: {
    schemaVersion: 1,
    timestamp: '2026-04-08T16:51:20.249Z',
    referenceNumber: '6NM-VDZ-WNN',
    form: '****** or other appliance certified for use in smoke control areas',
    formId: '69a80de205ec1896e96af1c6',
    formSlug:
      'get-a-stove-or-other-appliance-certified-for-use-in-smoke-control-areas',
    status: 'draft',
    isPreview: true,
    notificationEmail: 'person@abc.com',
    versionMetadata: {
      versionNumber: 3,
      createdAt: '2026-03-04T10:48:34.590Z'
    }
  },
  data: {
    main: {
      CTGxGs: {
        label: 'Company ******',
        value: true
      },
      mwGItn: {
        addressLine1: '******',
        addressLine2: '******',
        town: 'Town Test 2',
        county: 'County Test 2',
        postcode: '******'
      },
      CfdMSm: {
        label: 'Main Contact ******',
        value: 'testemail2@gmail.com'
      },
      eDOPFB: 'alternatetest2@email.com',
      JIeTGU: '******',
      tBhcJV: 'InstructionalManualDetailsTitleTest2',
      PebAxQ: 'InstructionalManualPubDate2',
      ZvUEHQ: '2',
      DiJXuZ: 'Addiotna info test 2',
      tiRhSf: 'true'
    },
    repeaters: {
      LbZxXf: [
        {
          cciwNV: {
            label: 'App details Model ******',
            value: '2222'
          },
          LkASfn: 'Stove',
          xlcDZp: 'SHOULD BE LEFT BLANK',
          mVqdEy: true,
          GFREno: 'The cetrfied app is this 2',
          jxCIYY: 22,
          Ltjqls: ['Wood logs', 'Wood chips']
        }
      ]
    },
    files: {}
  },
  result: {
    files: {
      main: 'd1daf148-98e7-40c9-b955-bedad07a6b95',
      repeaters: {
        LbZxXf: 'ed13b86b-d006-434e-b95b-567c542561fe'
      }
    }
  }
}
//parsed mesage.body for appliance with manual address:
//Calling internal API for type: appliance with payload:
export const resultB = {
  company: {
    'company****** ******': true,
    contact: {
      'companyContact****** ******': 'testemail2@gmail.com',
      companyAlternateEmail: 'alternatetest2@email.com',
      companyPhone: '******'
    }
  },
  instructionManual: {
    instructionManualTitle: 'InstructionalManualDetailsTitleTest2',
    instructionManualDate: 'InstructionalManualPubDate2',
    instructionManualVersion: '2',
    instructionManualAdditionalInfo: 'Addiotna info test 2'
  },
  declaration: {
    declaration: 'true'
  },
  appliance: {
    model: {
      'model****** Model ******': '2222'
    },
    applianceType: 'Stove',
    isVariant: true,
    existingAuthorisedAppliance: 'The cetrfied app is this 2',
    nominalOutput: 22,
    allowedFuels: ['Wood logs', 'Wood chips']
  }
}
