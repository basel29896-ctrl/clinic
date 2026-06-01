/**
 * Google Apps Script — receives appointment rows from Supabase and writes
 * them to a Google Sheet. Deploy as a Web App (Execute as: Me,
 * Who has access: Anyone). Copy the deployment URL into Supabase config.
 *
 * Payload shape (sent by the Postgres trigger in 0002_sheets_sync.sql):
 * {
 *   "type": "INSERT" | "UPDATE",
 *   "record": {
 *     "id": "...", "patient_name": "...", "phone": "...",
 *     "scheduled_at": "...", "status": "...", "reason": "...",
 *     "created_at": "..."
 *   }
 * }
 */

var SHEET_NAME = 'Appointments';
var HEADERS = ['id', 'patient_name', 'phone', 'scheduled_at', 'status', 'reason', 'created_at', 'synced_at'];

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var rec = body.record || {};
    var sheet = getSheet_();

    var row = [
      rec.id || '',
      rec.patient_name || '',
      rec.phone || '',
      rec.scheduled_at || '',
      rec.status || '',
      rec.reason || '',
      rec.created_at || '',
      new Date().toISOString(),
    ];

    // Upsert by appointment id (column A). Update if the id already exists,
    // otherwise append a new row.
    var idColumn = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 0), 1).getValues();
    var foundRow = -1;
    for (var i = 0; i < idColumn.length; i++) {
      if (idColumn[i][0] === rec.id) {
        foundRow = i + 2; // offset for header + 1-based
        break;
      }
    }

    if (foundRow > 0) {
      sheet.getRange(foundRow, 1, 1, row.length).setValues([row]);
    } else {
      sheet.appendRow(row);
    }

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  return sheet;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
