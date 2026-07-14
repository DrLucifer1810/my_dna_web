// Deploy as Web App, Accessible to "Anyone"
// This acts as a decentralized proxy to log Node data without giving out Google API keys.

const SHEET_NAME = 'GlobalStats';

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const pubKey = payload.public_key;
    if (!pubKey) {
      return ContentService.createTextOutput(JSON.stringify({ error: "Missing public_key" })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Validate signature here if needed (Optional for now)
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      // Setup Headers
      sheet.appendRow(["public_key", "intent", "seniority", "work_model", "top_skills", "salary_expectation", "updated_at", "raw_data"]);
    }
    
    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;
    
    // Find if node exists
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === pubKey) {
        rowIndex = i + 1;
        break;
      }
    }
    
    const now = new Date().toISOString();
    const skillsString = Array.isArray(payload.top_skills) ? payload.top_skills.join(", ") : "";
    
    const rowData = [
      pubKey,
      payload.intent || "Unknown",
      payload.seniority || "Unknown",
      payload.work_model || "Remote",
      skillsString,
      payload.salary_expectation || 0,
      now,
      JSON.stringify(payload)
    ];
    
    if (rowIndex > -1) {
      // Update existing
      sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
    } else {
      // Append new
      sheet.appendRow(rowData);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "ok", message: "Data received" })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error("Sheet not found");
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify({ total_nodes: 0, nodes: [] })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const nodes = [];
    for (let i = 1; i < data.length; i++) {
      nodes.push(JSON.parse(data[i][7])); // Parse raw JSON
    }
    
    const result = {
      updated_at: new Date().toISOString(),
      total_nodes: nodes.length,
      nodes: nodes
    };
    
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
