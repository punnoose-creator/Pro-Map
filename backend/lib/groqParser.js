const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are a field sales log assistant for an ELV (Extra Low Voltage) systems company in the UAE.
Your job is to extract structured data from a salesperson's voice/text note and return ONLY a valid JSON object.

Rules:
- Return ONLY valid JSON, no explanation, no markdown formatting.
- If a value is not mentioned, set it to null.
- est_value_aed must be a number only (no currency symbols, no commas).
- Dates must be in YYYY-MM-DD format. Calculate relative dates (e.g. "next Tuesday", "tomorrow") from today's date provided.
- inquiry_raised: "Y" if the note mentions raising/logging an inquiry, otherwise "N".
- gps_photo: default "N" unless explicitly mentioned.
- sheet: choose the BEST match from exactly these options: "Daily Log", "Inquiry & Proposals", "Win-Loss Register", "Pending Follow-ups".
  - "Daily Log" → any general field visit, meeting, cold call, site visit
  - "Inquiry & Proposals" → when a formal inquiry is raised or a proposal is being prepared/submitted
  - "Win-Loss Register" → when a project is won or lost
  - "Pending Follow-ups" → when logging a reminder or a missed/upcoming follow-up action`;

const USER_TEMPLATE = (text, today) =>
  `Today's date is: ${today}

Extract the following fields from the salesperson's note below:
- sheet (one of: "Daily Log", "Inquiry & Proposals", "Win-Loss Register", "Pending Follow-ups")
- date (YYYY-MM-DD)
- activity_type (e.g. "Client Meeting", "Site Visit", "Cold Call", "Follow-up Call", "Presentation")
- company (company or project name)
- contact_person (full name of person met or called)
- designation (their job title, if mentioned)
- inquiry_source (how the lead came in, e.g. "Referral", "Tender Portal", "Cold Call", "Existing Client")
- purpose (brief summary of what was discussed)
- project_stage (e.g. "Initial Meeting", "Tender", "Negotiation", "Site Survey", "Proposal")
- est_value_aed (number only)
- key_outcome (what was the result or outcome of this engagement)
- inquiry_raised ("Y" or "N")
- inquiry_id (only if explicitly mentioned, otherwise null)
- next_action (what needs to happen next)
- follow_up_date (YYYY-MM-DD)
- gps_photo ("Y" or "N")
- productive ("Y" or "N", default "Y")

Salesperson's note:
"${text}"`;

/**
 * Parses a free-form text note into structured ELV sales data.
 * @param {string} text - Raw speech/text from the salesperson
 * @returns {Promise<Object>} Parsed fields JSON
 */
async function parseLogEntry(text) {
  const today = new Date().toISOString().split('T')[0];

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: USER_TEMPLATE(text, today) },
    ],
    temperature: 0.1,        // Low temperature = more deterministic/accurate
    max_tokens: 800,
    response_format: { type: 'json_object' },  // Force JSON output
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error('Groq returned empty response');

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Groq returned invalid JSON: ${raw}`);
  }

  // Fill defaults
  parsed.date = parsed.date || today;
  parsed.sheet = parsed.sheet || 'Daily Log';
  parsed.inquiry_raised = parsed.inquiry_raised || 'N';
  parsed.gps_photo = parsed.gps_photo || 'N';
  parsed.productive = parsed.productive || 'Y';

  return parsed;
}

/**
 * Generates an end-of-day summary for an employee based on their daily logs.
 * @param {any[][]} logs - Array of row data from the Daily Log sheet
 * @param {string} employeeName - Name of the employee
 * @param {string} date - Date string
 * @returns {Promise<string>} Summary paragraph
 */
async function generateDailySummary(logs, employeeName, date) {
  // Extract useful info from logs to feed to LLM
  const simplifiedLogs = logs.map(row => ({
    timeOrRow: row[0], // Date/time
    activity: row[1], // Activity Type
    company: row[2], // Company
    contact: row[3], // Contact Person
    purpose: row[6], // Purpose
    outcome: row[9], // Key Outcome
    nextAction: row[12], // Next Action
  }));

  const prompt = `You are an assistant for an ELV systems company.
Please summarize the following field visits for ${employeeName} on ${date}.
Write a single, professional paragraph that can be used as an End-of-Day report.
Highlight the companies visited, key outcomes, and any critical next actions.
Do not use markdown, just plain text.

Logs:
${JSON.stringify(simplifiedLogs, null, 2)}`;

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'user', content: prompt },
    ],
    temperature: 0.3,
    max_tokens: 400,
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error('Groq returned empty response');

  return raw.trim();
}

module.exports = { parseLogEntry, generateDailySummary };
