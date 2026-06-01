/**
 * Google Apps Script — receives rows from Supabase and writes them to
 * per-table tabs in this Sheet. Deploy as a Web App (Execute as: Me,
 * Who has access: Anyone). Redeploy a NEW VERSION after editing.
 *
 * Payload (sent by the Postgres triggers):
 * { "sheet": "Appointments" | "Patients", "type": "INSERT|UPDATE", "record": {...} }
 *
 * Upserts by record.id. Header row is auto-built from the record keys
 * the first time a tab is created.
 */

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var rec = body.record || {};
    var sheetName = body.sheet || 'Data';
    var sheet = getSheet_(sheetName, rec);

    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var row = headers.map(function (h) {
      if (h === 'synced_at') return new Date().toISOString();
      return rec[h] != null ? rec[h] : '';
    });

    // Upsert by id (column A).
    var lastRow = sheet.getLastRow();
    var foundRow = -1;
    if (lastRow > 1) {
      var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (var i = 0; i < ids.length; i++) {
        if (ids[i][0] === rec.id) { foundRow = i + 2; break; }
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

function getSheet_(name, rec) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    var headers = Object.keys(rec);
    if (headers.indexOf('id') > 0) {
      headers = ['id'].concat(headers.filter(function (k) { return k !== 'id'; }));
    }
    headers.push('synced_at');
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return sheet;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
