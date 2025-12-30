class ImportDataSystem {
  constructor() {
    this.selectedFile = null;
    this.importedData = null;
    this.validationErrors = [];
    this.allowedExtensions = ['.csv', '.txt'];
    this.maxFileSize = 10 * 1024 * 1024; // 10MB limit
    
    this.init();
  }

  init() {
    this.bindEvents();
    this.updateUI();
  }

  bindEvents() {
    // File input events
    document.getElementById('chooseFileBtn').addEventListener('click', () => {
      document.getElementById('fileInput').click();
    });

    document.getElementById('fileInput').addEventListener('change', (e) => {
      this.handleFileSelection(e.target.files[0]);
    });

    // Action button events
    document.getElementById('importBtn').addEventListener('click', () => {
      this.processFile();
    });

    document.getElementById('clearBtn').addEventListener('click', () => {
      this.clearAll();
    });

    // Drag and drop events
    const uploadArea = document.querySelector('.upload-area');
    
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('drag-over');
      
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        this.handleFileSelection(files[0]);
      }
    });
  }

  handleFileSelection(file) {
    if (!file) {
      this.clearFileSelection();
      return;
    }

    // Validate file type
    if (!this.isValidFileType(file)) {
      this.showNotification(
        'Invalid file type. Please select a CSV or TXT file only.', 
        'error'
      );
      this.clearFileSelection();
      return;
    }

    // Validate file size
    if (file.size > this.maxFileSize) {
      this.showNotification(
        'File size too large. Maximum allowed size is 10MB.', 
        'error'
      );
      this.clearFileSelection();
      return;
    }

    // File is valid
    this.selectedFile = file;
    this.updateFileDisplay();
    this.showFileInfo();
    this.updateUI();
    
    this.showNotification('File selected successfully. Click IMPORT to process.', 'success');
  }

  isValidFileType(file) {
    const fileName = file.name.toLowerCase();
    return this.allowedExtensions.some(ext => fileName.endsWith(ext));
  }

  updateFileDisplay() {
    const fileNameSpan = document.getElementById('selectedFileName');
    if (this.selectedFile) {
      fileNameSpan.textContent = this.selectedFile.name;
      fileNameSpan.style.color = '#28a745';
      fileNameSpan.style.fontWeight = 'bold';
    } else {
      fileNameSpan.textContent = 'No file selected';
      fileNameSpan.style.color = '#666';
      fileNameSpan.style.fontWeight = 'normal';
    }
  }

  showFileInfo() {
    if (!this.selectedFile) {
      document.getElementById('fileInfo').style.display = 'none';
      return;
    }

    const fileInfo = document.getElementById('fileInfo');
    const fileExtension = this.selectedFile.name.split('.').pop().toUpperCase();
    
    document.getElementById('fileNameDisplay').textContent = this.selectedFile.name;
    document.getElementById('fileSizeDisplay').textContent = this.formatFileSize(this.selectedFile.size);
    document.getElementById('fileTypeDisplay').textContent = `${fileExtension} File`;
    document.getElementById('fileModifiedDisplay').textContent = new Date(this.selectedFile.lastModified).toLocaleString();
    
    fileInfo.style.display = 'block';
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async processFile() {
    if (!this.selectedFile) {
      this.showNotification('Please select a file first.', 'warning');
      return;
    }

    this.showProcessingModal();
    
    try {
      // Simulate processing steps
      await this.updateProgress('Reading file...', 20);
      const fileContent = await this.readFile(this.selectedFile);
      
      await this.updateProgress('Parsing data...', 50);
      const parsedData = this.parseFileContent(fileContent);
      
      await this.updateProgress('Validating data...', 80);
      const validationResult = this.validateData(parsedData);
      
      await this.updateProgress('Generating results...', 100);
      
      this.importedData = validationResult;
      this.displayResults();
      
      this.hideProcessingModal();
      this.showNotification('File imported successfully!', 'success');
      
    } catch (error) {
      this.hideProcessingModal();
      this.showNotification(`Import failed: ${error.message}`, 'error');
      console.error('Import error:', error);
    }
  }

  readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        resolve(e.target.result);
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file);
    });
  }

  parseFileContent(content) {
    const fileExtension = this.selectedFile.name.split('.').pop().toLowerCase();
    
    if (fileExtension === 'csv') {
      return this.parseCSV(content);
    } else if (fileExtension === 'txt') {
      return this.parseTXT(content);
    } else {
      throw new Error('Unsupported file format');
    }
  }

  parseCSV(content) {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      throw new Error('File is empty');
    }

    const headers = this.parseCSVLine(lines[0]);
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const row = this.parseCSVLine(lines[i]);
      if (row.length > 0) {
        rows.push({
          rowNumber: i + 1,
          data: row,
          isValid: row.length === headers.length
        });
      }
    }

    return {
      headers,
      rows,
      fileType: 'CSV'
    };
  }

  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  parseTXT(content) {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      throw new Error('File is empty');
    }

    // For TXT files, assume tab-separated or space-separated values
    const delimiter = this.detectDelimiter(lines[0]);
    const headers = lines[0].split(delimiter).map(h => h.trim());
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(delimiter).map(cell => cell.trim());
      if (row.length > 0 && row[0] !== '') {
        rows.push({
          rowNumber: i + 1,
          data: row,
          isValid: row.length === headers.length
        });
      }
    }

    return {
      headers,
      rows,
      fileType: 'TXT'
    };
  }

  detectDelimiter(line) {
    const delimiters = ['\t', '|', ';', ' '];
    let bestDelimiter = '\t';
    let maxCount = 0;

    for (const delimiter of delimiters) {
      const count = (line.match(new RegExp('\\' + delimiter, 'g')) || []).length;
      if (count > maxCount) {
        maxCount = count;
        bestDelimiter = delimiter;
      }
    }

    return bestDelimiter;
  }

  validateData(parsedData) {
    const errors = [];
    const validRows = [];
    const invalidRows = [];

    parsedData.rows.forEach(row => {
      if (!row.isValid) {
        errors.push({
          row: row.rowNumber,
          message: `Column count mismatch. Expected ${parsedData.headers.length}, got ${row.data.length}`
        });
        invalidRows.push(row);
      } else {
        validRows.push(row);
      }
    });

    return {
      ...parsedData,
      validRows,
      invalidRows,
      errors,
      stats: {
        totalRows: parsedData.rows.length,
        validRows: validRows.length,
        errorRows: errors.length,
        totalColumns: parsedData.headers.length
      }
    };
  }

  displayResults() {
    if (!this.importedData) return;

    // Hide placeholder and show results
    document.getElementById('resultsPlaceholder').style.display = 'none';
    document.getElementById('resultsContent').style.display = 'block';

    // Update statistics
    const stats = this.importedData.stats;
    document.getElementById('totalRows').textContent = stats.totalRows;
    document.getElementById('totalColumns').textContent = stats.totalColumns;
    document.getElementById('validRows').textContent = stats.validRows;
    document.getElementById('errorRows').textContent = stats.errorRows;

    // Display data preview
    this.displayDataPreview();

    // Display errors if any
    if (this.importedData.errors.length > 0) {
      this.displayErrors();
    } else {
      document.getElementById('errorLog').style.display = 'none';
    }
  }

  displayDataPreview() {
    const table = document.getElementById('previewTable');
    const thead = document.getElementById('previewTableHead');
    const tbody = document.getElementById('previewTableBody');

    // Clear existing content
    thead.innerHTML = '';
    tbody.innerHTML = '';

    // Create header row
    const headerRow = thead.insertRow();
    this.importedData.headers.forEach(header => {
      const th = document.createElement('th');
      th.textContent = header || 'Unnamed Column';
      headerRow.appendChild(th);
    });

    // Create data rows (first 10 valid rows)
    const previewRows = this.importedData.validRows.slice(0, 10);
    previewRows.forEach(row => {
      const tr = tbody.insertRow();
      row.data.forEach(cell => {
        const td = tr.insertCell();
        td.textContent = cell || '';
      });
    });
  }

  displayErrors() {
    const errorLog = document.getElementById('errorLog');
    const errorList = document.getElementById('errorList');
    
    errorList.innerHTML = '';
    
    this.importedData.errors.forEach(error => {
      const errorItem = document.createElement('div');
      errorItem.className = 'error-item';
      errorItem.innerHTML = `
        <div class="error-row">Row ${error.row}:</div>
        <div class="error-message">${error.message}</div>
      `;
      errorList.appendChild(errorItem);
    });
    
    errorLog.style.display = 'block';
  }

  clearAll() {
    this.selectedFile = null;
    this.importedData = null;
    this.validationErrors = [];
    
    // Reset file input
    document.getElementById('fileInput').value = '';
    this.updateFileDisplay();
    document.getElementById('fileInfo').style.display = 'none';
    
    // Hide results and show placeholder
    document.getElementById('resultsContent').style.display = 'none';
    document.getElementById('resultsPlaceholder').style.display = 'flex';
    
    this.updateUI();
    this.showNotification('All data cleared.', 'success');
  }

  clearFileSelection() {
    this.selectedFile = null;
    document.getElementById('fileInput').value = '';
    this.updateFileDisplay();
    document.getElementById('fileInfo').style.display = 'none';
    this.updateUI();
  }

  updateUI() {
    const hasFile = this.selectedFile !== null;
    const hasResults = this.importedData !== null;
    
    document.getElementById('importBtn').disabled = !hasFile;
    document.getElementById('clearBtn').disabled = !hasFile && !hasResults;
  }

  showProcessingModal() {
    document.getElementById('processingModal').style.display = 'block';
  }

  hideProcessingModal() {
    document.getElementById('processingModal').style.display = 'none';
  }

  async updateProgress(status, percentage) {
    document.getElementById('processingStatus').textContent = status;
    document.getElementById('progressFill').style.width = percentage + '%';
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.getElementById('notificationContainer').appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 4000);
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  new ImportDataSystem();
  
  // Add fade-in animation
  document.body.classList.add('fade-in');
});