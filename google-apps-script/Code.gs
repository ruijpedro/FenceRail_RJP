const HUB_FOLDER_NAME = 'Hub_Manutencao_IP';
const APP_FOLDER_NAME = 'Vedacoes';
const SHEET_NAME = 'Hub_Manutencao_IP';

function doGet() {
  const data = getSheet_().getDataRange().getValues();
  return json_({ status: 'OK', app: 'Vedacoes', rows: data });
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    const folder = getAppFolder_();
    const sheet = getSheet_();

    const registos = payload.registos || [payload];
    registos.forEach(r => appendRegisto_(sheet, r));

    return json_({
      status: 'OK',
      folderUrl: folder.getUrl(),
      total: registos.length
    });
  } catch (err) {
    return json_({ status: 'ERRO', erro: String(err) });
  }
}

function appendRegisto_(sheet, r) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'ID','Data','Linha','Troço','PK Inicial','PK Final','Lado','Tipo Norma','Tipologia','Estado',
      'GPS Inicial','GPS Final','Comprimento m','Observações','Ação','Fotos'
    ]);
  }
  sheet.appendRow([
    r.id || new Date().getTime(),
    r.data || new Date(),
    r.linha || '',
    r.troco || '',
    r.pkInicio || r.pkIni || '',
    r.pkFim || '',
    r.lado || '',
    r.tipoNorma || '',
    r.tipologia || r.tipo || '',
    r.estado || '',
    r.gpsInicio || '',
    r.gpsFim || '',
    r.comprimento || '',
    r.obs || '',
    r.acao || '',
    Array.isArray(r.fotos) ? r.fotos.map(f => f.nome || f).join('; ') : ''
  ]);
}

function getAppFolder_() {
  const hub = getOrCreateFolder_(DriveApp.getRootFolder(), HUB_FOLDER_NAME);
  const app = getOrCreateFolder_(hub, APP_FOLDER_NAME);
  ['Fotos','PDFs','Relatorios','Mapas','Backup'].forEach(n => getOrCreateFolder_(app, n));
  return app;
}

function getOrCreateFolder_(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function getSheet_() {
  const files = DriveApp.getFilesByName(SHEET_NAME);
  let ss;
  if (files.hasNext()) {
    ss = SpreadsheetApp.open(files.next());
  } else {
    ss = SpreadsheetApp.create(SHEET_NAME);
  }
  let sh = ss.getSheetByName(APP_FOLDER_NAME);
  if (!sh) sh = ss.insertSheet(APP_FOLDER_NAME);
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
