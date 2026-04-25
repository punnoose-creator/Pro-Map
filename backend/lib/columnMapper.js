/**
 * Maps parsed JSON fields to an ordered array of cell values
 * matching the exact column layout of each sheet tab.
 *
 * Column order matches the Google Sheet headers (Row 4 = header row).
 */

function mapDailyLog(d) {
  // Columns A–Q (17 columns)
  return [
    d.date            || '',   // A - Date
    d.activity_type   || '',   // B - Activity Type
    d.company         || '',   // C - Company / Project
    d.contact_person  || '',   // D - Contact Person
    d.designation     || '',   // E - Designation
    d.inquiry_source  || '',   // F - Inquiry Source
    d.purpose         || '',   // G - Purpose / Discussion Summary
    d.project_stage   || '',   // H - Project Stage
    d.est_value_aed   || '',   // I - Est. Value (AED)
    d.key_outcome     || '',   // J - Key Outcome Achieved
    d.inquiry_raised  || 'N',  // K - Inquiry Raised? (Y/N)
    d.inquiry_id      || '',   // L - Inquiry ID
    d.next_action     || '',   // M - Next Action
    d.follow_up_date  || '',   // N - Follow-up Date
    d.gps_photo       || 'N',  // O - GPS+Photo?
    '',                        // P - Productive? (Manager fills this)
    d.logged_by       || '',   // Q - Logged By (Admin use)
  ];
}

function mapInquiryProposals(d) {
  // Columns A–S (19 columns)
  return [
    d.inquiry_id      || '',   // A - Inquiry ID
    d.date            || '',   // B - Date Received
    d.company         || '',   // C - Project Name
    d.contact_person  || '',   // D - Client / End User
    d.inquiry_source  || '',   // E - Inquiry Source
    d.activity_id     || '',   // F - Activity ID (from Daily Log)
    d.purpose         || '',   // G - ELV Scope Summary
    d.est_value_aed   || '',   // H - Est. Value (AED)
    d.proposal_track  || '',   // I - Proposal Track
    '',                        // J - Sent to Estimation?
    '',                        // K - Estimation Return Date
    '',                        // L - Sub Quote Log ID
    '25%',                     // M - Subcontract Margin Applied (default)
    '',                        // N - Proposal Value (AED)
    '',                        // O - Submission Date
    '',                        // P - Proposal Status
    d.follow_up_date  || '',   // Q - Expected Decision
    d.next_action     || '',   // R - Next Action
    d.logged_by       || '',   // S - Logged By (Admin use)
  ];
}

function mapWinLoss(d) {
  // Columns A–O (15 columns)
  return [
    d.inquiry_id      || '',   // A - Inquiry ID
    d.date            || '',   // B - Decision Date
    d.company         || '',   // C - Project Name
    d.contact_person  || '',   // D - Client
    d.outcome         || '',   // E - Outcome (Won/Lost)
    d.est_value_aed   || '',   // F - Proposal Value (AED)
    d.won_value       || '',   // G - Won Value (AED)
    d.proposal_track  || '',   // H - Proposal Track
    d.loss_reason     || '',   // I - Primary Loss Reason
    '',                        // J - Secondary Loss Reason
    d.win_reason      || '',   // K - Win Reason
    d.competitor      || '',   // L - Competitor (if lost)
    d.next_action     || '',   // M - Lesson / Action Taken
    '',                        // N - Manager Notes
    d.logged_by       || '',   // O - Logged By (Admin use)
  ];
}

function mapPendingFollowups(d) {
  // Columns A–K (11 columns)
  return [
    d.follow_up_date  || '',   // A - Follow-up Date
    d.company         || '',   // B - Company / Project
    d.contact_person  || '',   // C - Contact Person
    d.next_action     || '',   // D - What was agreed / next step
    d.inquiry_id      || '',   // E - Inquiry ID (if raised)
    '',                        // F - Days Overdue (formula)
    'Pending',                 // G - Status
    '',                        // H - Action Taken
    'N',                       // I - Completed? (Y/N)
    '',                        // J - Manager Note
    d.logged_by       || '',   // K - Logged By (Admin use)
  ];
}

const SHEET_MAPPERS = {
  'Daily Log':           mapDailyLog,
  'Inquiry & Proposals': mapInquiryProposals,
  'Win-Loss Register':   mapWinLoss,
  'Pending Follow-ups':  mapPendingFollowups,
};

/**
 * Returns ordered row values for the given sheet tab.
 * @param {string} sheetName
 * @param {Object} parsedData
 * @returns {any[]}
 */
function mapToRowValues(sheetName, parsedData) {
  const mapper = SHEET_MAPPERS[sheetName] || mapDailyLog;
  return mapper(parsedData);
}

module.exports = { mapToRowValues, SHEET_MAPPERS };
