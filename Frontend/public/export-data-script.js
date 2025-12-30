class ExportDataSystem {
  constructor() {
    this.sampleData = [];
    this.filteredData = [];
    this.selectedColumns = new Set(['species', 'cultivar', 'country', 'state', 'city', 'moreInfo']);
    this.searchQuery = '';
    
    this.init();
  }

  init() {
    this.loadSampleData();
    this.bindEvents();
    this.renderTable();
    this.updateStats();
  }

  loadSampleData() {
    // Sample apple data with images
    this.sampleData = [
      {
        species: 'Malus domestica',
        cultivar: 'Honeycrisp',
        country: 'Canada',
        state: 'Ontario',
        city: 'Toronto',
        acno: 'AC001',
        county: 'York',
        image: '/placeholder.svg?height=40&width=40',
        description: 'Sweet and crisp apple variety',
        harvestDate: '2024-09-15',
        weight: '180g',
        color: 'Red with yellow stripes'
      },
      {
        species: 'Malus domestica',
        cultivar: 'Gala',
        country: 'Canada',
        state: 'British Columbia',
        city: 'Vancouver',
        acno: 'AC002',
        county: 'Fraser Valley',
        image: '/placeholder.svg?height=40&width=40',
        description: 'Mild and sweet apple',
        harvestDate: '2024-08-20',
        weight: '165g',
        color: 'Red and yellow'
      },
      {
        species: 'Malus domestica',
        cultivar: 'Granny Smith',
        country: 'Canada',
        state: 'Quebec',
        city: 'Montreal',
        acno: 'AC003',
        county: 'Montérégie',
        image: '/placeholder.svg?height=40&width=40',
        description: 'Tart green apple',
        harvestDate: '2024-10-05',
        weight: '175g',
        color: 'Bright green'
      },
      {
        species: 'Malus domestica',
        cultivar: 'Red Delicious',
        country: 'Canada',
        state: 'Alberta',
        city: 'Calgary',
        acno: 'AC004',
        county: 'Calgary Region',
        image: '/placeholder.svg?height=40&width=40',
        description: 'Classic red apple variety',
        harvestDate: '2024-09-10',
        weight: '190g',
        color: 'Deep red'
      },
      {
        species: 'Malus domestica',
        cultivar: 'Golden Delicious',
        country: 'Canada',
        state: 'Nova Scotia',
        city: 'Halifax',
        acno: 'AC005',
        county: 'Annapolis Valley',
        image: '/placeholder.svg?height=40&width=40',
        description: 'Sweet golden apple',
        harvestDate: '2024-09-25',
        weight: '170g',
        color: 'Golden yellow'
      },
      {
        species: 'Malus domestica',
        cultivar: 'Fuji',
        country: 'Canada',
        state: 'Saskatchewan',
        city: 'Saskatoon',
        acno: 'AC006',
        county: 'Central Saskatchewan',
        image: '/placeholder.svg?height=40&width=40',
        description: 'Sweet and crunchy',
        harvestDate: '2024-10-15',
        weight: '185g',
        color: 'Red with pink stripes'
      },
      {
        species: 'Malus domestica',
        cultivar: 'McIntosh',
        country: 'Canada',
        state: 'Ontario',
        city: 'Ottawa',
        acno: 'AC007',
        county: 'Ottawa Valley',
        image: '/placeholder.svg?height=40&width=40',
        description: 'Traditional Canadian apple',
        harvestDate: '2024-09-05',
        weight: '160g',
        color: 'Red and green'
      },
      {
        species: 'Malus domestica',
        cultivar: 'Braeburn',
        country: 'Canada',
        state: 'Manitoba',
        city: 'Winnipeg',
        acno: 'AC008',
        county: 'Red River Valley',
        image: '/placeholder.svg?height=40&width=40',
        description: 'Crisp and tangy',
        harvestDate: '2024-10-01',
        weight: '175g',
        color: 'Red and orange'
      }
    ];

    this.filteredData = [...this.sampleData];
  }

  bindEvents() {
    // Search functionality
    document.getElementById('searchInput').addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase();
      this.filterData();
    });

    document.getElementById('searchBtn').addEventListener('click', () => {
      this.filterData();
    });

    // Column selection
    document.querySelectorAll('.column-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        this.handleColumnToggle(e.target.id.replace('Check', ''), e.target.checked);
      });
    });

    // Select/Deselect all buttons
    document.getElementById('selectAllBtn').addEventListener('click', () => {
      this.selectAllColumns();
    });

    document.getElementById('deselectAllBtn').addEventListener('click', () => {
      this.deselectAllColumns();
    });

    // Export buttons
    document.getElementById('exportPdfBtn').addEventListener('click', () => {
      this.openExportModal('pdf');
    });

    document.getElementById('exportCsvBtn').addEventListener('click', () => {
      this.openExportModal('csv');
    });

    // Modal events
    document.getElementById('closeModal').addEventListener('click', () => {
      this.closeModal();
    });

    document.getElementById('cancelExport').addEventListener('click', () => {
      this.closeModal();
    });

    document.getElementById('confirmExport').addEventListener('click', () => {
      this.processExport();
    });

    // Filename format change
    document.querySelectorAll('input[name="filenameFormat"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const customInput = document.getElementById('customFilename');
        customInput.disabled = e.target.value !== 'custom';
      });
    });

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal')) {
        this.closeModal();
      }
    });
  }

  filterData() {
    if (!this.searchQuery) {
      this.filteredData = [...this.sampleData];
    } else {
      this.filteredData = this.sampleData.filter(item => {
        return Object.values(item).some(value => 
          value.toString().toLowerCase().includes(this.searchQuery)
        );
      });
    }
    
    this.renderTable();
    this.updateStats();
  }

  handleColumnToggle(columnName, isChecked) {
    if (isChecked) {
      this.selectedColumns.add(columnName);
    } else {
      this.selectedColumns.delete(columnName);
    }
    
    this.updateColumnVisibility();
    this.updateStats();
  }

  selectAllColumns() {
    this.selectedColumns = new Set(['species', 'cultivar', 'country', 'state', 'city', 'moreInfo']);
    
    document.querySelectorAll('.column-checkbox').forEach(checkbox => {
      checkbox.checked = true;
    });
    
    this.updateColumnVisibility();
    this.updateStats();
  }

  deselectAllColumns() {
    this.selectedColumns.clear();
    
    document.querySelectorAll('.column-checkbox').forEach(checkbox => {
      checkbox.checked = false;
    });
    
    this.updateColumnVisibility();
    this.updateStats();
  }

  updateColumnVisibility() {
    const columnMap = {
      'species': 0,
      'cultivar': 1,
      'country': 2,
      'state': 3,
      'city': 4,
      'moreInfo': 5
    };

    Object.keys(columnMap).forEach(columnName => {
      const columnIndex = columnMap[columnName];
      const isVisible = this.selectedColumns.has(columnName);
      
      // Toggle header visibility
      const headerCell = document.querySelector(`th:nth-child(${columnIndex + 1})`);
      if (headerCell) {
        headerCell.classList.toggle('column-hidden', !isVisible);
      }
      
      // Toggle data cell visibility
      document.querySelectorAll(`td:nth-child(${columnIndex + 1})`).forEach(cell => {
        cell.classList.toggle('column-hidden', !isVisible);
      });
    });
  }

  renderTable() {
    const tbody = document.getElementById('dataTableBody');
    tbody.innerHTML = '';

    if (this.filteredData.length === 0) {
      const row = tbody.insertRow();
      const cell = row.insertCell();
      cell.colSpan = 6;
      cell.textContent = 'No data found';
      cell.style.textAlign = 'center';
      cell.style.padding = '40px';
      cell.style.color = '#666';
      return;
    }

    this.filteredData.forEach(item => {
      const row = tbody.insertRow();

      // Species
      const speciesCell = row.insertCell();
      speciesCell.innerHTML = `
        <div class="data-cell">
          <div class="cell-content">${item.species}</div>
        </div>
      `;

      // Cultivar Name
      const cultivarCell = row.insertCell();
      cultivarCell.innerHTML = `
        <div class="data-cell">
          <img src="${item.image}" alt="${item.cultivar}" class="cell-image">
          <div class="cell-content">${item.cultivar}</div>
        </div>
      `;

      // Origin of Country
      const countryCell = row.insertCell();
      countryCell.innerHTML = `
        <div class="data-cell">
          <div class="cell-content">${item.country}</div>
        </div>
      `;

      // State/Province
      const stateCell = row.insertCell();
      stateCell.innerHTML = `
        <div class="data-cell">
          <div class="cell-content">${item.state}</div>
        </div>
      `;

      // City
      const cityCell = row.insertCell();
      cityCell.innerHTML = `
        <div class="data-cell">
          <div class="cell-content">${item.city}</div>
        </div>
      `;

      // More Info
      const moreInfoCell = row.insertCell();
      moreInfoCell.innerHTML = `
        <div class="more-info-cell" title="View more details">
          •••
        </div>
      `;
    });

    // Update column visibility after rendering
    this.updateColumnVisibility();
  }

  updateStats() {
    document.getElementById('totalRecords').textContent = this.sampleData.length;
    document.getElementById('filteredRecords').textContent = this.filteredData.length;
    document.getElementById('selectedColumns').textContent = this.selectedColumns.size;
    document.getElementById('selectedCount').textContent = this.selectedColumns.size;
  }

  openExportModal(format) {
    if (this.selectedColumns.size === 0) {
      this.showNotification('Please select at least one column to export.', 'warning');
      return;
    }

    if (this.filteredData.length === 0) {
      this.showNotification('No data available to export.', 'warning');
      return;
    }

    // Set the selected format
    document.querySelector(`input[name="exportFormat"][value="${format}"]`).checked = true;
    
    document.getElementById('exportModal').style.display = 'block';
  }

  closeModal() {
    document.getElementById('exportModal').style.display = 'none';
    document.getElementById('processingModal').style.display = 'none';
  }

  async processExport() {
    const format = document.querySelector('input[name="exportFormat"]:checked').value;
    const includeImages = document.getElementById('includeImages').checked;
    const includeHeaders = document.getElementById('includeHeaders').checked;
    const includeMetadata = document.getElementById('includeMetadata').checked;
    const filenameFormat = document.querySelector('input[name="filenameFormat"]:checked').value;
    const customFilename = document.getElementById('customFilename').value;

    this.closeModal();
    this.showProcessingModal();

    try {
      await this.updateProgress('Preparing export data...', 20);
      
      const exportData = this.prepareExportData();
      
      await this.updateProgress('Generating file...', 60);
      
      const filename = this.generateFilename(filenameFormat, customFilename);
      
      if (format === 'pdf') {
        await this.exportToPDF(exportData, filename, { includeImages, includeHeaders, includeMetadata });
      } else {
        await this.exportToCSV(exportData, filename, { includeHeaders, includeMetadata });
      }
      
      await this.updateProgress('Download ready!', 100);
      
      setTimeout(() => {
        this.closeModal();
        this.showNotification(`Export completed successfully! File: ${filename}`, 'success');
      }, 1000);
      
    } catch (error) {
      this.closeModal();
      this.showNotification(`Export failed: ${error.message}`, 'error');
      console.error('Export error:', error);
    }
  }

  prepareExportData() {
    const columnMap = {
      'species': 'Species',
      'cultivar': 'Cultivar Name',
      'country': 'Origin of Country',
      'state': 'State/Province',
      'city': 'City',
      'moreInfo': 'Additional Info'
    };

    const headers = Array.from(this.selectedColumns).map(col => columnMap[col]);
    
    const rows = this.filteredData.map(item => {
      const row = {};
      this.selectedColumns.forEach(col => {
        switch(col) {
          case 'species':
            row[columnMap[col]] = item.species;
            break;
          case 'cultivar':
            row[columnMap[col]] = item.cultivar;
            break;
          case 'country':
            row[columnMap[col]] = item.country;
            break;
          case 'state':
            row[columnMap[col]] = item.state;
            break;
          case 'city':
            row[columnMap[col]] = item.city;
            break;
          case 'moreInfo':
            row[columnMap[col]] = `ACNO: ${item.acno}, Weight: ${item.weight}, Color: ${item.color}`;
            break;
        }
      });
      return { ...row, _originalData: item };
    });

    return { headers, rows };
  }

  generateFilename(format, customName) {
    if (format === 'custom' && customName.trim()) {
      return customName.trim();
    }

    // Auto-generate filename using first item's data
    if (this.filteredData.length > 0) {
      const firstItem = this.filteredData[0];
      const species = firstItem.species.replace(/[^a-zA-Z0-9]/g, '');
      const county = firstItem.county.replace(/[^a-zA-Z0-9]/g, '');
      const acno = firstItem.acno;
      return `${species}_${county}_${acno}`;
    }

    return 'apple_export_' + new Date().toISOString().split('T')[0];
  }

  async exportToPDF(data, filename, options) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('Agriculture and Agri-Food Canada', 20, 20);
    doc.text('Apple Species Export Report', 20, 30);

    // Add metadata if requested
    if (options.includeMetadata) {
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Export Date: ${new Date().toLocaleDateString()}`, 20, 40);
      doc.text(`Total Records: ${data.rows.length}`, 20, 45);
      doc.text(`Selected Columns: ${data.headers.join(', ')}`, 20, 50);
    }

    // Prepare table data
    const tableData = data.rows.map(row => {
      return data.headers.map(header => row[header] || '');
    });

    // Add table
    doc.autoTable({
      head: options.includeHeaders ? [data.headers] : [],
      body: tableData,
      startY: options.includeMetadata ? 60 : 40,
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [248, 249, 250],
        textColor: [51, 51, 51],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [249, 249, 249]
      }
    });

    // Add images if requested and cultivar column is selected
    if (options.includeImages && this.selectedColumns.has('cultivar')) {
      await this.addImagesToPDF(doc, data.rows);
    }

    // Save the PDF
    doc.save(`${filename}.pdf`);
  }

  async addImagesToPDF(doc, rows) {
    // This is a simplified version - in a real implementation,
    // you would load actual images and add them to the PDF
    const pageHeight = doc.internal.pageSize.height;
    let yPosition = doc.lastAutoTable.finalY + 20;

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Sample Images:', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text('Note: Images would be embedded here in a full implementation', 20, yPosition);
  }

  async exportToCSV(data, filename, options) {
    let csvContent = '';

    // Add metadata if requested
    if (options.includeMetadata) {
      csvContent += `# Agriculture and Agri-Food Canada - Apple Species Export\n`;
      csvContent += `# Export Date: ${new Date().toLocaleDateString()}\n`;
      csvContent += `# Total Records: ${data.rows.length}\n`;
      csvContent += `# Selected Columns: ${data.headers.join(', ')}\n`;
      csvContent += `\n`;
    }

    // Add headers if requested
    if (options.includeHeaders) {
      csvContent += data.headers.map(header => `"${header}"`).join(',') + '\n';
    }

    // Add data rows
    data.rows.forEach(row => {
      const csvRow = data.headers.map(header => {
        const value = row[header] || '';
        return `"${value.toString().replace(/"/g, '""')}"`;
      }).join(',');
      csvContent += csvRow + '\n';
    });

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  showProcessingModal() {
    document.getElementById('processingModal').style.display = 'block';
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
  new ExportDataSystem();
  
  // Add fade-in animation
  document.body.classList.add('fade-in');
});