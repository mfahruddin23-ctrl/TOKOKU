/**
 * Utility untuk sinkronisasi data RAZKA JAYA dengan Google Spreadsheet
 * menggunakan Google Apps Script Webhook.
 */

export interface GoogleSheetsSyncConfig {
  webhookUrl: string;
  autoSyncOnSale: boolean;
  sheetNameProducts: string;
  sheetNameSales: string;
}

export const DEFAULT_SHEETS_CONFIG: GoogleSheetsSyncConfig = {
  webhookUrl: '',
  autoSyncOnSale: false,
  sheetNameProducts: 'Katalog_Barang',
  sheetNameSales: 'Laporan_Penjualan',
};

/**
 * Kode Google Apps Script siap pakai yang dapat disalin ke Google Sheets
 * melalui menu Extensions -> Apps Script.
 */
export const GOOGLE_APPS_SCRIPT_TEMPLATE = `// ====================================================================
// GOOGLE APPS SCRIPT - SINKRONISASI RAZKA JAYA STORE KE SPREADSHEET
// Salin seluruh kode ini ke: Google Sheets -> Extensions -> Apps Script
// Lalu Deploy as Web App (Who has access: Anyone)
// ====================================================================

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (action === "sync_sale") {
      var sheet = getOrCreateSheet(ss, "Penjualan_Kasir", [
        "Waktu", "No Faktur", "Pelanggan", "Kasir", "Metode Bayar", "Subtotal", "Diskon", "Total", "Status"
      ]);
      var sale = data.payload;
      sheet.appendRow([
        sale.date || new Date().toLocaleString("id-ID"),
        sale.invoiceNumber,
        sale.customerName,
        sale.cashierName,
        sale.paymentMethod,
        sale.subtotal,
        sale.discountTotal,
        sale.grandTotal,
        sale.paymentStatus
      ]);
      return createResponse({ success: true, message: "Penjualan berhasil dicatat di Spreadsheet" });
    }
    
    if (action === "sync_products") {
      var sheet = getOrCreateSheet(ss, "Stok_Barang", [
        "SKU", "Barcode", "Nama Barang", "Kategori", "Satuan", "Harga Beli", "Harga Jual", "Stok", "Total Nilai"
      ]);
      sheet.clearContents();
      sheet.appendRow([
        "SKU", "Barcode", "Nama Barang", "Kategori", "Satuan", "Harga Beli", "Harga Jual", "Stok", "Total Nilai"
      ]);
      
      var products = data.payload;
      var rows = [];
      for (var i = 0; i < products.length; i++) {
        var p = products[i];
        rows.push([
          p.sku,
          p.barcode,
          p.name,
          p.categoryName,
          p.unit,
          p.purchasePrice,
          p.sellingPrice,
          p.stock,
          (p.stock * p.purchasePrice)
        ]);
      }
      if (rows.length > 0) {
        sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
      }
      return createResponse({ success: true, count: rows.length, message: "Katalog produk berhasil disinkronkan" });
    }
    
    return createResponse({ success: false, message: "Action tidak dikenal" });
  } catch (error) {
    return createResponse({ success: false, error: error.toString() });
  }
}

function getOrCreateSheet(ss, sheetName, headers) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (headers && headers.length > 0) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#e2e8f0");
    }
  }
  return sheet;
}

function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

/**
 * Mengirim data ke Google Spreadsheet melalui Apps Script Webhook
 */
export async function syncToGoogleSheets(
  webhookUrl: string,
  action: 'sync_sale' | 'sync_products',
  payload: any
): Promise<{ success: boolean; message: string }> {
  if (!webhookUrl || !webhookUrl.startsWith('https://script.google.com/')) {
    throw new Error('URL Webhook Google Apps Script belum diisi atau tidak valid.');
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors', // Google Apps Script redirects require no-cors in browser
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action,
        payload,
        timestamp: new Date().toISOString(),
      }),
    });

    return {
      success: true,
      message: 'Permintaan sinkronisasi berhasil dikirim ke Google Spreadsheet.',
    };
  } catch (err) {
    console.error('Error syncing to Google Sheets:', err);
    throw new Error(err instanceof Error ? err.message : 'Gagal mengirim data ke Google Sheets');
  }
}
