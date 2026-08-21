import { describe, test, expect, vi, beforeEach } from 'vitest'
import {
  ListObjectsV2Command,
  HeadObjectCommand
} from '@aws-sdk/client-s3'

import * as s3Module from './s3-download.js'
import { unlink } from 'fs/promises'

const {
  findKeyByMetadataFilename,
  cleanupTempFile,
  s3Client
} = s3Module

vi.mock('fs/promises', async () => {
  const actual = await vi.importActual('fs/promises')

  return {
    ...actual,
    unlink: vi.fn()
  }
})

describe('#findKeyByMetadataFilename', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  test('should have an instantiated S3 client', () => {
    expect(s3Client).toBeDefined()
    expect(typeof s3Client.send).toBe('function')
  })

  test('should return matching S3 key when encodedfilename metadata exists', async () => {
    const sendSpy = vi.spyOn(s3Client, 'send')

    sendSpy
      .mockResolvedValueOnce({
        Contents: [
          { Key: 'file-1.xlsx' },
          { Key: 'master-list.xlsx' }
        ],
        NextContinuationToken: undefined
      })
      .mockResolvedValueOnce({
        Metadata: {
          encodedfilename: 'SomeOtherFile.xlsx'
        }
      })
      .mockResolvedValueOnce({
        Metadata: {
          encodedfilename: 'MasterList.xlsx'
        }
      })

    const result = await findKeyByMetadataFilename('test-bucket')

    expect(result).toBe('master-list.xlsx')

    expect(sendSpy).toHaveBeenCalledWith(
      expect.any(ListObjectsV2Command)
    )

    expect(sendSpy).toHaveBeenCalledWith(
      expect.any(HeadObjectCommand)
    )

    expect(sendSpy).toHaveBeenCalledTimes(3)
  })

  test('should throw when matching file cannot be found', async () => {
    vi.spyOn(s3Client, 'send')
      .mockResolvedValueOnce({
        Contents: [{ Key: 'file-1.xlsx' }],
        NextContinuationToken: undefined
      })
      .mockResolvedValueOnce({
        Metadata: {
          encodedfilename: 'AnotherFile.xlsx'
        }
      })

    await expect(
      findKeyByMetadataFilename('test-bucket')
    ).rejects.toThrow('File not found: MasterList.xlsx')
  })

  test('should continue searching when result set is paginated', async () => {
    const sendSpy = vi.spyOn(s3Client, 'send')

    sendSpy
      .mockResolvedValueOnce({
        Contents: [{ Key: 'file-1.xlsx' }],
        NextContinuationToken: 'page-2'
      })
      .mockResolvedValueOnce({
        Metadata: {
          encodedfilename: 'AnotherFile.xlsx'
        }
      })
      .mockResolvedValueOnce({
        Contents: [{ Key: 'master-list.xlsx' }],
        NextContinuationToken: undefined
      })
      .mockResolvedValueOnce({
        Metadata: {
          encodedfilename: 'MasterList.xlsx'
        }
      })

    const result = await findKeyByMetadataFilename('test-bucket')

    expect(result).toBe('master-list.xlsx')
    expect(sendSpy).toHaveBeenCalledTimes(4)
  })

  test('should throw when contents array is empty', async () => {
    vi.spyOn(s3Client, 'send').mockResolvedValueOnce({
      Contents: [],
      NextContinuationToken: undefined
    })

    await expect(
      findKeyByMetadataFilename('test-bucket')
    ).rejects.toThrow('File not found: MasterList.xlsx')
  })

  test('should ignore objects with missing metadata', async () => {
    vi.spyOn(s3Client, 'send')
      .mockResolvedValueOnce({
        Contents: [{ Key: 'file-1.xlsx' }],
        NextContinuationToken: undefined
      })
      .mockResolvedValueOnce({
        Metadata: undefined
      })

    await expect(
      findKeyByMetadataFilename('test-bucket')
    ).rejects.toThrow('File not found: MasterList.xlsx')
  })
})

describe('#cleanupTempFile', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  test('should successfully clean up temporary file', async () => {
    const logger = {
      info: vi.fn(),
      warn: vi.fn()
    }

    unlink.mockResolvedValue()

    await cleanupTempFile('/tmp/test.xlsx', logger)

    expect(unlink).toHaveBeenCalledWith('/tmp/test.xlsx')

    expect(logger.info).toHaveBeenCalledWith(
      { filePath: '/tmp/test.xlsx' },
      'Temporary file cleaned up'
    )

    expect(logger.warn).not.toHaveBeenCalled()
  })

  test('should log warning when cleanup fails', async () => {
    const logger = {
      info: vi.fn(),
      warn: vi.fn()
    }

    unlink.mockRejectedValue(new Error('delete failed'))

    await cleanupTempFile('/tmp/test.xlsx', logger)

    expect(logger.warn).toHaveBeenCalledWith(
      {
        filePath: '/tmp/test.xlsx',
        error: 'delete failed'
      },
      'Failed to cleanup temp file'
    )
  })
})