const { google } = require('googleapis');
const path = require('path');

const KEY_PATH = path.resolve(__dirname, '..', process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './service-account-key.json');
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

let _authClient = null;

async function getAuthClient() {
  if (_authClient) return _authClient;
  
  let authOptions = {};
  if (process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS) {
    try {
      const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS);
      authOptions = { credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] };
    } catch (err) {
      console.error('Error parsing GOOGLE_SERVICE_ACCOUNT_CREDENTIALS:', err.message);
      // Fallback to key file if parsing fails
      authOptions = { keyFile: KEY_PATH, scopes: ['https://www.googleapis.com/auth/spreadsheets'] };
    }
  } else {
    authOptions = { keyFile: KEY_PATH, scopes: ['https://www.googleapis.com/auth/spreadsheets'] };
  }

  const auth = new google.auth.GoogleAuth(authOptions);
  _authClient = await auth.getClient();
  return _authClient;
}

/**
 * Appends a row to a specific sheet tab.
 * @param {string} sheetTab - Sheet tab name e.g. "Daily Log"
 * @param {any[]} rowValues - Ordered array of cell values
 * @param {string} [spreadsheetId] - Optional specific spreadsheet ID
 */
async function appendRow(sheetTab, rowValues, spreadsheetId = SPREADSHEET_ID) {
  const authClient = await getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth: authClient });

  const response = await sheets.spreadsheets.values.append({
    spreadsheetId: spreadsheetId,
    range: `${sheetTab}!A:Z`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    resource: { values: [rowValues] },
  });

  return response.data;
}

/**
 * Fetches all rows from a specific sheet tab.
 * @param {string} sheetTab - Sheet tab name
 * @param {string} [spreadsheetId] - Optional specific spreadsheet ID
 * @returns {Promise<any[][]>} 2D array of values
 */
async function getRows(sheetTab, spreadsheetId = SPREADSHEET_ID) {
  const authClient = await getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth: authClient });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId,
    range: `${sheetTab}!A:Z`,
  });

  return response.data.values || [];
}

module.exports = { appendRow, getRows };
