# Appliance migration: action history and country certification mapping

Source: the `Appliances` sheet of the master list. Code: `buildApplianceActions`, `buildCountryActions` and `buildCertification` in `src/common/helpers/entity-config.js`; the importer is `src/migrations/excel-importer.js`.

Each migrated appliance gets its action entries in the `Actions` collection, linked by `itemId` (the new appliance `id`).

## Rules that apply everywhere

| Topic | Rule |
|---|---|
| Dates | Time is dropped; saved as a Date at midnight UTC. Accepted formats include `21/10/2015`, `21/10/2015 17:48:33`, `20151021` and Excel date cells. |
| Unreadable date | Saved as `null`; a warning is printed. The appliance still imports. |
| Names | `Name <email>` is split into `name` and `email`. Actor `type` is `user`. |
| Empty value | Saved as `null`. No value is invented. |
| Entry order | Entries for one appliance are inserted oldest first by date. Same-day order: Rejected at application, Accepted at application, Sent to X for certification, Certified/Uncertified in X. Undated entries go last. |

## Application review actions

| Action | Created when | Completed by (first, then fallback) | Date (first, then fallback) |
|---|---|---|---|
| Rejected at application | `Reviewer Reject Date` has a value (also when there is no approve date; marked `TODO double check` in code) | `Reviewed By (User)`, then `Submitted By (User)`, then `null` | `Reviewer Reject Date`, then `null` |
| Accepted at application | `Reviewer Approve Date` has a value, or, when it is empty, `England Status` is `Published (600)` | `Reviewed By (User)`, then `Submitted By (User)`, then `null` | `Reviewer Approve Date`; for the `Published (600)` case `England Assigned Date`; then `null` |

If `Reviewer Approve Date` is empty and England is not `Published (600)`, no Accepted entry is created.

## Country actions (England, Scotland, Wales, Northern Ireland)

Column prefixes: `England`, `Scotland`, `Wales`, `N Ireland`.

| Action | Created when | Completed by (first, then fallback) | Date (first, then fallback) |
|---|---|---|---|
| Sent to X for certification | `<Country> Assigned Date` has a value (any status) | `Reviewed By (User)`, then `Submitted By (User)`, then `null` | `<Country> Assigned Date`, then `null` |
| Certified in X | `<Country> Status` is `Published (600)` | `<Country> User`, then `null` | `<Country> Publish Date`, then `<Country> Approve Date`, then `null` |
| Uncertified in X | `<Country> Status` is `Rejected by DA (80)` | `<Country> User`, then `null` | `<Country> Publish Date`, then `null` |

Notes:

- There is no reject-date column for countries, so Uncertified uses the Publish Date only. When it is empty the date is `null` and the console prints: "reject date doesn't exist ... do you mean the approve or assigned date?" followed by the Assigned, Approve and Publish dates.
- `Draft (10)` rows get no Certified or Uncertified entry. The console prints a "is a draft" message with the three dates.
- `Awaiting Review (20)` rows also get no Certified or Uncertified entry.

## Country certification fields on the appliance

For `englandCertification`, `scotlandCertification`, `walesCertification` and `nIrelandCertification`:

| Field | Source |
|---|---|
| `status` | `Published (600)` is `certified`; `Rejected by DA (80)` is `uncertified`; `Awaiting Review (20)` is `awaiting_decision`; anything else (`Draft (10)`, empty) is `new` (marked `TODO come back to this`) |
| `firstCertifiedAt` | `<Country> Publish Date`, then `<Country> Approve Date`, then `null` (applied to every status) |
| `lastCertifiedAt` | same value as `firstCertifiedAt` |
| `decidedAt` | certified: the same date as `firstCertifiedAt`; uncertified: `<Country> Publish Date` only; other statuses `null` |
| `decidedBy` | `<Country> User` (certified and uncertified rows only), otherwise `null` |

## technicalReview on the appliance

`status`, `reviewedAt` and `reviewedBy` come from the latest of the Rejected/Accepted at application entries, by date. `documentationChecks` and `listingChecks` are not set.

| Situation | status | reviewedAt / reviewedBy |
|---|---|---|
| Only a Rejected entry | `rejected` | its date and person |
| Only an Accepted entry | `accepted` | its date and person |
| Both, with different dates | the later one | the later one's date and person |
| Both on the same day, or a date unreadable | `rejected`, and the console prints "Confusion about whether the review is accepted or rejected" | the Rejected entry's date and person |
| Neither, but certified in any country | `accepted` | earliest certification date, `reviewedBy` `null` |
| Neither, and `Reviewer Assign Date` has a value | `in_review` | `null` |
| Neither of the above | `new` | `null` |

## Other fields set by the mapping

- `id`: `PPPP-SSSS` with the sequence starting at `0001`, assigned in ascending `Appliance ID` order and continuing from the last stored ID.
- `isLegacyRecord`: `true`.
- `TEST` rows (`Appliance Name (Title)` equals `TEST`) are skipped and logged with their Excel row number.

## Open points

- About 3,800 certification dates per country are 1899 or 1900 placeholder dates in the source sheet. They are currently saved as they are. A cutoff that treats them as `null` is waiting on a decision.
- 1,335 Wales certified rows have no Publish or Approve Date, so their Certified entry and `firstCertifiedAt` are `null`.
- Before importing for real, clear both `Appliances` and `Actions`, or the entries will be doubled.
