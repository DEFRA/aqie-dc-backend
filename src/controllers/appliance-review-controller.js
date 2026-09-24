import Boom from '@hapi/boom'
import {
  canAcceptReview,
  getCheckGroup,
  getOutstandingChecks
} from '../common/helpers/review-status.js'
import { updateAppliance } from './appliances-controller.js'

/**
 * Appliance Review Controller
 * Business logic for the technical review of an appliance
 */

const LOGGER_REQUIRED_ERROR = 'logger is required'
const APPLIANCE_NOT_FOUND = 'Appliance not found'

function validateTechnicalReviewCheck(check, result, data) {
  const group = getCheckGroup(check)

  if (!group) {
    throw new Error(`Unrecognised check: ${check}`)
  }

  if (check === 'additionalConditions') {
    const text = data?.additionalConditions?.trim()
    if (result !== true || !text || text.length === 0) {
      throw Boom.badRequest(
        'Additional conditions must be marked complete and include text'
      )
    }
  }

  return group
}

function buildCheckUpdatePayload(group, check, result, data) {
  if (!data) {
    return { technicalReview: { [group]: { [check]: result } } }
  }

  return {
    ...data,
    technicalReview: { [group]: { [check]: result } }
  }
}

/**
 * Get the technical review state for one appliance.
 * Returns only the fields the review screen needs, not the whole record.
 */
async function getApplianceReview(db, id, logger) {
  if (!logger) {
    throw new Error(LOGGER_REQUIRED_ERROR)
  }
  try {
    const item = await db.collection('Appliances').findOne(
      { id },
      {
        projection: {
          id: 1,
          modelName: 1,
          modelNumber: 1,
          applicationId: 1,
          applianceType: 1,
          isVariant: 1,
          existingAuthorisedAppliance: 1,
          nominalOutput: 1,
          multifuelAppliance: 1,
          permittedFuels: 1,
          isPermittedToBurnWood: 1,
          additionalConditions: 1,
          technicalReview: 1,
          _id: 0
        }
      }
    )

    if (!item) {
      return {
        success: false,
        message: APPLIANCE_NOT_FOUND,
        notFound: true
      }
    }

    return {
      success: true,
      data: {
        ...item,
        outstandingChecks: getOutstandingChecks(item.technicalReview)
      }
    }
  } catch (error) {
    logger.error(error, 'Failed to fetch appliance review')
    throw error
  }
}

/**
 * Record the result of one documentation or listing check.
 * Recording the first result also moves the appliance from 'new' to
 * 'in_review', so the applications list can show "Continue review".
 */
async function recordApplianceCheck(db, id, check, result, logger, data) {
  if (!logger) {
    throw new Error(LOGGER_REQUIRED_ERROR)
  }
  try {
    const group = validateTechnicalReviewCheck(check, result, data)

    const item = await db
      .collection('Appliances')
      .findOne({ id }, { projection: { technicalReview: 1, _id: 0 } })

    if (!item) {
      return {
        success: false,
        message: APPLIANCE_NOT_FOUND,
        notFound: true
      }
    }

    const updates = buildCheckUpdatePayload(group, check, result, data)

    if (item.technicalReview?.status === 'new') {
      updates.technicalReview.status = 'in_review'
    }

    const updated = await updateAppliance(db, id, updates, logger)

    if (updated.notFound) {
      return {
        success: false,
        message: APPLIANCE_NOT_FOUND,
        notFound: true
      }
    }

    logger.info(`Appliance check ${check} recorded as ${result}: ${id}`)

    return {
      success: true,
      data: { id, check, result }
    }
  } catch (error) {
    logger.error(error, 'Failed to record appliance check')
    throw error
  }
}

/**
 * Record the reviewer's decision on an appliance.
 * Accepting is refused until every documentation and listing check has passed.
 */
async function updateApplianceReview(db, id, decision, logger) {
  if (!logger) {
    throw new Error(LOGGER_REQUIRED_ERROR)
  }
  try {
    const item = await db
      .collection('Appliances')
      .findOne({ id }, { projection: { technicalReview: 1, _id: 0 } })

    if (!item) {
      return {
        success: false,
        message: APPLIANCE_NOT_FOUND,
        notFound: true
      }
    }

    const { status, reviewedBy } = decision

    if (status === 'accepted' && !canAcceptReview(item.technicalReview)) {
      return {
        success: false,
        message: 'Appliance cannot be accepted until every check has passed',
        incomplete: true,
        outstandingChecks: getOutstandingChecks(item.technicalReview)
      }
    }

    const reviewedAt = new Date()

    const result = await updateAppliance(
      db,
      id,
      {
        technicalReview: { status, reviewedAt, reviewedBy: reviewedBy ?? null }
      },
      logger
    )

    if (result.notFound) {
      return {
        success: false,
        message: APPLIANCE_NOT_FOUND,
        notFound: true
      }
    }

    logger.info(`Appliance review ${status}: ${id}`) // Only the decision is returned - the full record from updateAppliance
    // carries company contact details this endpoint has no reason to expose.

    return {
      success: true,
      data: { id, status, reviewedAt }
    }
  } catch (error) {
    logger.error(error, 'Failed to update appliance review')
    throw error
  }
}

