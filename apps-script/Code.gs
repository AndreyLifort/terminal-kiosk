/**
 * Google Apps Script для приёма лидов с крипто-терминала.
 * Деплоится как Web App, см. README.md рядом.
 *
 * Перед деплоем подставьте SHEET_ID — ID Google Sheet,
 * куда падают строки (можно взять из URL таблицы, между /d/ и /edit).
 */

const SHEET_ID   = '1Pjp_QZRNGagkISCFRNCoOVlsxLaOtgNz_par9XuFBAk';
const SHEET_NAME = 'Leads';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents || '{}');
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error('Лист "' + SHEET_NAME + '" не найден в таблице');

    sheet.appendRow([
      new Date(),
      String(data.phone      || ''),
      String(data.source     || ''),     // 'crypto' | 'ai'
      String(data.userAgent  || ''),
      String(data.terminalId || ''),
      String(data.ts         || ''),
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  // Health check для быстрой проверки в браузере: открыть URL без параметров
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, service: 'terminal-leads' }))
    .setMimeType(ContentService.MimeType.JSON);
}
