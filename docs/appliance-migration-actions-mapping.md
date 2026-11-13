# Appliance migration: action history and country certification mapping

Source: the `Appliances` sheet of the master list. Code: `buildApplianceActions`, `buildCountryActions` and `buildCertification` in `src/common/helpers/entity-config.js`; the importer is `src/migrations/excel-importer.js`.

Each migrated appliance gets its action entries in the `Actions` collection, linked by `itemId` (the new appliance `id`).

## Rules that apply everywhere

| Topic           | Rule                                                                                                                                                                                                             |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dates           | Time is dropped; saved as a Date at midnight UTC. Accepted formats include `21/10/2015`, `21/10/2015 17:48:33`, `20151021` and Excel date cells.                                                                 |
| Unreadable date | Saved as `null`; a warning is printed. The appliance still imports.                                                                                                                                              |
| Names           | `Name <email>` is split into `name` and `email`. Actor `type` is `user`.                                                                                                                                         |
| Empty value     | Saved as `null`. No value is invented.                                                                                                                                                                           |
| Entry order     | Entries for one appliance are inserted oldest first by date. Same-day order: Rejected at application, Accepted at application, Sent to X for certification, Certified/Uncertified in X. Undated entries go last. |

## Application review actions

| Action                  | Created when                                                                                                | Completed by (first, then fallback)                           | Date (first, then fallback)                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Rejected at application | `Reviewer Reject Date` has a value (also when there is no approve date; marked `TODO double check` in code) | `Reviewed By (User)`, then `Submitted By (User)`, then `null` | `Reviewer Reject Date`, then `null`                                                          |
| Accepted at application | `Reviewer Approve Date` has a value, or, when it is empty, `England Status` is `Published (600)`            | `Reviewed By (User)`, then `Submitted By (User)`, then `null` | `Reviewer Approve Date`; for the `Published (600)` case `England Assigned Date`; then `null` |

If `Reviewer Approve Date` is empty and England is not `Published (600)`, no Accepted entry is created.

## Country actions (England, Scotland, Wales, Northern Ireland)

Column prefixes: `England`, `Scotland`, `Wales`, `N Ireland`.

| Action                      | Created when                                       | Completed by (first, then fallback)                           | Date (first, then fallback)                                          |
| --------------------------- | -------------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------- |
| Sent to X for certification | `<Country> Assigned Date` has a value (any status) | `Reviewed By (User)`, then `Submitted By (User)`, then `null` | `<Country> Assigned Date`, then `null`                               |
| Certified in X              | `<Country> Status` is `Published (600)`            | `<Country> User`, then `null`                                 | `<Country> Publish Date`, then `<Country> Approve Date`, then `null` |
| Uncertified in X            | `<Country> Status` is `Rejected by DA (80)`        | `<Country> User`, then `null`                                 | `<Country> Publish Date`, then `null`                                |

Notes:

- There is no reject-date column for countries, so Uncertified uses the Publish Date only. When it is empty the date is `null` and the console prints: "reject date doesn't exist ... do you mean the approve or assigned date?" followed by the Assigned, Approve and Publish dates.
- `Draft (10)` rows get no Certified or Uncertified entry. The console prints a "is a draft" message with the three dates.
- `Awaiting Review (20)` rows also get no Certified or Uncertified entry.

## Country certification fields on the appliance

For `englandCertification`, `scotlandCertification`, `walesCertification` and `nIrelandCertification`:

| Field              | Source                                                                                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `status`           | `Published (600)` is `certified`; `Rejected by DA (80)` is `uncertified`; `Awaiting Review (20)` is `awaiting_decision`; anything else (`Draft (10)`, empty) is `new` (marked `TODO come back to this`) |
| `firstCertifiedAt` | `<Country> Publish Date`, then `<Country> Approve Date`, then `null` (applied to every status)                                                                                                          |
| `lastCertifiedAt`  | same value as `firstCertifiedAt`                                                                                                                                                                        |
| `decidedAt`        | certified: the same date as `firstCertifiedAt`; uncertified: `<Country> Publish Date` only; other statuses `null`                                                                                       |
| `decidedBy`        | `<Country> User` (certified and uncertified rows only), otherwise `null`                                                                                                                                |

## technicalReview on the appliance

`status`, `reviewedAt` and `reviewedBy` come from the latest of the Rejected/Accepted at application entries, by date. `documentationChecks` and `listingChecks` are not set.

