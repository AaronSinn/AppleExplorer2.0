class SearchListManager {
  constructor() {
    this.data = [];
    this.filteredData = [];
    this.currentView = 'list';
    this.sortColumn = 'species';
    this.sortDirection = 'asc';
    this.currentEditingId = null;
    this.currentImageUploadId = null;
    this.imageMapping = {}; // Store image mapping
    this.selectedItems = new Set(); // Track selected items
    this.locationData = []; // Store location data for cascading filters
    this.allKeywords = [];
    this.searchActive = false;
    this.maxShownItems = 8;
    this.selectedItem = -1;
    this.matched = [];
    this.searchBy = "none";
    
    this.init();
  }

  async init() {
    await this.loadImageMapping();
    await this.loadSampleData();
    this.bindEvents();
    this.renderData();
    this.populateFilterOptions();
    fetch("http://localhost:3000/apples/")
    .then(res => res.json())
    .then(data => {

      const keywords = new Set();

      //Searchable keywords
      data.forEach(item => {
        [item.profile.species, item.cultivarName, item.origin.country, item.origin.province, item.origin.city]
          .filter(Boolean)
          .forEach(val => keywords.add(val));
      });

      this.allKeywords = Array.from(keywords);
    })
  }

  async loadImageMapping() {
    try {
      const response = await fetch('/image-mapping.json');
      this.imageMapping = await response.json();
      console.log('Loaded image mapping for', Object.keys(this.imageMapping).length, 'images');
      console.log('Sample mapping:', Object.entries(this.imageMapping).slice(0, 3));
    } catch (err) {
      console.error('Failed to load image mapping:', err);
      this.imageMapping = {};
    }
  }

  async loadSampleData() {
    try {
      const response = await fetch("http://localhost:3000/apples");
      const apples = await response.json();

      // Map backend data to frontend format
      this.data = apples.map((item, idx) => {
        const accession = item.accession || '';
        let imageUrl = null;

        // First check if there's an imageId from GridFS (new uploads)
        if (item.imageId) {
          imageUrl = `http://localhost:3000/image/${item.imageId}`;
        } else {
          // Fall back to static image mapping for existing images
          const imageArray = this.imageMapping[accession] || null;
          const imageName = Array.isArray(imageArray) ? imageArray[0] : imageArray;
          if (imageName) {
            imageUrl = `http://localhost:3000/images/${imageName}`;
          }
        }

        console.log(`Apple ${accession}: imageId=${item.imageId}, imageUrl=${imageUrl}`);

        return {
          id: item._id || idx + 1,
          species: item.profile?.species || item.species || "",
          cultivar: item.cultivarName || item.cultivar || "",
          country: item.origin?.country || item.country || "",
          state: item.origin?.province || item.state || "",
          city: item.origin?.city || item.city || "",
          image: imageUrl,
          notes: item.notes || "",
          accession: accession
        };
      });

      this.filteredData = [...this.data];
      this.sortData();
    } catch (err) {
      this.showNotification("Failed to load data from server", "error");
      this.data = [];
      this.filteredData = [];
    }
  }

  bindEvents() {
    // Search functionality
    document.getElementById('searchInput').addEventListener('input', (e) => {
      this.handleSearch(e.target.value.toLowerCase().trim());
    });

    // View toggle
    document.getElementById('listViewBtn').addEventListener('click', () => {
      this.switchView('list');
    });

    document.getElementById('pictureViewBtn').addEventListener('click', () => {
      this.switchView('picture');
    });

    // Picture view sorting controls
    document.getElementById('sortSelect').addEventListener('change', (e) => {
      this.sortColumn = e.target.value;
      this.sortData();
      this.renderData();
    });

    document.getElementById('sortOrderBtn').addEventListener('click', () => {
      this.toggleSortOrder();
    });

    // Export buttons (Picture View)
    document.getElementById('exportPdfBtn').addEventListener('click', () => {
      this.exportToPDF();
    });

    document.getElementById('exportCsvBtn').addEventListener('click', () => {
      this.exportToCSV();
    });

    // Export buttons (List View)
    document.getElementById('listExportPdfBtn').addEventListener('click', () => {
      this.exportToPDF();
    });

    document.getElementById('listExportCsvBtn').addEventListener('click', () => {
      this.exportToCSV();
    });

    // List view sorting
    document.getElementById('listSortSelect').addEventListener('change', (e) => {
      this.sortColumn = e.target.value;
      this.sortData();
      this.renderData();
    });

    document.getElementById('listSortOrderBtn').addEventListener('click', () => {
      this.toggleListSortOrder();
    });

    // Filter panel toggle
    document.getElementById('filterBtn').addEventListener('click', () => {
      this.toggleFilterPanel();
    });

    // Filter actions
    document.getElementById('applyFilters').addEventListener('click', () => {
      this.applyFilters();
    });

    document.getElementById('clearFilters').addEventListener('click', () => {
      this.clearFilters();
    });

    // Cascading filter events
    document.getElementById('countryFilter').addEventListener('change', () => {
      this.updateStateFilter();
      this.updateCityFilter();
    });

    document.getElementById('stateFilter').addEventListener('change', () => {
      this.updateCountryFilter();
      this.updateCityFilter();
    });

    document.getElementById('cityFilter').addEventListener('change', () => {
      this.updateCountryFilter();
      this.updateStateFilter();
    });

    // Import/Export
    document.getElementById('importBtn').addEventListener('click', () => {
      this.handleImport();
    });

    document.getElementById('exportBtn').addEventListener('click', () => {
      this.handleExport();
    });

    document.getElementById('importFile').addEventListener('change', (e) => {
      this.processImportFile(e.target.files[0]);
    });

    // Add entry
    document.getElementById('addEntryBtn').addEventListener('click', () => {
      this.openEntryModal();
    });

    // Bulk actions
    document.getElementById('selectAll').addEventListener('change', (e) => {
      this.handleSelectAll(e.target.checked);
    });

    document.getElementById('deleteSelectedBtn').addEventListener('click', () => {
      this.deleteSelectedItems();
    });

    document.getElementById('exportSelectedPdfBtn').addEventListener('click', () => {
      this.exportSelectedToPDF();
    });

    document.getElementById('exportSelectedCsvBtn').addEventListener('click', () => {
      this.exportSelectedToCSV();
    });

    document.getElementById('clearSelectionBtn').addEventListener('click', () => {
      this.clearSelection();
    });

    // Modal events
    document.querySelectorAll('.close').forEach(closeBtn => {
      closeBtn.addEventListener('click', (e) => {
        this.closeModal(e.target.closest('.modal'));
      });
    });

    document.getElementById('saveEntry').addEventListener('click', () => {
      this.saveEntry();
    });

    document.getElementById('cancelEntry').addEventListener('click', () => {
      this.closeModal(document.getElementById('entryModal'));
    });

    document.getElementById('saveImage').addEventListener('click', () => {
      this.saveImage();
    });

    document.getElementById('cancelImage').addEventListener('click', () => {
      this.closeModal(document.getElementById('imageModal'));
    });

    // Image preview
    document.getElementById('entryImage').addEventListener('change', (e) => {
      this.previewImage(e.target.files[0], 'imagePreview');
    });

    document.getElementById('imageUpload').addEventListener('change', (e) => {
      this.previewImage(e.target.files[0], 'uploadPreview');
    });

    // Table sorting
    document.querySelectorAll('.sortable').forEach(header => {
      header.addEventListener('click', () => {
        this.handleSort(header.dataset.column);
      });
    });

    //search by column
    addEventListener("change", (event) => {
      this.searchBy = event.target.value;
      this.handleSearch(document.getElementById('searchInput').value.toLowerCase().trim());
     })


    //make search active when clicked
    document.getElementById('searchInput').addEventListener('click', () => {
      this.searchActive = true;
      this.buildDropdown();
    });

    document.addEventListener("click", (e) => {
      //clickable suggestions
      if (e.target.classList.contains("suggestion-item")) {
        //add clicked text to search box
        const value = e.target.getAttribute("data-value");
        document.getElementById('searchInput').value = value;
        //Send input as if user had typed it
        document.getElementById('searchInput').dispatchEvent(new Event("input"));
      }
      if(!(e.target.id == ('searchInput'))){
        this.searchActive = false;
        document.getElementById("suggestionsBox").style.display = "none";
      }      
    });

    document.addEventListener('keydown', (e) => {
      if(!this.searchActive){
        return;
      }
      if(e.key=='Enter'){
        console.log("logged enter");
        const selectedItemText = document.getElementById('searchInput').value;
        document.getElementById('searchInput').dispatchEvent(new Event("input"));
        document.getElementById('searchInput').value = selectedItemText;
      }
      else if(e.key=='ArrowUp'){
        if(-1 < this.selectedItem - 1 && this.selectedItem - 1 < this.matched.length){
          this.selectedItem--;
          document.getElementById('searchInput').value = this.matched[this.selectedItem];
        }
      }
      else if(e.key=='ArrowDown'){
        if(-1 < this.selectedItem + 1 && this.selectedItem + 1 < this.matched.length){
          this.selectedItem++;
          document.getElementById('searchInput').value = this.matched[this.selectedItem];
        }
      }

    });

    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal')) {
        this.closeModal(e.target);
      }
    });
  }

  filterData(searchTerm){
    switch(this.searchBy){
      case "none":
        this.filteredData = this.data.filter(item => 
        item.species.toLowerCase().includes(searchTerm) ||
        item.cultivar.toLowerCase().includes(searchTerm) ||
        item.country.toLowerCase().includes(searchTerm) ||
        (item.state && item.state.toLowerCase().includes(searchTerm)) ||
        (item.city && item.city.toLowerCase().includes(searchTerm)) ||
        (item.notes && item.notes.toLowerCase().includes(searchTerm))
          );
        break;
      case "species":
        this.filteredData = this.data.filter(item => item.species.toLowerCase().includes(searchTerm));
        break;
      case "cultivar name":
        this.filteredData = this.data.filter(item => item.cultivar.toLowerCase().includes(searchTerm));
        break;
      case "country":
        this.filteredData = this.data.filter(item => item.country.toLowerCase().includes(searchTerm));
        break;
      case "state/province":
        this.filteredData = this.data.filter(item => item.state && item.state.toLowerCase().includes(searchTerm));
        break;
      case "city":
        this.filteredData = this.data.filter(item => item.city && item.city.toLowerCase().includes(searchTerm));
        break;
    }
    
  }

  handleSearch(query) {
    if (!query.trim()) {
      this.filteredData = [...this.data];

    } else {
      this.searchActive = true;
      const searchTerm = query.toLowerCase();
      this.filterData(searchTerm);

      this.matched = this.allKeywords.filter(k => k.toLowerCase().includes(query))
      //show first 8 suggestions
      .slice(0, this.maxShownItems);
   

      //index of current selected item
      this.selected = -1;

      //hides box if no matches
      if (this.matched.length === 0) {
        document.getElementById("suggestionsBox").style.display = "none";
        return;
      }

      //build clickable dropdown
      this.buildDropdown();
      
    }
    
    // Log the search if it's a non-empty query
    if (query.trim()) {
      this.logSearch(query.trim(), this.filteredData.length);
    }
    this.sortData();
    this.renderData();
  }

  buildDropdown(){
    if(this.matched.length == 0){
      return;
    }
    document.getElementById("suggestionsBox").innerHTML = this.matched
      .map(item => `<div class="suggestion-item" data-value="${item}">${item}</div>`)
      .join("");
      document.getElementById("suggestionsBox").style.display = "block";

  }

  async logSearch(searchQuery, resultsCount) {
    try {
      // Get current user from auth manager
      const authManager = window.authManager;
      if (!authManager || !authManager.isAuthenticated()) {
        return; // Don't log searches for unauthenticated users
      }
      
      const user = authManager.getUser();
      if (!user) return;
      
      // Get current filter values
      const filters = {
        species: document.getElementById('species-filter')?.value || '',
        cultivar: document.getElementById('cultivar-filter')?.value || '',
        country: document.getElementById('country-filter')?.value || '',
        state: document.getElementById('state-filter')?.value || '',
        city: document.getElementById('city-filter')?.value || '',
        skinColor: document.getElementById('skin-color-filter')?.value || '',
        fleshColor: document.getElementById('flesh-color-filter')?.value || '',
        use: document.getElementById('use-filter')?.value || ''
      };
      
      // Remove empty filters
      Object.keys(filters).forEach(key => {
        if (!filters[key]) delete filters[key];
      });
      
      const logData = {
        userId: user._id || user.id,
        userName: user.fullName || user.name,
        searchQuery,
        filters,
        resultsCount,
        ipAddress: '', // Will be set by server
        userAgent: navigator.userAgent
      };
      
      await fetch('/api/search-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authManager.getToken()}`
        },
        body: JSON.stringify(logData)
      });
    } catch (error) {
      console.error('Failed to log search:', error);
      // Don't show error to user as this is background logging
    }
  }

  switchView(view) {
    this.currentView = view;
    
    // Update button states
    document.getElementById('listViewBtn').classList.toggle('active', view === 'list');
    document.getElementById('pictureViewBtn').classList.toggle('active', view === 'picture');
    
    // Show/hide views
    document.getElementById('listView').style.display = view === 'list' ? 'block' : 'none';
    document.getElementById('pictureView').style.display = view === 'picture' ? 'block' : 'none';
    
    // Show/hide export controls based on view
    document.getElementById('pictureExportControls').style.display = view === 'picture' ? 'block' : 'none';
    document.getElementById('listExportControls').style.display = view === 'list' ? 'block' : 'none';
    
    this.renderData();
  }

  sortData() {
    this.filteredData.sort((a, b) => {
      let aVal = a[this.sortColumn] || '';
      let bVal = b[this.sortColumn] || '';
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (this.sortDirection === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
  }

  toggleSortOrder() {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    const btn = document.getElementById('sortOrderBtn');
    btn.textContent = this.sortDirection === 'asc' ? '↑ Ascending' : '↓ Descending';
    btn.dataset.order = this.sortDirection;
    
    this.sortData();
    this.renderData();
  }

  toggleListSortOrder() {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    const btn = document.getElementById('listSortOrderBtn');
    btn.textContent = this.sortDirection === 'asc' ? '↑ Ascending' : '↓ Descending';
    btn.dataset.order = this.sortDirection;
    
    this.sortData();
    this.renderData();
  }

  toggleFilterPanel() {
    const panel = document.getElementById('filterPanel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  }

  applyFilters() {
    const species = document.getElementById('speciesFilter').value;
    const cultivar = document.getElementById('cultivarFilter').value;
    const country = document.getElementById('countryFilter').value;
    const state = document.getElementById('stateFilter').value;
    const city = document.getElementById('cityFilter').value;

    this.filteredData = this.data.filter(item => {
      return (!species || item.species === species) &&
             (!cultivar || item.cultivar === cultivar) &&
             (!country || item.country === country) &&
             (!state || item.state === state) &&
             (!city || item.city === city);
    });

    // Log filter-based search
    const activeFilters = [];
    if (species) activeFilters.push(`Species: ${species}`);
    if (cultivar) activeFilters.push(`Cultivar: ${cultivar}`);
    if (country) activeFilters.push(`Country: ${country}`);
    if (state) activeFilters.push(`State: ${state}`);
    if (city) activeFilters.push(`City: ${city}`);
    
    if (activeFilters.length > 0) {
      const searchQuery = `Filter search: ${activeFilters.join(', ')}`;
      this.logSearch(searchQuery, this.filteredData.length);
    }

    this.sortData();
    this.renderData();
    this.showNotification('Filters applied successfully', 'success');
  }

  clearFilters() {
    document.getElementById('speciesFilter').value = '';
    document.getElementById('cultivarFilter').value = '';
    document.getElementById('countryFilter').value = '';
    document.getElementById('stateFilter').value = '';
    document.getElementById('cityFilter').value = '';
    
    // Reset all cascading filters
    this.updateCountryFilter();
    this.updateStateFilter();
    this.updateCityFilter();
    
    this.filteredData = [...this.data];
    this.sortData();
    this.renderData();
    this.showNotification('Filters cleared', 'success');
  }

  populateFilterOptions() {
    const species = [...new Set(this.data.map(item => item.species))];
    const cultivars = [...new Set(this.data.map(item => item.cultivar))];
    
    // Store all location data for cascading filters
    this.locationData = this.data.map(item => ({
      country: item.country,
      state: item.state,
      city: item.city
    }));

    this.populateSelect('speciesFilter', species);
    this.populateSelect('cultivarFilter', cultivars);
    
    // Initialize all location filters
    this.updateCountryFilter();
    this.updateStateFilter();
    this.updateCityFilter();
  }

  populateSelect(selectId, options) {
    const select = document.getElementById(selectId);
    const currentValue = select.value;
    
    // Clear existing options except the first one
    while (select.children.length > 1) {
      select.removeChild(select.lastChild);
    }
    
    options.forEach(option => {
      if (option) {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        select.appendChild(optionElement);
      }
    });
    
    select.value = currentValue;
  }

  updateCountryFilter() {
    const selectedState = document.getElementById('stateFilter').value;
    const selectedCity = document.getElementById('cityFilter').value;
    const countryFilter = document.getElementById('countryFilter');
    const currentCountry = countryFilter.value;
    
    let countries;
    if (selectedState && selectedCity) {
      // Filter countries based on both state and city
      countries = [...new Set(this.locationData
        .filter(item => 
          item.state === selectedState && 
          item.city === selectedCity && 
          item.country)
        .map(item => item.country))];
    } else if (selectedState) {
      // Filter countries based on state only
      countries = [...new Set(this.locationData
        .filter(item => item.state === selectedState && item.country)
        .map(item => item.country))];
    } else if (selectedCity) {
      // Filter countries based on city only
      countries = [...new Set(this.locationData
        .filter(item => item.city === selectedCity && item.country)
        .map(item => item.country))];
    } else {
      // Show all countries
      countries = [...new Set(this.locationData
        .filter(item => item.country)
        .map(item => item.country))];
    }
    
    // Clear and repopulate country filter
    countryFilter.innerHTML = '<option value="">All Countries</option>';
    countries.forEach(country => {
      const option = document.createElement('option');
      option.value = country;
      option.textContent = country;
      countryFilter.appendChild(option);
    });
    
    // Restore selection if still valid
    if (countries.includes(currentCountry)) {
      countryFilter.value = currentCountry;
    }
  }

  updateStateFilter() {
    const selectedCountry = document.getElementById('countryFilter').value;
    const selectedCity = document.getElementById('cityFilter').value;
    const stateFilter = document.getElementById('stateFilter');
    const currentState = stateFilter.value;
    
    let states;
    if (selectedCountry && selectedCity) {
      // Filter states based on both country and city
      states = [...new Set(this.locationData
        .filter(item => 
          item.country === selectedCountry && 
          item.city === selectedCity && 
          item.state)
        .map(item => item.state))];
    } else if (selectedCountry) {
      // Filter states based on country only
      states = [...new Set(this.locationData
        .filter(item => item.country === selectedCountry && item.state)
        .map(item => item.state))];
    } else if (selectedCity) {
      // Filter states based on city only
      states = [...new Set(this.locationData
        .filter(item => item.city === selectedCity && item.state)
        .map(item => item.state))];
    } else {
      // Show all states
      states = [...new Set(this.locationData
        .filter(item => item.state)
        .map(item => item.state))];
    }
    
    // Clear and repopulate state filter
    stateFilter.innerHTML = '<option value="">All States/Provinces</option>';
    states.forEach(state => {
      const option = document.createElement('option');
      option.value = state;
      option.textContent = state;
      stateFilter.appendChild(option);
    });
    
    // Restore selection if still valid
    if (states.includes(currentState)) {
      stateFilter.value = currentState;
    }
  }

  updateCityFilter() {
    const selectedCountry = document.getElementById('countryFilter').value;
    const selectedState = document.getElementById('stateFilter').value;
    const cityFilter = document.getElementById('cityFilter');
    const currentCity = cityFilter.value;
    
    let cities;
    if (selectedCountry && selectedState) {
      // Filter cities based on both country and state
      cities = [...new Set(this.locationData
        .filter(item => 
          item.country === selectedCountry && 
          item.state === selectedState && 
          item.city)
        .map(item => item.city))];
    } else if (selectedCountry) {
      // Filter cities based on country only
      cities = [...new Set(this.locationData
        .filter(item => item.country === selectedCountry && item.city)
        .map(item => item.city))];
    } else if (selectedState) {
      // Filter cities based on state only
      cities = [...new Set(this.locationData
        .filter(item => item.state === selectedState && item.city)
        .map(item => item.city))];
    } else {
      // Show all cities
      cities = [...new Set(this.locationData
        .filter(item => item.city)
        .map(item => item.city))];
    }
    
    // Clear and repopulate city filter
    cityFilter.innerHTML = '<option value="">All Cities</option>';
    cities.forEach(city => {
      const option = document.createElement('option');
      option.value = city;
      option.textContent = city;
      cityFilter.appendChild(option);
    });
    
    // Restore selection if still valid
    if (cities.includes(currentCity)) {
      cityFilter.value = currentCity;
    }
  }

  handleSort(column) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.sortData();
    this.renderData();
    this.updateSortIndicators();
  }

  updateSortIndicators() {
    document.querySelectorAll('.sort-arrow').forEach(arrow => {
      arrow.textContent = '↕';
    });

    if (this.sortColumn) {
      const header = document.querySelector(`[data-column="${this.sortColumn}"] .sort-arrow`);
      if (header) {
        header.textContent = this.sortDirection === 'asc' ? '↑' : '↓';
      }
    }
  }

  renderData() {
    if (this.currentView === 'list') {
      this.renderTableView();
    } else {
      this.renderPictureView();
    }
  }

  renderTableView() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    if (this.filteredData.length === 0) {
      const row = tbody.insertRow();
      const cell = row.insertCell();
      cell.colSpan = 8; // Updated for checkbox column
      cell.textContent = 'No data found';
      cell.style.textAlign = 'center';
      cell.style.padding = '40px';
      cell.style.color = '#666';
      return;
    }

    this.filteredData.forEach(item => {
      const row = tbody.insertRow();
      
      // Checkbox
      const checkboxCell = row.insertCell();
      checkboxCell.className = 'checkbox-cell';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'row-checkbox';
      checkbox.value = item.id;
      checkbox.checked = this.selectedItems.has(item.id);
      checkbox.addEventListener('change', (e) => {
        this.handleRowSelection(item.id, e.target.checked);
      });
      checkboxCell.appendChild(checkbox);
      
      // Species
      const speciesCell = row.insertCell();
      speciesCell.textContent = item.species;
      
      // Cultivar
      const cultivarCell = row.insertCell();
      cultivarCell.textContent = item.cultivar;
      
      // Country
      const countryCell = row.insertCell();
      countryCell.textContent = item.country;
      
      // State
      const stateCell = row.insertCell();
      stateCell.textContent = item.state || '-';
      
      // City
      const cityCell = row.insertCell();
      cityCell.textContent = item.city || '-';
      
      // Image
      const imageCell = row.insertCell();
      imageCell.className = 'image-cell';
      if (item.image) {
        const img = document.createElement('img');
        img.src = item.image;
        img.className = 'table-image';
        img.onclick = () => this.openImageModal(item.id);
        imageCell.appendChild(img);
      } else {
        const uploadBtn = document.createElement('button');
        uploadBtn.textContent = 'Upload';
        uploadBtn.className = 'upload-image-btn';
        uploadBtn.onclick = () => this.openImageModal(item.id);
        imageCell.appendChild(uploadBtn);
      }
      
      // More Info
      const moreInfoCell = row.insertCell();
      moreInfoCell.className = 'image-cell';
      const moreInfoBtn = document.createElement('button');
      moreInfoBtn.textContent = '•••';
      moreInfoBtn.className = 'more-info-btn';
      moreInfoBtn.onclick = () => this.openEntryModal(item);
      moreInfoCell.appendChild(moreInfoBtn);
    });

    this.updateBulkActionsVisibility();
  }

  renderPictureView() {
    const grid = document.getElementById('pictureGrid');
    const titleElement = document.getElementById('pictureViewTitle');
    const countElement = document.getElementById('totalCount');
    
    // Update title and count
    const appleCount = this.filteredData.filter(item => item.species.includes('Malus')).length;
    const pearCount = this.filteredData.filter(item => item.species.includes('Pyrus')).length;
    
    titleElement.textContent = `Agricultural Species Information (${appleCount} Apple${appleCount !== 1 ? 's' : ''}, ${pearCount} Pear${pearCount !== 1 ? 's' : ''})`;
    countElement.textContent = `${this.filteredData.length} total entries`;
    
    grid.innerHTML = '';

    if (this.filteredData.length === 0) {
      grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #666;">No data found</div>';
      return;
    }

    this.filteredData.forEach(item => {
      const card = document.createElement('div');
      card.className = 'picture-card';
      
      const imageContainer = document.createElement('div');
      imageContainer.className = 'picture-card-image';
      
      if (item.image) {
        const img = document.createElement('img');
        img.src = item.image;
        img.onclick = () => this.openImageModal(item.id);
        imageContainer.appendChild(img);
      } else {
        imageContainer.textContent = 'No Image Available';
        imageContainer.style.cursor = 'pointer';
        imageContainer.onclick = () => this.openImageModal(item.id);
      }
      
      const content = document.createElement('div');
      content.className = 'picture-card-content';
      
      content.innerHTML = `
        <h4>${item.cultivar}</h4>
        <div class="info-row">
          <span class="info-label">Species:</span>
          <span class="info-value">${item.species}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Origin:</span>
          <span class="info-value">${item.country}</span>
        </div>
        <div class="info-row">
          <span class="info-label">State:</span>
          <span class="info-value">${item.state || 'Not specified'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">City:</span>
          <span class="info-value">${item.city || 'Not specified'}</span>
        </div>
        ${item.notes ? `
          <div class="notes-section">
            <div class="notes-label">Notes:</div>
            <div class="notes-text">${item.notes}</div>
          </div>
        ` : ''}
      `;
      
      content.onclick = () => this.openEntryModal(item);
      content.style.cursor = 'pointer';
      
      card.appendChild(imageContainer);
      card.appendChild(content);
      grid.appendChild(card);
    });
  }

  exportToPDF() {
    console.log('PDF export function called');
    
    // Wait a moment for jsPDF to load if it's still loading
    const checkJsPDF = () => {
      console.log('Checking for jsPDF availability...');
      console.log('Available PDF libraries:', {
        windowJsPDF: typeof window.jsPDF,
        globalJsPDF: typeof jsPDF,
        windowJspdf: typeof window.jspdf
      });

      // Get jsPDF constructor - try different ways it might be exposed
      let PDFConstructor;
      
      if (typeof window.jsPDF !== 'undefined') {
        PDFConstructor = window.jsPDF;
        console.log('Using window.jsPDF');
      } else if (typeof jsPDF !== 'undefined') {
        PDFConstructor = jsPDF;
        console.log('Using global jsPDF');
      } else if (typeof window.jspdf !== 'undefined' && window.jspdf.jsPDF) {
        PDFConstructor = window.jspdf.jsPDF;
        console.log('Using window.jspdf.jsPDF');
      } else {
        return null;
      }
      
      return PDFConstructor;
    };

    let PDFConstructor = checkJsPDF();
    
    if (!PDFConstructor) {
      console.log('jsPDF not immediately available, waiting 2 seconds...');
      this.showNotification('Loading PDF library, please wait...', 'info');
      
      setTimeout(() => {
        PDFConstructor = checkJsPDF();
        if (!PDFConstructor) {
          console.log('jsPDF still not available, waiting another 3 seconds...');
          setTimeout(() => {
            PDFConstructor = checkJsPDF();
            if (!PDFConstructor) {
              console.error('jsPDF library not found after waiting');
              this.showNotification('PDF library failed to load. Please refresh the page and try again.', 'error');
              return;
            }
            this.generatePDF(PDFConstructor);
          }, 3000);
          return;
        }
        this.generatePDF(PDFConstructor);
      }, 2000);
      return;
    }
    
    this.generatePDF(PDFConstructor);
  }

  generatePDF(PDFConstructor) {
    try {
      console.log('Creating PDF document...');
      const doc = new PDFConstructor();
      
      // Title
      doc.setFontSize(20);
      doc.text('Apple Explorer Export Report', 20, 20);
      
      // Date
      doc.setFontSize(12);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 30);
      doc.text(`Total entries: ${this.filteredData.length}`, 20, 40);
      
      let yPosition = 60;
      
      console.log(`Processing ${this.filteredData.length} entries for PDF...`);
      
      this.filteredData.forEach((item, index) => {
        // Check if we need a new page
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }
        
        // Entry header
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(`${index + 1}. ${item.cultivar || 'Unknown'}`, 20, yPosition);
        
        // Entry details - only the specific fields requested
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        yPosition += 10;
        
        // Accession
        if (item.accession) {
          doc.text(`Accession: ${item.accession}`, 25, yPosition);
          yPosition += 7;
        }
        
        // Species
        if (item.species) {
          doc.text(`Species: ${item.species}`, 25, yPosition);
          yPosition += 7;
        }
        
        // Cultivar Name (already in header, but add for completeness)
        doc.text(`Cultivar Name: ${item.cultivar || 'Unknown'}`, 25, yPosition);
        yPosition += 7;
        
        // Origin information
        if (item.country) {
          doc.text(`Origin Country: ${item.country}`, 25, yPosition);
          yPosition += 7;
        }
        if (item.state) {
          doc.text(`State/Province: ${item.state}`, 25, yPosition);
          yPosition += 7;
        }
        if (item.city) {
          doc.text(`City: ${item.city}`, 25, yPosition);
          yPosition += 7;
        }
        
        yPosition += 10; // Space between entries
      });
      
      // Save the PDF
      const filename = `apple_explorer_export_${new Date().toISOString().split('T')[0]}.pdf`;
      console.log(`Saving PDF as: ${filename}`);
      doc.save(filename);
      this.showNotification('PDF exported successfully', 'success');
      
    } catch (error) {
      console.error('PDF generation error:', error);
      this.showNotification(`PDF generation failed: ${error.message}`, 'error');
    }
  }

  exportToCSV() {
    const headers = ['Species', 'Cultivar Name', 'Origin Country', 'State/Province', 'City', 'Notes', 'Has Image'];
    const csvContent = [
      headers.join(','),
      ...this.filteredData.map(item => [
        `"${item.species}"`,
        `"${item.cultivar}"`,
        `"${item.country}"`,
        `"${item.state || ''}"`,
        `"${item.city || ''}"`,
        `"${(item.notes || '').replace(/"/g, '""')}"`,
        item.image ? 'Yes' : 'No'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `agricultural_species_data_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    this.showNotification('CSV exported successfully', 'success');
  }

  openEntryModal(item = null) {
    this.currentEditingId = item ? item.id : null;
    const modal = document.getElementById('entryModal');
    const title = document.getElementById('modalTitle');
    
    if (item) {
      title.textContent = 'Edit Entry';
      document.getElementById('entrySpecies').value = item.species;
      document.getElementById('entryCultivar').value = item.cultivar;
      document.getElementById('entryCountry').value = item.country;
      document.getElementById('entryState').value = item.state || '';
      document.getElementById('entryCity').value = item.city || '';
      document.getElementById('entryNotes').value = item.notes || '';
      
      const preview = document.getElementById('imagePreview');
      if (item.image) {
        preview.src = item.image;
        preview.style.display = 'block';
      } else {
        preview.style.display = 'none';
      }
    } else {
      title.textContent = 'Add New Entry';
      document.getElementById('entryForm').reset();
      document.getElementById('imagePreview').style.display = 'none';
    }
    
    modal.style.display = 'block';
  }

  openImageModal(itemId) {
    this.currentImageUploadId = itemId;
    const modal = document.getElementById('imageModal');
    const preview = document.getElementById('uploadPreview');
    
    const item = this.data.find(d => d.id === itemId);
    if (item && item.image) {
      preview.src = item.image;
      preview.style.display = 'block';
      document.querySelector('.upload-placeholder').style.display = 'none';
    } else {
      preview.style.display = 'none';
      document.querySelector('.upload-placeholder').style.display = 'block';
    }
    
    modal.style.display = 'block';
  }

  async saveEntry() {
    const species = document.getElementById('entrySpecies').value.trim();
    const cultivar = document.getElementById('entryCultivar').value.trim();
    const country = document.getElementById('entryCountry').value.trim();
    const state = document.getElementById('entryState').value.trim();
    const city = document.getElementById('entryCity').value.trim();
    const notes = document.getElementById('entryNotes').value.trim();
    const imageFile = document.getElementById('entryImage').files[0];

    if (!species || !cultivar || !country) {
      this.showNotification('Please fill in all required fields', 'error');
      return;
    }

    // Generate a unique accession code
    const accessionCode = `USR${Date.now().toString().slice(-6)}`;

    try {
      let imageId = null;

      // Upload image first if provided
      if (imageFile) {
        console.log('Uploading image...');
        const formData = new FormData();
        formData.append('image', imageFile);

        const imageResponse = await fetch('http://localhost:3000/upload-image', {
          method: 'POST',
          body: formData
        });

        if (!imageResponse.ok) {
          const errorData = await imageResponse.json();
          throw new Error(`Failed to upload image: ${errorData.error}`);
        }

        const imageResult = await imageResponse.json();
        imageId = imageResult.imageId;
        console.log('Image uploaded with ID:', imageId);
      }

      // First create the Origin record
      const originData = {
        country: country,
        province: state || null,
        city: city || null
      };

      const originResponse = await fetch('http://localhost:3000/origins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(originData)
      });

      if (!originResponse.ok) {
        const errorData = await originResponse.json();
        throw new Error(`Failed to create origin: ${errorData.error}`);
      }

      const originResult = await originResponse.json();
      const originId = originResult.data._id;

      // Create the AppleProfile record
      const profileData = {
        genus: "Malus", // Default genus for apples
        species: species,
        pedigree: null
      };

      const profileResponse = await fetch('http://localhost:3000/apple-profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData)
      });

      if (!profileResponse.ok) {
        const errorData = await profileResponse.json();
        throw new Error(`Failed to create profile: ${errorData.error}`);
      }

      const profileResult = await profileResponse.json();
      const appleProfileId = profileResult.data._id;

      // Create the PhysicalAttributes record with default values
      const physicalData = {
        fruitSize: null,
        fruitColor: null,
        fruitWeight: null,
        fruitTexture: null
      };

      const physicalResponse = await fetch('http://localhost:3000/physical-attributes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(physicalData)
      });

      if (!physicalResponse.ok) {
        const errorData = await physicalResponse.json();
        throw new Error(`Failed to create physical attributes: ${errorData.error}`);
      }

      const physicalResult = await physicalResponse.json();
      const physicalAttributesId = physicalResult.data._id;

      // Now create the Apple record with all the IDs
      const entryData = {
        accession: accessionCode,
        cultivarName: cultivar,
        originId: originId,
        appleProfileId: appleProfileId,
        physicalAttributesId: physicalAttributesId,
        imageId: imageId, // Include the uploaded image ID
        harvestDate: null,
        tasteNotes: notes,
        notes: `User-added entry`
      };

      const response = await fetch('http://localhost:3000/apples', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entryData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save entry');
      }

      const result = await response.json();
      console.log('Entry saved to database:', result);

      // Reload the data from the backend to get the updated list
      await this.loadSampleData();
      
      this.closeModal(document.getElementById('entryModal'));
      this.showNotification('Entry saved successfully to database!', 'success');

    } catch (error) {
      console.error('Error saving entry:', error);
      this.showNotification(`Error saving entry: ${error.message}`, 'error');
    }
  }

  saveImage() {
    const imageFile = document.getElementById('imageUpload').files[0];
    
    if (!imageFile) {
      this.showNotification('Please select an image', 'error');
      return;
    }

    if (!this.currentImageUploadId) {
      this.showNotification('No item selected for image upload', 'error');
      return;
    }

    this.processImageFile(imageFile, (imageData) => {
      const index = this.data.findIndex(item => item.id === this.currentImageUploadId);
      if (index !== -1) {
        this.data[index].image = imageData;
        this.saveAndRefresh();
        this.closeModal(document.getElementById('imageModal'));
        this.showNotification('Image uploaded successfully', 'success');
      }
    });
  }

  processImageFile(file, callback) {
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      this.showNotification('Image size must be less than 5MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      callback(e.target.result);
    };
    reader.readAsDataURL(file);
  }

  previewImage(file, previewId) {
    if (file) {
      this.processImageFile(file, (imageData) => {
        const preview = document.getElementById(previewId);
        preview.src = imageData;
        preview.style.display = 'block';
        
        if (previewId === 'uploadPreview') {
          document.querySelector('.upload-placeholder').style.display = 'none';
        }
      });
    }
  }

  saveAndRefresh() {
    this.saveToStorage();
    this.filteredData = [...this.data];
    this.sortData();
    this.renderData();
    this.populateFilterOptions();
    this.closeModal(document.getElementById('entryModal'));
    this.showNotification('Entry saved successfully', 'success');
  }

  closeModal(modal) {
    modal.style.display = 'none';
    this.currentEditingId = null;
    this.currentImageUploadId = null;
  }

  handleImport() {
    document.getElementById('importFile').click();
  }

  async processImportFile(file) {
    if (!file) return;

    // Show loading state
    this.showNotification('Processing import file...', 'info');

    try {
      // Create FormData to send file to backend
      const formData = new FormData();
      formData.append('file', file);

      // Send file to backend for processing
      const response = await fetch('/apples/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${window.authManager ? window.authManager.getToken() : ''}`
        },
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        // Success - refresh the data from the backend
        await this.loadDataFromBackend();
        
        // Show success message with details
        let message = `Successfully imported ${result.insertedCount} entries`;
        if (result.skippedCount > 0) {
          message += ` (${result.skippedCount} entries skipped due to duplicates or errors)`;
        }
        
        this.showNotification(message, 'success');
        
        // Show error details if any
        if (result.errors && result.errors.length > 0) {
          console.log('Import errors:', result.errors);
          this.showNotification('Some entries had errors. Check browser console for details.', 'warning');
        }
      } else {
        throw new Error(result.error || 'Import failed');
      }
    } catch (error) {
      console.error('Import error:', error);
      this.showNotification(`Import failed: ${error.message}`, 'error');
      
      // Fallback to local import for non-CSV files or if backend is unavailable
      if (!file.name.endsWith('.csv')) {
        this.processImportFileLocally(file);
      }
    }
  }

  // Fallback method for local import (non-CSV files)
  processImportFileLocally(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let importData;
        
        if (file.name.endsWith('.json')) {
          importData = JSON.parse(e.target.result);
        } else {
          this.showNotification('Unsupported file format. Please use CSV for database import or JSON for local import.', 'error');
          return;
        }

        if (Array.isArray(importData) && importData.length > 0) {
          // Assign new IDs to imported data
          const maxId = Math.max(...this.data.map(item => item.id), 0);
          importData.forEach((item, index) => {
            item.id = maxId + index + 1;
            if (!item.image) item.image = null;
          });

          this.data = [...this.data, ...importData];
          this.saveAndRefresh();
          this.showNotification(`Successfully imported ${importData.length} entries locally (not saved to database)`, 'warning');
        } else {
          this.showNotification('Invalid data format in import file', 'error');
        }
      } catch (error) {
        this.showNotification('Error parsing import file', 'error');
        console.error('Import parsing error:', error);
      }
    };
    reader.readAsText(file);
  }

  // Method to load data from backend
  async loadDataFromBackend() {
    try {
      const response = await fetch('/apples');
      if (response.ok) {
        const backendData = await response.json();
        // Transform backend data to match frontend format
        this.data = backendData.map(item => ({
          id: item._id || item.id,
          species: 'Malus domestica', // Default value
          cultivar: item.cultivarName || '',
          country: item.origin?.country || '',
          state: item.origin?.state || '',
          city: item.origin?.city || '',
          accession: item.accession || '',
          harvestDate: item.harvestDate || '',
          tasteNotes: item.tasteNotes || '',
          notes: item.notes || '',
          image: item.image || null
        }));
        this.filteredData = [...this.data];
        this.sortData();
        this.renderData();
        this.populateFilterOptions();
      }
    } catch (error) {
      console.error('Error loading data from backend:', error);
    }
  }

  parseCSV(csvText) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(',');
        const entry = {};
        
        headers.forEach((header, index) => {
          const value = values[index] ? values[index].trim() : '';
          
          switch (header) {
            case 'species':
              entry.species = value;
              break;
            case 'cultivar':
            case 'cultivar name':
              entry.cultivar = value;
              break;
            case 'country':
            case 'origin of country':
              entry.country = value;
              break;
            case 'state':
            case 'state/province':
              entry.state = value;
              break;
            case 'city':
              entry.city = value;
              break;
            case 'notes':
              entry.notes = value;
              break;
          }
        });

        if (entry.species && entry.cultivar && entry.country) {
          data.push(entry);
        }
      }
    }

    return data;
  }

  handleExport() {
    const exportData = this.data.map(item => ({
      species: item.species,
      cultivar: item.cultivar,
      country: item.country,
      state: item.state || '',
      city: item.city || '',
      notes: item.notes || '',
      hasImage: !!item.image
    }));

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `agricultural_data_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    this.showNotification('Data exported successfully', 'success');
  }

  saveToStorage() {
    localStorage.setItem('searchListData', JSON.stringify(this.data));
  }

  showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  // Bulk Actions Methods
  handleSelectAll(checked) {
    if (checked) {
      this.filteredData.forEach(item => {
        this.selectedItems.add(item.id);
      });
    } else {
      this.selectedItems.clear();
    }
    
    // Update individual checkboxes
    document.querySelectorAll('.row-checkbox').forEach(checkbox => {
      checkbox.checked = checked;
    });
    
    this.updateBulkActionsVisibility();
  }

  handleRowSelection(itemId, checked) {
    if (checked) {
      this.selectedItems.add(itemId);
    } else {
      this.selectedItems.delete(itemId);
    }
    
    // Update select all checkbox
    const selectAllCheckbox = document.getElementById('selectAll');
    const totalVisible = this.filteredData.length;
    const selectedVisible = this.filteredData.filter(item => this.selectedItems.has(item.id)).length;
    
    selectAllCheckbox.checked = selectedVisible === totalVisible && totalVisible > 0;
    selectAllCheckbox.indeterminate = selectedVisible > 0 && selectedVisible < totalVisible;
    
    this.updateBulkActionsVisibility();
  }

  updateBulkActionsVisibility() {
    const bulkActionsSection = document.getElementById('bulkActionsSection');
    const selectedCount = document.getElementById('selectedCount');
    
    if (this.selectedItems.size > 0) {
      bulkActionsSection.style.display = 'block';
      selectedCount.textContent = this.selectedItems.size;
    } else {
      bulkActionsSection.style.display = 'none';
    }
  }

  clearSelection() {
    this.selectedItems.clear();
    document.getElementById('selectAll').checked = false;
    document.getElementById('selectAll').indeterminate = false;
    document.querySelectorAll('.row-checkbox').forEach(checkbox => {
      checkbox.checked = false;
    });
    this.updateBulkActionsVisibility();
  }

  getSelectedItems() {
    return this.data.filter(item => this.selectedItems.has(item.id));
  }

  async deleteSelectedItems() {
    if (this.selectedItems.size === 0) {
      this.showNotification('No items selected for deletion', 'error');
      return;
    }

    const confirmation = confirm(`Are you sure you want to delete ${this.selectedItems.size} selected items? This action cannot be undone.`);
    if (!confirmation) return;

    const selectedItems = this.getSelectedItems();
    let deletedCount = 0;
    let errorCount = 0;

    for (const item of selectedItems) {
      try {
        const response = await fetch(`http://localhost:3000/apples/${item.id}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          deletedCount++;
        } else {
          errorCount++;
          console.error(`Failed to delete item ${item.id}`);
        }
      } catch (error) {
        errorCount++;
        console.error(`Error deleting item ${item.id}:`, error);
      }
    }

    // Reload data from server to get updated list
    await this.loadSampleData();
    this.renderData();
    this.clearSelection();

    if (deletedCount > 0) {
      this.showNotification(`Successfully deleted ${deletedCount} items`, 'success');
    }
    if (errorCount > 0) {
      this.showNotification(`Failed to delete ${errorCount} items`, 'error');
    }
  }

  exportSelectedToPDF() {
    if (this.selectedItems.size === 0) {
      this.showNotification('No items selected for export', 'error');
      return;
    }

    const selectedData = this.getSelectedItems();
    const originalFilteredData = this.filteredData;
    
    // Temporarily set filtered data to selected items
    this.filteredData = selectedData;
    
    // Use existing PDF export function
    this.exportToPDF();
    
    // Restore original filtered data
    this.filteredData = originalFilteredData;
  }

  exportSelectedToCSV() {
    if (this.selectedItems.size === 0) {
      this.showNotification('No items selected for export', 'error');
      return;
    }

    const selectedData = this.getSelectedItems();
    const headers = ['Accession', 'Species', 'Cultivar Name', 'Origin Country', 'State/Province', 'City', 'Notes', 'Has Image'];
    const csvContent = [
      headers.join(','),
      ...selectedData.map(item => [
        `"${item.accession || ''}"`,
        `"${item.species}"`,
        `"${item.cultivar}"`,
        `"${item.country}"`,
        `"${item.state || ''}"`,
        `"${item.city || ''}"`,
        `"${(item.notes || '').replace(/"/g, '""')}"`,
        item.image ? 'Yes' : 'No'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `selected_apple_data_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    this.showNotification(`CSV exported successfully (${selectedData.length} items)`, 'success');
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  new SearchListManager();
  
  // Add fade-in animation
  document.body.classList.add('fade-in');
  

  //Get keywords
    fetch("http://localhost:3000/apples/filters")
    .then(response => response.json())
    .then(data => {
      function fillDropdown(id, values, defaultText) {
        const select = document.getElementById(id);
        if (!select) return;
        select.innerHTML = `<option value="">${defaultText}</option>`;
        values.forEach(val => {
          const option = document.createElement("option");
          option.value = val;
          option.textContent = val;
          select.appendChild(option);
        });
      }

      fillDropdown("speciesFilter", data.species, "All Species");
      fillDropdown("cultivarFilter", data.cultivarNames, "All Cultivars");
      fillDropdown("countryFilter", data.originCountries, "All Countries");
      fillDropdown("stateFilter", data.originProvinces, "All States/Provinces");
      fillDropdown("cityFilter", data.originCities, "All Cities");
    })
    .catch(err => {
      console.error("Failed to load filter values:", err);
    });




});