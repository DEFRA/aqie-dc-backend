/**
 * Admin Import Routes
 * Provides UI and API endpoints for Excel file imports using CDP Uploader
 */

import Joi from 'joi'
import {
  initiateCdpUpload,
  getCdpUploadStatus
} from '../common/helpers/cdp-uploader.js'

/**
 * Initiate CDP Upload
 * Starts the CDP Uploader flow and returns uploadUrl and statusUrl
 */
const initiateImportController = {
  options: {
    validate: {
      payload: Joi.object({
        importType: Joi.string()
          .valid('appliances', 'fuels', 'both')
          .required(),
        appliancesSheet: Joi.string().optional(),
        fuelsSheet: Joi.string().optional()
      })
    }
  },
  handler: async (request, h) => {
    const { importType, appliancesSheet, fuelsSheet } = request.payload

    try {
      // Initiate upload with CDP Uploader
      const result = await initiateCdpUpload({
        metadata: {
          importType,
          appliancesSheet: appliancesSheet || 'Appliances',
          fuelsSheet: fuelsSheet || 'Fuels'
        }
      })

      request.logger.info({ uploadId: result.uploadId }, 'CDP upload initiated')

      return h
        .response({
          success: true,
          uploadId: result.uploadId,
          uploadUrl: result.uploadUrl,
          statusUrl: result.statusUrl
        })
        .code(200)
    } catch (error) {
      request.logger.error(error, 'Failed to initiate CDP upload')
      return h
        .response({
          success: false,
          message: 'Failed to initiate upload',
          error: error.message
        })
        .code(500)
    }
  }
}

/**
 * Check Upload Status
 * Polls CDP Uploader for upload status
 */
const checkUploadStatusController = {
  options: {
    validate: {
      query: Joi.object({
        statusUrl: Joi.string().uri().required()
      })
    }
  },
  handler: async (request, h) => {
    const { statusUrl } = request.query

    try {
      const status = await getCdpUploadStatus(statusUrl)

      return h
        .response({
          success: true,
          status
        })
        .code(200)
    } catch (error) {
      request.logger.error(error, 'Failed to get upload status')
      return h
        .response({
          success: false,
          message: 'Failed to get upload status',
          error: error.message
        })
        .code(500)
    }
  }
}

/**
 * Admin Import Page
 * Serves HTML page for file upload
 */