| Situation                                       | status                                                                                                                                                               | reviewedAt / reviewedBy                          |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Only a Rejected entry                           | `rejected`                                                                                                                                                           | its date and person                              |
| Only an Accepted entry                          | `accepted`                                                                                                                                                           | its date and person                              |
| Both, with different dates                      | the later one                                                                                                                                                        | the later one's date and person                  |
| Both on the same day, or a date unreadable      | scenario-dependent (see Identical Date Tie Handling section); console prints detailed diagnostic info (dates with millisecond timestamps + all country publish dates) | the relevant entry's date and person             |
| Neither, but certified in any country           | `accepted`                                                                                                                                                           | earliest certification date, `reviewedBy` `null` |
| Neither, and `Reviewer Assign Date` has a value | `in_review`                                                                                                                                                          | `null`                                           |
| Neither of the above                            | `new`                                                                                                                                                                | `null`                                           |

## Other fields set by the mapping

- `id`: `PPPP-SSSS` with the sequence starting at `0001`, assigned in ascending `Appliance ID` order and continuing from the last stored ID.
- `isLegacyRecord`: `true`.
- `TEST` rows (`Appliance Name (Title)` equals `TEST`) are skipped and logged with their Excel row number.
- `isVisibleToPublic`: Set based on country-level publish date availability (see Identical Date Tie Handling section). These records may require manual review depending on scenario.

## Identical Date Tie Handling

When `Reviewer Reject Date` and `Reviewer Approve Date` are on the same calendar date with no time component to differentiate them, the system applies scenario-based logic based on country-level publish date availability:

### Scenario 1: Some Countries Missing Publish Dates (12+ cases found)
- **Status**: `accepted` (optimistic, since some certification exists)
- **isVisibleToPublic**: `false` (flag for manual review due to incomplete country certifications)
- **When**: 1–3 countries have publish dates; one or more countries are missing

Example log output:
```
Dates are IDENTICAL for legacy appliance 57993: Reject Date: 3/24/2021 (2021-03-24T00:00:00.000Z, 1616544000000ms), Reviewer Approve Date: 3/24/2021 (2021-03-24T00:00:00.000Z, 1616544000000ms); no time component to differentiate - Country Publish Dates: england: 3/29/2021, scotland: 3/25/2021, wales: none, nireland: 3/31/2021 - using accepted with isVisibleToPublic: false
```

### Scenario 2: All Countries Have Publish Dates (88+ cases found - MOST COMMON)
- **Status**: `accepted` (highest confidence; all countries certified)
- **isVisibleToPublic**: `true` (approved and ready for public visibility)
- **When**: All 4 countries (England, Scotland, Wales, N Ireland) have publish dates

Example log output:
```
Dates are IDENTICAL for legacy appliance 12345: Reject Date: 10/25/2016 (2016-10-25T00:00:00.000Z, 1477353600000ms), Reviewer Approve Date: 10/25/2016 (2016-10-25T00:00:00.000Z, 1477353600000ms); no time component to differentiate - Country Publish Dates: england: 10/25/2016, scotland: 10/24/2016, wales: 4/13/2017, nireland: 10/27/2016 - using accepted with isVisibleToPublic: true
```

### Scenario 3: All Countries Missing Publish Dates (NOT FOUND in dataset)
- **Status**: `rejected` (insufficient certification evidence; conservative fallback)
- **isVisibleToPublic**: `false` (not visible, not approved)
- **When**: No country has a publish date (data quality issue indicator)

Example log output:
```
Dates are IDENTICAL for legacy appliance 99999: Reject Date: 6/15/2020 (2020-06-15T00:00:00.000Z, 1592179200000ms), England Assigned Date: 6/15/2020 (2020-06-15T00:00:00.000Z, 1592179200000ms); no time component to differentiate - Country Publish Dates: england: none, scotland: none, wales: none, nireland: none - using rejected
```

### Console Output Details
All identical date scenarios print:
- **Appliance ID**: Legacy identifier from the Excel sheet
- **Reject Date**: From `Reviewer Reject Date` column with ISO timestamp and milliseconds
- **Approve Date**: From `Reviewer Approve Date` (if present) or `England Assigned Date` (fallback), with ISO timestamp and milliseconds
- **Proof of identity**: Both dates show identical millisecond values (e.g., `1616544000000ms`)
- **Country Publish Dates**: All 4 countries listed with their dates or `none` if absent
- **Decision message**: Shows which scenario was applied and the resulting status/visibility setting

## Open points

- About 3,800 certification dates per country are 1899 or 1900 placeholder dates in the source sheet. They are currently saved as they are. A cutoff that treats them as `null` is waiting on a decision.
- 1,335 Wales certified rows have no Publish or Approve Date, so their Certified entry and `firstCertifiedAt` are `null`.
- Before importing for real, clear both `Appliances` and `Actions`, or the entries will be doubled.
