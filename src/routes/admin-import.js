/**
 * Admin import page and routes
 * Provides a web interface for uploading and importing Excel files
 */

// Admin upload page
const adminImportPage = {
  method: 'GET',
  path: '/admin/import',
  options: {
    auth: false // TODO: Add authentication when ready
  },
  handler: (request, h) => {
    return h
      .response(
        `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Data Import - AQIE DC Backend</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            background: #f5f5f5;
            padding: 20px;
          }
          
          .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          
          h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 28px;
          }
          
          .subtitle {
            color: #666;
            margin-bottom: 30px;
            font-size: 14px;
          }
          
          .info-box {
            background: #e8f4f8;
            border-left: 4px solid #0066cc;
            padding: 15px;
            margin-bottom: 30px;
            border-radius: 4px;
          }
          
          .info-box h3 {
            color: #0066cc;
            margin-bottom: 10px;
            font-size: 16px;
          }
          
          .info-box ul {
            margin-left: 20px;
            color: #333;
          }
          
          .info-box li {
            margin: 5px 0;
          }
          
          .form-group {
            margin-bottom: 25px;
          }
          
          label {
            display: block;
            margin-bottom: 8px;
            color: #333;
            font-weight: 500;
            font-size: 14px;
          }
          
          input[type="file"] {
            display: block;
            width: 100%;
            padding: 12px;
            border: 2px dashed #ccc;
            border-radius: 4px;
            cursor: pointer;
            background: #fafafa;
            transition: border-color 0.3s;
          }
          
          input[type="file"]:hover {
            border-color: #0066cc;
          }
          
          select {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
            background: white;
            cursor: pointer;
          }
          
          .checkbox-group {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          
          input[type="checkbox"] {
            width: 18px;
            height: 18px;
            cursor: pointer;
          }
          
          button {
            background: #0066cc;
            color: white;
            padding: 14px 30px;
            border: none;
            border-radius: 4px;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.3s;
            width: 100%;
          }
          
          button:hover {
            background: #0052a3;
          }
          
          button:disabled {
            background: #ccc;
            cursor: not-allowed;
          }
          
          .loading {
            display: none;
            text-align: center;
            margin-top: 20px;
            color: #666;
          }
          
          .loading.active {
            display: block;
          }
          
          .spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #0066cc;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          .result {
            margin-top: 30px;
            padding: 20px;
            border-radius: 4px;
            display: none;
          }
          
          .result.success {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
          }
          
          .result.error {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
          }
          
          .result.active {
            display: block;
          }
          
          .result h3 {
            margin-bottom: 10px;
          }
          
          .result pre {
            background: rgba(0,0,0,0.05);
            padding: 15px;
            border-radius: 4px;
            overflow-x: auto;
            font-size: 12px;
            margin-top: 10px;
          }
          
          .template-links {
            background: #fff9e6;
            border: 1px solid #ffd700;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 30px;
          }
          
          .template-links h3 {
            color: #856404;
            margin-bottom: 10px;
            font-size: 14px;
          }
          
          .template-links a {
            color: #0066cc;
            text-decoration: none;
            margin-right: 15px;
            font-size: 13px;
          }
          
          .template-links a:hover {
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>📊 Data Import</h1>
          <p class="subtitle">Upload Excel files to import Appliances and Fuels data</p>
          
          <div class="template-links">
            <h3>📝 Need a template?</h3>
            <a href="/admin/import/template/appliances" download>Download Appliances Template</a>
            <a href="/admin/import/template/fuels" download>Download Fuels Template</a>
            <a href="/admin/import/template/combined" download>Download Combined Template</a>
          </div>
          
          <div class="info-box">
            <h3>ℹ️ Before you begin:</h3>
            <ul>
              <li>Excel file must be .xlsx or .xls format</li>
              <li>Keep the header row (first row) unchanged</li>
              <li>Ensure all required fields are filled</li>
              <li>New records will be inserted, existing records (same ID) will be updated</li>
              <li>Maximum file size: 10MB</li>
            </ul>
          </div>
          
          <form id="importForm" enctype="multipart/form-data">
            <div class="form-group">
              <label for="file">Excel File *</label>
              <input type="file" id="file" name="file" accept=".xlsx,.xls" required>
              <small style="color: #666; margin-top: 5px; display: block;">Select the Excel file to import</small>
            </div>
            
            <div class="form-group">
              <label for="type">Import Type *</label>
              <select id="type" name="type" required>
                <option value="both">Both (Appliances & Fuels)</option>
                <option value="appliances">Appliances Only</option>
                <option value="fuels">Fuels Only</option>
              </select>
              <small style="color: #666; margin-top: 5px; display: block;">Choose what to import from the file</small>
            </div>
            
            <div class="form-group">
              <div class="checkbox-group">
                <input type="checkbox" id="verbose" name="verbose">
                <label for="verbose" style="margin: 0;">Show detailed import logs</label>
              </div>
            </div>
            
            <button type="submit" id="submitBtn">Import Data</button>
          </form>
          
          <div class="loading" id="loading">
            <div class="spinner"></div>
            <p>Processing import... This may take a few moments.</p>
          </div>
          
          <div class="result" id="result"></div>
        </div>
        
        <script>
          const form = document.getElementById('importForm');
          const submitBtn = document.getElementById('submitBtn');
          const loading = document.getElementById('loading');
          const result = document.getElementById('result');
          const fileInput = document.getElementById('file');
          
          // Update file input display
          fileInput.addEventListener('change', (e) => {
            const fileName = e.target.files[0]?.name;
            if (fileName) {
              console.log('File selected:', fileName);
            }
          });
          
          form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(form);
            
            // Show loading, hide result
            submitBtn.disabled = true;
            loading.classList.add('active');
            result.classList.remove('active');
            
            try {
              const response = await fetch('/import', {
                method: 'POST',
                body: formData
              });
              
              const data = await response.json();
              
              if (response.ok) {
                showResult('success', 'Import Successful!', data);
              } else {
                showResult('error', 'Import Failed', data);
              }
            } catch (error) {
              showResult('error', 'Import Failed', {
                message: error.message,
                error: 'Network or server error occurred'
              });
            } finally {
              submitBtn.disabled = false;
              loading.classList.remove('active');
            }
          });
          
          function showResult(type, title, data) {
            result.className = 'result active ' + type;
            
            let html = '<h3>' + title + '</h3>';
            
            if (data.results) {
              html += '<p><strong>Results:</strong></p>';
              
              if (data.results.appliances) {
                html += '<p>📦 Appliances: ';
                html += data.results.appliances.inserted + ' inserted, ';
                html += data.results.appliances.updated + ' updated, ';
                html += data.results.appliances.failed + ' failed</p>';
              }
              
              if (data.results.fuels) {
                html += '<p>⛽ Fuels: ';
                html += data.results.fuels.inserted + ' inserted, ';
                html += data.results.fuels.updated + ' updated, ';
                html += data.results.fuels.failed + ' failed</p>';
              }
            }
            
            if (data.message) {
              html += '<p>' + data.message + '</p>';
            }
            
            html += '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
            
            result.innerHTML = html;
          }
        </script>
      </body>
      </html>
    `
      )
      .type('text/html')
  }
}

// Template download routes
const downloadAppliancesTemplate = {
  method: 'GET',
  path: '/admin/import/template/appliances',
  options: {
    auth: false
  },
  handler: (request, h) => {
    return h.redirect('/templates/appliances-import-template.xlsx')
  }
}

const downloadFuelsTemplate = {
  method: 'GET',
  path: '/admin/import/template/fuels',
  options: {
    auth: false
  },
  handler: (request, h) => {
    return h.redirect('/templates/fuels-import-template.xlsx')
  }
}

const downloadCombinedTemplate = {
  method: 'GET',
  path: '/admin/import/template/combined',
  options: {
    auth: false
  },
  handler: (request, h) => {
    return h.redirect('/templates/combined-import-template.xlsx')
  }
}

export const adminImport = [
  adminImportPage,
  downloadAppliancesTemplate,
  downloadFuelsTemplate,
  downloadCombinedTemplate
]