/**
 * Rounds a numeric measurement to a maximum of two decimal places.
 *
 * This is only used when the test report is marked as passed.
 *
 * Examples:
 * 5.678 -> 5.68
 * 5.124 -> 5.12
 * 2.555 -> 2.56
 * 1.005 -> 1.01
 */
const roundToTwoDecimalPlaces = (value) => {
  const number = Number(value)

  return Math.round((number + Number.EPSILON) * 100) / 100
}

/**
 * Normalises passed test-report values.
 *
 * Passed measurements are stored as numbers rounded to a maximum
 * of two decimal places.
 */
const normalisePassedTestReport = (testReport) => ({
  reviewStatus: testReport.reviewStatus,

  ratedOutput: roundToTwoDecimalPlaces(testReport.ratedOutput),

  testedOutput: {
    rated: roundToTwoDecimalPlaces(testReport.testedOutput.rated),
    low: roundToTwoDecimalPlaces(testReport.testedOutput.low)
  },

  smokeEmissionOutput: {
    rated: roundToTwoDecimalPlaces(testReport.smokeEmissionOutput.rated),
    low: roundToTwoDecimalPlaces(testReport.smokeEmissionOutput.low)
  }
})

/**
 * Only normalises measurement values when the report is passed.
 *
 * Failed values are returned unchanged so that empty strings,
 * alphabetic values, alphanumeric values, negative values and
 * numeric strings are preserved exactly as received.
 */
const normaliseTestReport = (testReport) => {
  if (testReport.reviewStatus !== true) {
    return testReport
  }

  return normalisePassedTestReport(testReport)
}

const mapTestReportResponse = (item) => ({
  id: item.id,
  modelName: item.modelName,
  ratedOutput: item.testResults?.ratedOutput ?? null,
  testedOutput: {
    rated: item.testResults?.testedOutput?.rated ?? null,
    low: item.testResults?.testedOutput?.low ?? null
  },
  smokeEmissionOutput: {
    rated: item.testResults?.smokeEmissionOutput?.rated ?? null,
    low: item.testResults?.smokeEmissionOutput?.low ?? null
  },
  reviewStatus: item.technicalReview?.documentationChecks?.testReports ?? null
})

/**
 * Get the test-report values and review result for an appliance.
 */
async function getTestReport(db, id, logger) {
  if (!logger) {
    throw new Error(LOGGER_REQUIRED_ERROR)
  }

  try {
    const item = await db.collection('Appliances').findOne(
      { id },
      {
        projection: {
          id: 1,
          modelName: 1,
          testResults: 1,
          'technicalReview.documentationChecks.testReports': 1,
          _id: 0
        }
      }
    )

    if (!item) {
      return {
        success: false,
        message: APPLIANCE_NOT_FOUND,
        notFound: true
      }
    }

    return {
      success: true,
      data: mapTestReportResponse(item)
    }
  } catch (error) {
    logger.error(error, 'Failed to fetch appliance test reports')
    throw error
  }
}

/**
 * Update the test-report values and review result for an appliance.
 *
 * When marking as passed:
 * - all measurements have already been validated
 * - measurements are converted to numbers
 * - measurements are rounded to two decimal places
 *
 * When marking as failed:
 * - measurement values are not validated here
 * - values are stored exactly as received
 * - empty, alphabetic, alphanumeric and negative values are retained
 *
 * Saving the test-report review for the first time moves the overall
 * technical review from "new" to "in_review".
 */
async function updateTestReport(db, id, testReport, logger) {
  if (!logger) {
    throw new Error(LOGGER_REQUIRED_ERROR)
  }

  try {
    const item = await db.collection('Appliances').findOne(
      { id },
      {
        projection: {
          technicalReview: 1,
          _id: 0
        }
      }
    )

    if (!item) {
      return {
        success: false,
        message: APPLIANCE_NOT_FOUND,
        notFound: true
      }
    }

    /*
     * Only passed values are converted and rounded.
     *
     * Failed and unreviewed values are retained exactly as
     * supplied by the caller.
     */
    const normalisedTestReport = normaliseTestReport(testReport)

    const { ratedOutput, testedOutput, smokeEmissionOutput, reviewStatus } =
      normalisedTestReport

    const updates = {
      testResults: {
        ratedOutput,
        testedOutput,
        smokeEmissionOutput
      },

      technicalReview: {
        documentationChecks: {
          testReports: reviewStatus
        }
      }
    }

    if (item.technicalReview?.status === 'new') {
      updates.technicalReview.status = 'in_review'
    }

    const result = await updateAppliance(db, id, updates, logger)

    if (result.notFound) {
      return {
        success: false,
        message: APPLIANCE_NOT_FOUND,
        notFound: true
      }
    }

    logger.info(`Appliance test reports updated: ${id}`)

    return {
      success: true,

      data: {
        id,

        ratedOutput: ratedOutput ?? null,

        testedOutput: {
          rated: testedOutput?.rated ?? null,

          low: testedOutput?.low ?? null
        },

        smokeEmissionOutput: {
          rated: smokeEmissionOutput?.rated ?? null,

          low: smokeEmissionOutput?.low ?? null
        },

        reviewStatus
      }
    }
  } catch (error) {
    logger.error(error, 'Failed to update appliance test reports')

    throw error
  }
}

export {
  getApplianceReview,
  updateApplianceReview,
  recordApplianceCheck,
  getTestReport,
  updateTestReport
}