const adminImportPageController = {
  handler: (_request, h) => {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Import - AQIE DC Backend</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            font-size: 28px;
            margin-bottom: 8px;
        }
        .header p {
            opacity: 0.9;
            font-size: 14px;
        }
        .content {
            padding: 40px;
        }
        .form-group {
            margin-bottom: 24px;
        }
        label {
            display: block;
            font-weight: 600;
            margin-bottom: 8px;
            color: #333;
        }
        select, input[type="text"] {
            width: 100%;
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 6px;
            font-size: 14px;
            transition: border-color 0.3s;
        }
        select:focus, input[type="text"]:focus {
            outline: none;
            border-color: #667eea;
        }
        .upload-area {
            border: 3px dashed #e0e0e0;
            border-radius: 8px;
            padding: 40px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s;
            background: #f9f9f9;
        }
        .upload-area:hover {
            border-color: #667eea;
            background: #f0f0ff;
        }
        .upload-area.dragging {
            border-color: #667eea;
            background: #e8ebff;
        }
        .upload-icon {
            font-size: 48px;
            margin-bottom: 12px;
            color: #667eea;
        }
        input[type="file"] {
            display: none;
        }
        .btn {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }
        .btn:disabled {
            background: #ccc;
            cursor: not-allowed;
            transform: none;
        }
        .status {
            margin-top: 24px;
            padding: 16px;
            border-radius: 6px;
            display: none;
        }
        .status.success {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
        }
        .status.error {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
        }
        .status.info {
            background: #d1ecf1;
            border: 1px solid #bee5eb;
            color: #0c5460;
        }
        .progress {
            margin-top: 16px;
            height: 6px;
            background: #e0e0e0;
            border-radius: 3px;
            overflow: hidden;
            display: none;
        }
        .progress-bar {
            height: 100%;
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
            width: 0%;
            transition: width 0.3s;
            animation: progress-animation 2s ease-in-out infinite;
        }
        @keyframes progress-animation {
            0% { opacity: 0.6; }
            50% { opacity: 1; }
            100% { opacity: 0.6; }
        }
        .file-info {
            margin-top: 12px;
            padding: 12px;
            background: #f0f0f0;
            border-radius: 6px;
            display: none;
        }
        .template-links {
            background: #fff3cd;
            border: 1px solid #ffeeba;
            border-radius: 6px;
            padding: 16px;
            margin-bottom: 24px;
        }
        .template-links h3 {
            font-size: 14px;
            margin-bottom: 8px;
            color: #856404;
        }
        .template-links a {
            display: inline-block;
            margin-right: 12px;
            color: #667eea;
            text-decoration: none;
            font-weight: 500;
        }
        .template-links a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Excel Import</h1>
            <p>Upload Appliances and Fuels data</p>
        </div>
        <div class="content">
            <div class="template-links">
                <h3>📥 Download Templates:</h3>
                <a href="/templates/appliances-import-template.xlsx" download>Appliances Template</a>
                <a href="/templates/fuels-import-template.xlsx" download>Fuels Template</a>
                <a href="/templates/combined-import-template.xlsx" download>Combined Template</a>
            </div>

            <form id="importForm">
                <div class="form-group">
                    <label for="importType">Import Type</label>
                    <select id="importType" name="importType" required>
                        <option value="both">Both (Appliances & Fuels)</option>
                        <option value="appliances">Appliances Only</option>
                        <option value="fuels">Fuels Only</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="appliancesSheet">Appliances Sheet Name (optional)</label>
                    <input type="text" id="appliancesSheet" name="appliancesSheet" placeholder="Default: Appliances">
                </div>

                <div class="form-group">
                    <label for="fuelsSheet">Fuels Sheet Name (optional)</label>
                    <input type="text" id="fuelsSheet" name="fuelsSheet" placeholder="Default: Fuels">
                </div>

                <div class="form-group">
                    <label>Excel File</label>
                    <div class="upload-area" id="uploadArea">
                        <div class="upload-icon">📁</div>
                        <p><strong>Click to upload</strong> or drag and drop</p>
                        <p style="font-size: 12px; color: #999; margin-top: 8px;">Maximum file size: 10MB</p>
                    </div>
                    <input type="file" id="fileInput" accept=".xlsx,.xls" required>
                    <div class="file-info" id="fileInfo"></div>
                </div>

                <button type="submit" class="btn" id="uploadBtn">Upload and Import</button>
            </form>

            <div class="progress" id="progress">
                <div class="progress-bar"></div>
            </div>

            <div class="status" id="status"></div>
        </div>
    </div>

    <script>
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const fileInfo = document.getElementById('fileInfo');
        const form = document.getElementById('importForm');
        const uploadBtn = document.getElementById('uploadBtn');
        const status = document.getElementById('status');
        const progress = document.getElementById('progress');

        // Drag and drop
        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragging');
        });
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragging');
        });
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragging');
            if (e.dataTransfer.files.length) {
                fileInput.files = e.dataTransfer.files;
                showFileInfo(e.dataTransfer.files[0]);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) {
                showFileInfo(e.target.files[0]);
            }
        });

        function showFileInfo(file) {
            fileInfo.style.display = 'block';
            fileInfo.innerHTML = \`
                <strong>📄 \${file.name}</strong><br>
                <small>Size: \${(file.size / 1024 / 1024).toFixed(2)} MB</small>
            \`;
        }

        function showStatus(message, type) {
            status.className = \`status \${type}\`;
            status.innerHTML = message;
            status.style.display = 'block';
        }

        function showProgress() {
            progress.style.display = 'block';
        }

        function hideProgress() {
            progress.style.display = 'none';
        }

        async function pollStatus(statusUrl) {
            const maxAttempts = 60; // 60 attempts = 1 minute max
            let attempts = 0;

            while (attempts < maxAttempts) {
                try {
                    const response = await fetch(\`/admin/import/status?statusUrl=\${encodeURIComponent(statusUrl)}\`);
                    const data = await response.json();

                    if (data.success && data.status) {
                        const uploadStatus = data.status.uploadStatus;

                        if (uploadStatus === 'ready') {
                            hideProgress();
                            if (data.status.numberOfRejectedFiles > 0) {
                                showStatus('❌ File rejected: ' + (data.status.form?.file?.errorMessage || 'Virus detected or validation failed'), 'error');
                            } else {
                                showStatus('✅ Import completed successfully!', 'success');
                            }
                            uploadBtn.disabled = false;
                            return;
                        } else if (uploadStatus === 'pending') {
                            showStatus('⏳ Processing file (scanning for viruses)...', 'info');
                        }
                    }
                } catch (error) {
                    console.error('Status poll error:', error);
                }

                await new Promise(resolve => setTimeout(resolve, 1000));
                attempts++;
            }

            hideProgress();
            showStatus('⚠️ Status check timeout. Please refresh to verify import status.', 'error');
            uploadBtn.disabled = false;
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const file = fileInput.files[0];
            if (!file) {
                showStatus('❌ Please select a file', 'error');
                return;
            }

            const formData = new FormData();
            formData.append('importType', document.getElementById('importType').value);
            const appliancesSheet = document.getElementById('appliancesSheet').value;
            const fuelsSheet = document.getElementById('fuelsSheet').value;
            if (appliancesSheet) formData.append('appliancesSheet', appliancesSheet);
            if (fuelsSheet) formData.append('fuelsSheet', fuelsSheet);

            uploadBtn.disabled = true;
            showStatus('🚀 Initiating upload...', 'info');
            showProgress();

            try {
                // Step 1: Initiate upload
                const initiateResponse = await fetch('/admin/import/initiate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        importType: document.getElementById('importType').value,
                        appliancesSheet: appliancesSheet || undefined,
                        fuelsSheet: fuelsSheet || undefined
                    })
                });

                const initiateData = await initiateResponse.json();

                if (!initiateData.success) {
                    throw new Error(initiateData.message || 'Failed to initiate upload');
                }

                showStatus('📤 Uploading file to CDP Uploader...', 'info');

                // Step 2: Upload file to CDP Uploader
                const uploadFormData = new FormData();
                uploadFormData.append('file', file);

                const uploadResponse = await fetch(initiateData.uploadUrl, {
                    method: 'POST',
                    body: uploadFormData
                });

                if (!uploadResponse.ok) {
                    throw new Error('Upload to CDP Uploader failed');
                }

                showStatus('🔍 File uploaded. Scanning for viruses...', 'info');

                // Step 3: Poll for status
                await pollStatus(initiateData.statusUrl);

            } catch (error) {
                hideProgress();
                showStatus('❌ Error: ' + error.message, 'error');
                uploadBtn.disabled = false;
            }
        });
    </script>
</body>
</html>
    `
    return h.response(html).type('text/html')
  }
}

export {
  initiateImportController,
  checkUploadStatusController,
  adminImportPageController
}
