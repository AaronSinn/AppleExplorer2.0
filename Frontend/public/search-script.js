class SearchListManager{
    constructor(){
        this.columns = [
            'accession','cultivarName','tasteNotes','notes', 'acno', 'prefix', 
            'family', 'habitat', 'inventoryType',
            'maintenancePolicy', 'plantType', 'isDistributable', 'firstBloomDate',
            'fullBloomDate', 'fireblightRating', 'taxon', 'narrativeKeyword',
            'fullNarrative', 'pedigreeDescription', 'availabilityStatus',
            'cooperator', 'IPR', 'labelName', 'levelOfImprovement',  
            'profile:genus','profile:species','profile:pedigree', 'profile:taxon', 
            'origin:country', 'origin:province', 'origin:city'
        ];
        this.searchableColumns = [
            'cultivarName', 'profile:genus', 'profile:species', 'profile:pedigree', 
            'profile:taxon', 'origin:country', 'origin:province', 'origin:city'
        ];
        this.sortableColumns = [
            'accession', 'cultivarName', 'profile:genus', 'profile:species', 'profile:pedigree', 
            'profile:taxon', 'origin:country', 'origin:province', 'origin:city'
        ];
        this.shownColumnsTableView = [
            'accession', 'cultivarName', 'profile:genus', 'profile:species', 'profile:pedigree', 
            'profile:taxon','origin:country', 'origin:province', 'origin:city'
        ];
        this.shownColumnsPictureView = [
            'profile:genus', 'profile:species', 'origin:country', 'origin:province', 'origin:city'
        ]
        this.filterableColumns = [
            'profile:species', 'profile:pedigree', 'cultivarName', 'origin:country', 'origin:province', 'origin:city', 
        ]
        this.requiredColumns = [
            'accession', 'profile:genus', 'profile:species', 'cultivarName', 'origin:country'
        ]

        this.mapObjectToFetchID = new Map([
            ['origin', 'origins'],
            ['profile', 'apple-profiles']
        ])
        this.mapObjectToAttributeID = new Map([
            ['origin', 'originId'],
            ['profile', 'appleProfileId']
        ])

        this.searchDisplayColumn = 'cultivarName'
        this.sortColumn = 'accession';
        this.searchByColumn = 'none';

        this.sortDirection = 'asc';
        this.currentView = "list";
        this.isSearchActive = false;
        this.isMultiSelectActive = false;

        this.data = [];
        this.filteredData = [];
        this.narrativesData = [];
        this.keywords = [];
        this.filteredKeywords = [];
        this.imageMapping = {};
        this.selectedItems = new Set();
        this.addOrEdit = null;
        this.currentImageItem = null;

        this.maxDropdownItems = 8;
        this.selectedDropdownItemIndex = -1;

        this.currentFilters = [];

        this.userRole = "Admin"; // Default role, will be updated after authentication

        this.init();
    }

    parseJwt(token) {
        if(token === null || token === undefined) return null;
        const base64Url = token.split('.')[1];
        const base64 = base64Url
            .replace(/-/g, '+')
            .replace(/_/g, '/')
            .padEnd(base64Url.length + (4 - base64Url.length % 4) % 4, '=');

        const jsonPayload = decodeURIComponent(
            atob(base64)
            .split('')
            .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );

        return JSON.parse(jsonPayload);
    }

    async init(){
        const token = localStorage.getItem('authToken');
        const user = this.parseJwt(token) || null;
        if (user && user.role) {
            this.userRole = user.role;
        }

        console.log("Initializing search list manager...")
        await this.loadApples();
        await this.loadImageMapping();

        this.sortData();
        this.initializeSearchableKeywords();

        this.renderData();
        this.renderSearchableColumnOptions();
        this.renderShownColumnOptions();
        this.renderSortColumnOptions();

        this.bindEvents();
    }

    // ── Data loading ──────────────────────────────────────────────────────────

    async loadApples(){
        console.log("Loading apple data...")
        try{
            const response = await fetch("http://localhost:3000/apples");
            const apples = await response.json();

            // Convert imageId into usable image URL
            this.data = apples.map(apple => {
                if (apple.imageId) {
                    return {
                        ...apple,
                        image: `http://localhost:3000/image/${apple.imageId}`
                    };
                }
                return apple;
            });

            this.filteredData = [...this.data];
            console.log(`Loaded data for ${this.data.length} apples`)
            this.sortData();

        }catch(err){
            this.showNotification("Failed to load data from server", "error");
            this.data = [];
            this.filteredData = [];
        }   
    }

    async loadImageMapping() {
        console.log("Loading image mapping...")
        try {
            const response = await fetch('/image-mapping.json');
            this.imageMapping = await response.json();
            console.log('Loaded image mapping for ' + Object.keys(this.imageMapping).length + ' images');
            console.log('Sample mapping: ' + Object.entries(this.imageMapping).slice(0, 3));
        } catch (err) {
            console.error('Failed to load image mapping:', err);
            this.imageMapping = {};
        }
    }

    // ── Sorting ───────────────────────────────────────────────────────────────

    sortData() {
        console.log("Sorting apples...")
        this.filteredData.sort((a, b) => {
            let aSortVal = this.getPropertyOfItem(a,this.sortColumn) || '';
            let bSortVal = this.getPropertyOfItem(b,this.sortColumn) || '';
            if (typeof aSortVal === 'string') {
                aSortVal = aSortVal.toString().toLowerCase();
                bSortVal = bSortVal.toString().toLowerCase();
            }
            if (this.sortDirection === 'asc') {
                return aSortVal == '' ? 1 : bSortVal == '' ? -1 : aSortVal < bSortVal ? -1 : aSortVal > bSortVal ? 1 : 0;
            } else {
                return aSortVal == '' ? 1 : bSortVal == '' ? -1 : aSortVal > bSortVal ? -1 : aSortVal < bSortVal ? 1 : 0;
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

    // ── Keywords ──────────────────────────────────────────────────────────────

    initializeSearchableKeywords(){
        console.log("Initializing searchable keywords...")
        const keywordsSet = new Set();
        this.data.forEach(apple => {
            this.searchableColumns.forEach(column => {
                if(this.getPropertyOfItem(apple,column))
                {
                    keywordsSet.add(this.getPropertyOfItem(apple,column));
                }
            })
        });
        this.keywords = Array.from(keywordsSet);
    }

    // ── Rendering ─────────────────────────────────────────────────────────────

    renderData(){
        console.log("Rendering data...");
        this.currentView === 'list' ? this.renderTableView() : this.renderPictureView();
        document.getElementById('sortSelectLabel').textContent = `Sorting ${this.filteredData.length} 
            result${this.filteredData.length == 1 ? '' : 's'} by`;
    }

    toggleColumnPanel(){
        console.log("Rendering column options...")
        const showHideColumnsPanel = document.getElementById('showHideColumns');
        showHideColumnsPanel.style.display = ((showHideColumnsPanel.style.display === 'none' && this.currentView === 'list') ? 'block' : 'none');
        this.updateShowColumnCheckboxes();
    }

    renderShownColumnOptions(){
        const optionsGrid = document.getElementById('column-options-grid');
        
        optionsGrid.innerHTML = '';

        this.columns.forEach(column => {
            const showHideColumn = document.createElement('div'); 
            const showHideColumnCheckbox = document.createElement('input');
            const showHideColumnLabel = document.createElement('label');

            optionsGrid.appendChild(showHideColumn);

            showHideColumn.classList.add('filter-group');
            this.appendChildren(showHideColumn, [showHideColumnCheckbox, showHideColumnLabel]);

            showHideColumnCheckbox.setAttribute('id', column + 'checkbox');
            showHideColumnCheckbox.setAttribute('type', 'checkbox');
            showHideColumnCheckbox.classList.add('show-column-checkbox');

            showHideColumnLabel.setAttribute('for', column + 'checkbox');
            showHideColumnLabel.textContent = this.getShortColumnName(column);            
        });
        this.bindShowColumnCheckboxes();
    }

    renderSortColumnOptions(){
        const sortBy = document.getElementById('sortSelect');
        sortBy.innerHTML = '';
        this.sortableColumns.forEach(column =>{
            const newOption = document.createElement("option");
            sortBy.appendChild(newOption);
            newOption.text = this.getShortColumnName(column);
            newOption.value = column;
        })
    }

    updateShowColumnCheckboxes(){
        this.shownColumnsTableView.forEach(column => {
            document.getElementById(column + 'checkbox').checked = true;  
        });
    }

    renderSearchableColumnOptions(){
        const searchBy = document.getElementById('search-by');
        this.searchableColumns.forEach(column =>{
            const newOption = document.createElement("option");
            searchBy.appendChild(newOption);
            newOption.text = this.getShortColumnName(column);
            newOption.value = column;
        })
    }

    // ── Event binding ─────────────────────────────────────────────────────────

    bindEvents(){

        // Delete image button
        document.getElementById('deleteImage').addEventListener('click', () => {
            this.deleteImage();
        });

        // Change what user is searching by
        document.getElementById('search-by').addEventListener("change", (event) => {
            this.searchByColumn = event.target.value;
            this.handleSearch(document.getElementById('searchInput').value.toLowerCase().trim());
        })

        // Search
        document.getElementById('searchInput').addEventListener('click', () => {
            this.isSearchActive = true;
            this.buildDropdown();
        });
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.handleSearch(e.target.value.toLowerCase().trim());
        });

        // Search suggestions
        document.addEventListener("click", (e) => {
            if (e.target.classList.contains("suggestion-item")) {
                const value = e.target.getAttribute("data-value");
                document.getElementById('searchInput').value = value;
                document.getElementById('searchInput').dispatchEvent(new Event("input"));
            }
            if(!(e.target.id == ('searchInput'))){
                this.isSearchActive = false;
                document.getElementById("suggestionsBox").style.display = "none";
            }      
        });

        // View toggle
        document.getElementById('listViewBtn').addEventListener('click', () => {
            this.switchView('list');
        });
        document.getElementById('pictureViewBtn').addEventListener('click', () => {
            this.switchView('picture');
        });

        // Import/Export
        document.getElementById('importBtn').addEventListener('click', () => {
            this.handleImport();
        });
        document.getElementById('importFile').addEventListener('change', (e) => {
            this.processImportFile(e.target.files[0]);
        });
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.handleExport();
        });

        // Sorting
        document.getElementById('sortSelect').addEventListener('change', (e) => {
            this.sortColumn = e.target.value;
            this.sortData();
            this.renderData();
        });
        document.getElementById('sortOrderBtn').addEventListener('click', () => {
            console.log("Sorting");
            this.toggleSortOrder();
        });

        // Export buttons
        document.getElementById('exportPdfBtn').addEventListener('click', () => {
            this.exportToPDF();
        });
        document.getElementById('exportCsvBtn').addEventListener('click', () => {
            this.exportToCSV();
        });

        // Column panel toggle
        document.getElementById('showHideBtn').addEventListener('click', () => {
            this.toggleColumnPanel();
        });

        // Select all
        document.getElementById('selectAll').addEventListener('change', (e) => {
            this.handleSelectAll(e.target.checked);
        });

        // Filter actions
        document.getElementById('applyFilters').addEventListener('click', () => {
            this.applyFilters();
            this.renderData();
        });
        document.getElementById('clearFilters').addEventListener('click', () => {
            this.clearFilters();
            this.renderData();
        });

        // Show/hide all columns
        document.getElementById('showAllColumns').addEventListener('click', () =>{
            this.showAllColumns();
        });
        document.getElementById('hideAllColumns').addEventListener('click', () =>{
            this.hideAllColumns();
        });

        // Modals - close buttons
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                this.closeModal(e.target.closest('.modal'));
            });
        });

        // Image modal buttons
        document.getElementById('saveImage').addEventListener('click', () => {
            this.saveImage();
        });
        document.getElementById('cancelImage').addEventListener('click', () => {
            this.closeModal(document.getElementById('imageModal'));
        });

        // Image previews
        document.getElementById('entryImage').addEventListener('change', (e) => {
            console.log("Entry image");
            this.previewImage(e.target.files[0], 'imagePreview');
        });
        document.getElementById('imageUpload').addEventListener('change', (e) => {
            console.log('IMG');
            this.previewImage(e.target.files[0], 'uploadPreview');
        });

        // Add entry button
        document.getElementById('addEntryBtn').addEventListener('click', () => {
            this.addOrEdit = 'add';
            this.openEntryModal();
        });

        // Edit entry
        document.getElementById('editEntryBtn').addEventListener('click', () => {
            if(this.selectedItems.size != 1){
                return;
            }
            this.addOrEdit = 'edit';
            this.openEntryModal(this.selectedItems[0]);
        });

        // Delete entry
        document.getElementById('delEntryBtn').addEventListener('click', () => {
            this.deleteEntry();
        });

        // Cancel entry
        document.getElementById('cancelEntry').addEventListener('click', () => {
            this.closeModal(document.getElementById('entryModal'));
        });

        // Save entry
        document.getElementById('saveEntry').addEventListener('click', () => {
            this.saveEntry();
        });

        // Enter and arrow keys for search
        document.addEventListener('keydown', (e) => {
            if(!this.isSearchActive){
                return;
            }
            if(e.key=='Enter'){
                const selectedItemText = document.getElementById('searchInput').value;
                if(-1 < this.selectedDropdownItemIndex && this.selectedDropdownItemIndex < this.filteredKeywords.length){
                    document.getElementById('searchInput').value = selectedItemText; 
                }
                document.getElementById('searchInput').dispatchEvent(new Event("input"));
                this.sendSearch(e.target.value.toLowerCase().trim());
            }
            else if(e.key=='ArrowUp'){
                if(-1 < this.selectedDropdownItemIndex - 1 && this.selectedDropdownItemIndex - 1 < this.filteredKeywords.length){
                    this.selectedDropdownItemIndex--;
                    document.getElementById('searchInput').value = this.filteredKeywords[this.selectedDropdownItemIndex];
                }
            }
            else if(e.key=='ArrowDown'){
                if(-1 < this.selectedDropdownItemIndex + 1 && this.selectedDropdownItemIndex + 1 < this.filteredKeywords.length){
                    this.selectedDropdownItemIndex++;
                    document.getElementById('searchInput').value = this.filteredKeywords[this.selectedDropdownItemIndex];
                }
            }
        });

        // Mass Image Upload button
        document.getElementById('massImageBtn').addEventListener('click', () => {
            document.getElementById('massImageInput').click();
        });

        // Mass Image Upload handler
        document.getElementById('massImageInput').addEventListener('change', async (e) => {
            const files = e.target.files;
            let successCount = 0;
            let errorCount = 0;
            for (const file of files) {
                const filename = file.name;   
                if (file.type !== "image/png" && file.type !== "image/jpeg") {
                    console.log(`Rejected: Only PNG or JPEG files allowed`);
                    continue;
                }

                const match = filename.match(/^(MAL\d{4})/i); 

                if (!match) {
                    this.showNotification(`${file.name} must contain MAL####`, "error");
                    continue;
                }

                const accession = match[1];   
                const apple = this.data.find(a => a.accession === accession);

                if (!apple) {
                    this.showNotification(`No apple found for ${accession}`, "error");
                    continue;
                }
                try {
                    const formData = new FormData();
                    formData.append('image', file);
                    const uploadResponse = await fetch('http://localhost:3000/upload-image', {
                        method: 'POST',
                        body: formData
                    });

                    if (!uploadResponse.ok) {
                        throw new Error("Image upload failed");
                    }

                    const uploadResult = await uploadResponse.json();
                    const imageId = uploadResult.imageId;
                    const updateResponse = await fetch(`http://localhost:3000/apples/${apple._id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ...apple, imageId })
                    });

                    if (!updateResponse.ok) {
                        throw new Error("Failed to update apple");
                    }
                    successCount++;
                } catch (err) {
                    console.error(err);
                    errorCount++;
                }
            }
            this.showNotification(
                `Mass upload finished: ${successCount} images uploaded, ${errorCount} failed.`,
                errorCount > 0 ? "warning" : "success"
            );
            await this.loadApples();
            this.renderData();
            e.target.value = "";
        });
    }

    bindFilters(){
        document.querySelectorAll('.filterSelect').forEach(item =>{
            item.addEventListener('keydown', (e) => {
                if(e.key=='Enter'){
                    this.applyFilters();
                    this.renderData();
                }
            })
        });
    }

    bindShowColumnCheckboxes(){
        document.querySelectorAll('.show-column-checkbox').forEach((checkbox, index) => {
            checkbox.addEventListener('click', (e) => {this.showOrHideColumnUsingCheckbox(checkbox);});
        });
    }

    // ── Image handling ────────────────────────────────────────────────────────

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

    async saveImage() {
        const imageFile = document.getElementById('imageUpload').files[0];

        if (!imageFile) {
            this.showNotification('Please select an image', 'error');
            return;
        }

        if (!this.currentImageItem) {
            this.showNotification('No apple selected', 'error');
            return;
        }

        const apple = this.currentImageItem;

        try {
            const formData = new FormData();
            formData.append('image', imageFile);

            const uploadResponse = await fetch('http://localhost:3000/upload-image', {
                method: 'POST',
                body: formData
            });

            if (!uploadResponse.ok) {
                throw new Error("Image upload failed");
            }

            const uploadResult = await uploadResponse.json();
            const imageId = uploadResult.imageId;

            const updateResponse = await fetch(`http://localhost:3000/apples/${apple._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...apple, imageId })
            });

            if (!updateResponse.ok) {
                throw new Error("Failed to update apple");
            }

            this.showNotification('Image uploaded successfully', 'success');

            await this.loadApples();
            this.renderData();

            this.closeModal(document.getElementById('imageModal'));

        } catch (err) {
            console.error(err);
            this.showNotification('Image upload failed', 'error');
        }
    }

    async deleteImage() {
        if (!this.currentImageItem) return;

        if (!confirm("Remove this image?")) return;

        const apple = this.currentImageItem;

        try {
            const updateResponse = await fetch(`http://localhost:3000/apples/${apple._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...apple, imageId: null })
            });

            if (!updateResponse.ok) {
                throw new Error("Failed to remove image");
            }

            this.showNotification("Image removed", "success");

            await this.loadApples();
            this.renderData();

            this.closeModal(document.getElementById('imageModal'));

        } catch (err) {
            console.error(err);
            this.showNotification("Failed to remove image", "error");
        }
    }

    openImageModal(item){
        this.currentImageItem = item;
        const modal = document.getElementById('imageModal');
        const preview = document.getElementById('uploadPreview');
        
        if (item && item.image) {
            preview.src = item.image;
            preview.style.display = 'block';
            document.querySelector('.upload-placeholder').style.display = 'none';
        } else {
            preview.style.display = 'none';
            document.querySelector('.upload-placeholder').style.display = 'block';
        }

        document.getElementById('deleteImage').style.display =
            (item && item.image) ? 'inline-block' : 'none';

        modal.style.display = 'block';
    }

    // ── Search ────────────────────────────────────────────────────────────────

    handleSearch(query){
        this.selectedDropdownItemIndex = -1;
        if(!query.trim()){
            this.filteredKeywords = [];
        }
        else{
            this.updateFilteredKeywords(query);
        }
        this.isSearchActive = true;
        this.buildDropdown();
    }

    buildDropdown(){
        if(this.filteredKeywords.length == 0){
            document.getElementById("suggestionsBox").style.display = "none";
            return;
        }
        document.getElementById("suggestionsBox").hidden = false;
        document.getElementById("suggestionsBox").innerHTML = this.filteredKeywords.slice(0,this.maxDropdownItems)
        .map(item => `<div class="suggestion-item" data-value="${item}">${item}</div>`)
        .join("");
        document.getElementById("suggestionsBox").style.display = "block";
    }

    sendSearch(query){
        this.filterData(query.toLowerCase());
        this.renderData();
    }

    filterData(query){
        console.log("Filtering data...")
        if (!query.trim()) {
            this.filteredData = [...this.data];
        }
        else{
            this.filteredData.length = 0;
            if(this.searchByColumn == 'none'){
                this.data.forEach(item => {
                    this.searchableColumns.forEach(column => {
                        if(this.getPropertyOfItem(item,column))
                        {
                            if(this.getPropertyOfItem(item,column).toString().toLowerCase().includes(query)){
                                this.filteredData.push(item);
                                return;
                            }
                        }    
                    })
                });
            }
            else{
                this.data.forEach(item => {
                    if(this.getPropertyOfItem(item,this.searchByColumn))
                    {
                        if(this.getPropertyOfItem(item,this.searchByColumn).toLowerCase().includes(query)){
                            this.filteredData.push(item);
                            return;
                        }
                    }  
                });
            }
        }
    }

    updateFilteredKeywords(query){
        if(this.searchByColumn == 'none'){
            this.filteredKeywords = this.keywords.filter(k => k.toString().toLowerCase().includes(query))
        }
        else{
            const kw = new Set();
            this.data.forEach(item => {
                if(this.getPropertyOfItem(item,this.searchByColumn))
                {
                    kw.add(this.getPropertyOfItem(item,this.searchByColumn));
                }
            });
            this.filteredKeywords = Array.from(kw).filter(k => k.toLowerCase().includes(query));
        }
    }

    // ── View switching ────────────────────────────────────────────────────────

    switchView(view){
        this.currentView = view;

        document.getElementById('listViewBtn').classList.toggle('active', view === 'list');
        document.getElementById('pictureViewBtn').classList.toggle('active', view === 'picture');
        document.getElementById('showHideBtn').disabled = view === 'picture';
        
        document.getElementById('listView').style.display = view === 'list' ? 'block' : 'none';
        document.getElementById('pictureView').style.display = view === 'picture' ? 'block' : 'none';
        
        document.getElementById('filterPanel').style.display = 'none';
        document.getElementById('showHideColumns').style.display = 'none';
        
        view === 'list' ? document.getElementById('listViewBtn')
        .appendChild(document.getElementById('view-arrow')) : document.getElementById('pictureViewBtn')
        .appendChild(document.getElementById('view-arrow'));
        
        this.renderData();
    }

    // ── Import / Export ───────────────────────────────────────────────────────

    handleImport(){
        document.getElementById('importFile').click();
    }

    async processImportFile(file) {
        if (!file) return;

        this.showNotification('Processing import file...', 'info');

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/apples/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${window.authManager ? window.authManager.getToken() : ''}`
                },
                body: formData
            });

            const result = await response.json();

            if (response.ok) {
                await this.loadApples();
                
                let message = `Successfully imported ${result.insertedCount} entries`;
                if (result.skippedCount > 0) {
                    message += ` (${result.skippedCount} entries skipped due to duplicates or errors)`;
                }
                this.showNotification(message, 'success');
                
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
            
            if (!file.name.endsWith('.csv')) {
                this.processImportFileLocally(file);
            }
        }
    }

    handleExport(){
        const dataStr = JSON.stringify(this.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `agricultural_data_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    
        this.showNotification('Data exported successfully', 'success');
    }

    exportToPDF() {
        console.log('PDF export function called');
        
        const checkJsPDF = () => {
            let PDFConstructor;
            if (typeof window.jsPDF !== 'undefined') {
                PDFConstructor = window.jsPDF;
            } else if (typeof jsPDF !== 'undefined') {
                PDFConstructor = jsPDF;
            } else if (typeof window.jspdf !== 'undefined' && window.jspdf.jsPDF) {
                PDFConstructor = window.jspdf.jsPDF;
            } else {
                return null;
            }
            return PDFConstructor;
        };

        let PDFConstructor = checkJsPDF();
        
        if (!PDFConstructor) {
            this.showNotification('Loading PDF library, please wait...', 'info');
            
            setTimeout(() => {
                PDFConstructor = checkJsPDF();
                if (!PDFConstructor) {
                    setTimeout(() => {
                        PDFConstructor = checkJsPDF();
                        if (!PDFConstructor) {
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
    
    generatePDF(PDFConstructor){
        try {
            const doc = new PDFConstructor();
            const exportData = (this.selectedItems.size == 0 ? this.filterData : this.selectedItems);
            
            doc.setFontSize(20);
            doc.text('Apple Explorer Export Report', 20, 20);
            doc.setFontSize(12);
            doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 30);
            doc.text(`Total entries: ${exportData.size}`, 20, 40);
            
            let yPosition = 60;
            let index = 0;

            exportData.forEach(item => {
                if (yPosition > 250) {
                    doc.addPage();
                    yPosition = 20;
                }
                doc.setFontSize(14);
                doc.setFont(undefined, 'bold');
                doc.text(`${(index++ + 1)}. ${this.getPropertyOfItem(item,'cultivarName') || 'Unknown'}`, 20, yPosition);
                
                doc.setFontSize(10);
                doc.setFont(undefined, 'normal');
                let storedYPosition = yPosition;
                yPosition += 10;

                this.shownColumnsTableView.forEach(column =>{
                    if(this.getPropertyOfItem(item,column)){
                        doc.text(`${this.getShortColumnName(column)} : ${this.getPropertyOfItem(item,column)}`, 25, yPosition);
                    }
                    else{
                        doc.text(`${this.getShortColumnName(column)} : unknown`, 25, yPosition);
                    }
                    yPosition += 7;
                })

                if(item.image){
                    const exportImage = new Image();
                    exportImage.src = item.image;

                    let exportImageHeight = exportImage.height;
                    let exportImageWidth = exportImage.width;
                    
                    while(exportImageHeight > yPosition-storedYPosition || exportImageWidth > doc.internal.pageSize.getWidth()/3){
                        exportImageHeight*=0.9;
                        exportImageWidth*=0.9;
                    }
                    let exportImageX = (doc.internal.pageSize.getWidth()*0.9)-exportImageWidth;
                    let exportImageY = (yPosition-storedYPosition-exportImageHeight)/2 + storedYPosition;

                    doc.addImage(item.image, 'JPEG', exportImageX, exportImageY,exportImageWidth,exportImageHeight);             
                }
                    
                yPosition += 10;
            });
            
            const filename = `apple_explorer_export_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(filename);
            this.showNotification('PDF exported successfully', 'success');
            
        } catch (error) {
            console.error('PDF generation error:', error);
            this.showNotification(`PDF generation failed: ${error.message}`, 'error');
        }
    }

    exportToCSV() {
        const headers = [...this.shownColumnsTableView];
        let csvContent = headers.join(',') + ('\n');

        const exportData = (this.selectedItems.size == 0 ? this.filterData : this.selectedItems);

        exportData.forEach(item =>{
            this.shownColumnsTableView.forEach((column, index) =>{
                if(this.getPropertyOfItem(item,column)){
                    csvContent+=`"${this.getPropertyOfItem(item,column)}"`;
                }
                else{
                    csvContent+='-';
                }
                if(index < this.shownColumnsTableView.length - 1){
                    csvContent+=',';
                }
            })
            csvContent+='\n';
        })
 
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `agricultural_species_data_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        
        this.showNotification('CSV exported successfully', 'success');
    }

    // ── Selection ─────────────────────────────────────────────────────────────

    handleSelectAll(checked){
        if (checked) {
            this.filteredData.forEach(item => {
                this.selectedItems.add(item)
            });
            document.querySelectorAll('.row-checkbox').forEach(checkbox => {
                checkbox.checked = true;
            });
            document.querySelectorAll('tr').forEach(row =>{
                row.classList.add("selected-row");
            });
        } else {
            this.selectedItems.clear();
            document.querySelectorAll('.row-checkbox').forEach(checkbox => {
                checkbox.checked = false;
            });
            document.querySelectorAll('tr').forEach(row =>{
                row.classList.remove("selected-row");
            });
        }
        this.toggleModifyEntryButtons(this.selectedItems.size);
    }

    handleRowSelection(item, checked, row) {
        if (checked) {
            this.selectedItems.add(item);
            row.classList.add("selected-row");
        } else {
            this.selectedItems.delete(item);
            row.classList.remove("selected-row");
        }
        this.toggleModifyEntryButtons(this.selectedItems.size);
    }

    toggleModifyEntryButtons(size){
        const addEntryBtn = document.getElementById('addEntryBtn');
        const editEntryBtn = document.getElementById('editEntryBtn');
        const deleteEntryBtn = document.getElementById('delEntryBtn');
        const exportPDFBtn = document.getElementById('exportPdfBtn');
        const exportCSVBtn = document.getElementById('exportCsvBtn');

        addEntryBtn.disabled = (size > 0 || this.userRole === 'Viewer');
        editEntryBtn.disabled = (size != 1 || this.userRole === 'Viewer');
        deleteEntryBtn.disabled = (size == 0 || this.userRole === 'Viewer');
        exportPDFBtn.disabled = size == 0;
        exportCSVBtn.disabled = size == 0;
    }

    // ── Notifications ─────────────────────────────────────────────────────────

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

    // ── Entry modal ───────────────────────────────────────────────────────────

    openEntryModal(item = null) {
        console.log("Opening entry modal...");

        const modal = document.getElementById('entryModal');
        const entryForm = document.getElementById('entryForm');
        entryForm.replaceChildren();

        let formRow;

        let imageRow = document.createElement('div');
        imageRow.classList.add('form-row');
        imageRow.innerHTML = '<div class="form-group">' +
        '<label for="entryImage">Image</label>' +
        '<input type="file" id="entryImage" accept="image/*">' +
        '<div class="image-preview">' +
        '<img id="imagePreview" style="display: none;">' +
        '</div>' +
        '</div>';
        entryForm.appendChild(imageRow);
        const preview = document.getElementById('imagePreview');
        if(item && item.image){
            preview.src = item.image;
            preview.style.display = 'block';
        }

        const fieldsToDisplay = [...new Set([...this.requiredColumns, ...this.columns])];
        fieldsToDisplay.forEach((column, index) =>{
            if(index % 2 == 0) {
                formRow = document.createElement('div');
            }
            const formGroup = document.createElement('div');
            const entryLabel = document.createElement('label');
            const entryInput = document.createElement('input');

            formRow.classList.add('form-row');
            formGroup.classList.add('form-group');

            entryLabel.setAttribute('for', 'entry' + column);
            entryInput.classList.add('entry-input');
            entryInput.setAttribute('id', 'entry' + column);

            entryLabel.textContent = this.getShortColumnName(column) + (this.requiredColumns.includes(column) && !item ? "*" : "");

            if(item){
                entryInput.value = this.getPropertyOfItem(item, column);
            }
            if(this.requiredColumns.includes(column))
            {
                entryInput.setAttribute('required', '');
                entryInput.classList.add('required-entry-input');
            }
            
            entryForm.appendChild(formRow);
            formRow.appendChild(formGroup)
            this.appendChildren(formGroup, [entryLabel, entryInput]);
        });
        modal.style.display = 'block';
    }

    closeModal(modal) {
        modal.style.display = 'none';
        this.currentImageItem = null;
    }

    saveEntry(){
        if(this.addOrEdit == 'add')
        {
            this.addEntry();
        }
        else if(this.addOrEdit == 'edit')
        {
            this.updateEntry();
        }
        else{
            return;
        }
    }

    // ── CRUD ──────────────────────────────────────────────────────────────────

    async addEntry(){
        const requiredInputs = document.querySelectorAll('.required-entry-input');
        const requiredFieldsFilled = Array.from(requiredInputs).every(item =>{
            if(!item.value.trim()){
                return false;
            }
            return true;
        });
        if(!requiredFieldsFilled){
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }
        const entryColumns = [...new Set([...this.requiredColumns, ...this.columns])];

        const data = {};
        
        const entryInputs = document.querySelectorAll('.entry-input');
        const recordNames = [];
        const records = [];
        entryColumns.forEach((column, index) => {
            const val = entryInputs.item(index).value.trim();
            if(!val){
                return;
            }
            if(column.includes(':')){
                const upper = column.split(':')[0];
                const nested = column.split(':')[1];
                if(!data[upper]){
                    data[upper] = {};
                    recordNames.push(upper);
                }
                data[upper][nested] = val;
                return;
            }
            data[column] = val;
        })
        recordNames.forEach(recordName =>{
            records.push(data[recordName]);
        });
        try{
            for(const record of records){
                const index = records.indexOf(record);
                const mapin = recordNames[index];
                const response = await fetch(`http://localhost:3000/${this.mapObjectToFetchID.get(mapin)}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(record)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`Failed to create origin: ${errorData.error}`);
                }

                const result = await response.json();
                console.log(`Result for ${recordNames[index]}: ${result}`);
                const id = result.data._id;

                delete data[recordNames[index]];
                data[this.mapObjectToAttributeID.get(mapin)] = id;
            }

            const response = await fetch('http://localhost:3000/apples', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save entry');
            }

            const result = await response.json();
            console.log('Entry saved to database:', result);

            await this.loadApples();
            this.sortData();
            this.renderData();
            
            this.closeModal(document.getElementById('entryModal'));
            this.showNotification('Entry saved successfully to database!', 'success');

        }catch (error) {
            console.error('Error saving entry:', error);
            this.showNotification(`Error saving entry: ${error.message}`, 'error');
        }
    }

    async updateEntry(){
        if(this.selectedItems.size != 1){
            return;
        }

        const entryColumns = [...new Set([...this.requiredColumns, ...this.columns])];

        const data = [...this.selectedItems][0];
        
        const entryInputs = document.querySelectorAll('.entry-input');
        const recordNames = [];
        const records = [];
        entryColumns.forEach((column, index) => {
            const val = entryInputs.item(index).value.trim();
            if(!val){
                return;
            }
            if(column.includes(':')){
                const upper = column.split(':')[0];
                const nested = column.split(':')[1];
                if(!data[upper]){
                    data[upper] = {};
                    recordNames.push(upper);
                }
                data[upper][nested] = val;
                return;
            }
            data[column] = val;
        })
        recordNames.forEach(recordName =>{
            records.push(data[recordName]);
        });
        try{
            const response = await fetch(`http://localhost:3000/apples/${data._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save entry');
            }

            const result = await response.json();
            console.log('Entry saved to database:', result);

            await this.loadApples();
            
            this.closeModal(document.getElementById('entryModal'));
            this.showNotification('Entry saved successfully to database!', 'success');
            this.sortData();
            this.renderData();

        }catch (error) {
            console.error('Error saving entry:', error);
            this.showNotification(`Error saving entry: ${error.message}`, 'error');
        }
    }

    async deleteEntry(item){
        this.confirmDeletion(item, `Confirm deleting ${this.selectedItems.size} item${this.selectedItems.size > 1 ? 's': ''}?`);
    }

    async confirmDeletion(item, message){
        const span = document.getElementById("confirmDeletionSpan");
        span.textContent = message;
        span.style.display = 'block';

        const yesBtn = document.getElementById("yesButton");
        const noBtn = document.getElementById("noButton");
        yesBtn.style.display = 'block';
        noBtn.style.display = 'block';

        const addBtn = document.getElementById('addEntryBtn');
        const editBtn = document.getElementById('editEntryBtn');
        const delBtn = document.getElementById('delEntryBtn');
        const pdfBtn = document.getElementById('exportPdfBtn');
        const csvBtn = document.getElementById('exportCsvBtn');
        const imgBtn = document.getElementById('massImageBtn');
        const sortControls = document.getElementById('sortContainer');

        addBtn.style.display = 'none';
        editBtn.style.display = 'none';
        delBtn.style.display = 'none';
        pdfBtn.style.display = 'none';
        csvBtn.style.display = 'none';
        imgBtn.style.display = 'none';
        sortControls.style.display = 'none';

        yesBtn.addEventListener('click', (e) => {
            span.style.display = 'none';
            yesBtn.style.display = 'none';
            noBtn.style.display = 'none';
            addBtn.style.display = 'block';
            editBtn.style.display = 'block';
            delBtn.style.display = 'block';
            pdfBtn.style.display = 'block';
            csvBtn.style.display = 'block';
            imgBtn.style.display = 'block';
            sortControls.style.display = 'block';
            this.finishDeletion(item);
        });
        noBtn.onclick = () => {
            span.style.display = 'none';
            yesBtn.style.display = 'none';
            noBtn.style.display = 'none';
            addBtn.style.display = 'block';
            editBtn.style.display = 'block';
            delBtn.style.display = 'block';
            pdfBtn.style.display = 'block';
            csvBtn.style.display = 'block';
            sortControls.style.display = 'block';
            imgBtn.style.display = 'block';
        }
    }

    async finishDeletion(item){
        try{
            for(const data of this.selectedItems){
                const response = await fetch(`http://localhost:3000/apples/${data._id}`, {
                    method: 'DELETE',
                    headers: {'Content-Type': 'application/json',},
                    body: JSON.stringify(data)
                });
            }
            await this.loadApples();
            this.showNotification('Entry deleted!', 'success');
            this.sortData();
            this.renderData();
            this.selectedItems.clear();
        }catch (error){
            console.error('Error deleting entry:', error);
            this.showNotification(`Error deleting entry: ${error.message}`, 'error');
        }
    }

    saveAndRefresh() {
        this.saveToStorage();
        this.filteredData = [...this.data];
        this.sortData();
        this.renderData();
        this.closeModal(document.getElementById('entryModal'));
        this.showNotification('Entry saved successfully', 'success');
    }

    saveToStorage(){
        localStorage.setItem('searchListData', JSON.stringify(this.data));
    }

    // ── Table rendering ───────────────────────────────────────────────────────

    renderTableView(){
        console.log("Rendering table view for " + this.filteredData.length + " apples");

        const tbody = document.getElementById('tableBody');
        tbody.innerHTML = '';

        this.initializeTableHeaders();
        this.initializeTableFilters();
        if(this.shownColumnsTableView.length == 0)
        {
            tbody.innerText = 'Select at least one column to display data';
            return;
        }

        this.filteredData.forEach(apple => {
            const row = tbody.insertRow();
            const checkboxCell = row.insertCell();

            checkboxCell.className = 'checkbox-cell';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'row-checkbox';
            checkbox.value = apple.id;
            checkbox.checked = this.selectedItems.has(apple);
            if(checkbox.checked){
                row.classList.add("selected-row");
            }
            checkbox.addEventListener('change', (e) => {
                this.handleRowSelection(apple, e.target.checked, row);
            });
            checkboxCell.appendChild(checkbox);

            const imageCell = row.insertCell();
            imageCell.className = 'image-cell';
            if (apple.image) {
                const img = document.createElement('img');
                img.src = apple.image;
                img.className = 'table-image';
                img.onclick = () => this.openImageModal(apple);
                imageCell.appendChild(img);
            } else {
                const uploadBtn = document.createElement('button');
                uploadBtn.textContent = '+ Add';
                uploadBtn.className = 'upload-image-btn';
                uploadBtn.onclick = () => this.openImageModal(apple);

                if(this.userRole === 'Viewer'){
                    uploadBtn.disabled = true;
                    uploadBtn.style.cursor = 'not-allowed';
                    uploadBtn.style.opacity = '0.5';
                }

                imageCell.appendChild(uploadBtn);
            }

            this.columns.forEach(column =>{
                if(!this.shownColumnsTableView.includes(column)){
                    return;
                }
                const newCell = row.insertCell();
                newCell.textContent = this.getPropertyOfItem(apple,column);
            });
        });

        document.getElementById('selectAll').addEventListener('change', (e) => {
            this.handleSelectAll(e.target.checked);
        });
    }

    renderPictureView(){
        const grid = document.getElementById('pictureGrid');

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
                img.onclick = () => this.openImageModal(item);
                imageContainer.appendChild(img);
            } else {
                imageContainer.textContent = 'No Image Available';
                imageContainer.style.cursor = 'pointer';
                imageContainer.onclick = () => this.openImageModal(item);
            }
            
            const content = document.createElement('div');
            content.className = 'picture-card-content';

            const innerHeader = document.createElement('h4');
            innerHeader.textContent = this.getPropertyOfItem(item,'cultivarName');
            content.appendChild(innerHeader);

            this.shownColumnsPictureView.forEach(column =>{
                const infoRow = document.createElement("div");
                infoRow.classList.add('info-row');

                const infoLabel = document.createElement('span');
                infoLabel.classList.add('info-label');
                infoLabel.textContent = this.getShortColumnName(column) + ': ';

                const infoValue = document.createElement('span');
                infoValue.classList.add('info-value');
                infoValue.textContent = this.getPropertyOfItem(item, column);

                this.appendChildren(content,[infoRow,infoLabel,infoValue]);
            })
            
            content.onclick = () => this.openEntryModal(item);
            content.style.cursor = 'pointer';
            
            this.appendChildren(card,[imageContainer,content])
            grid.appendChild(card);
        });
    }

    // ── Table headers & filters ───────────────────────────────────────────────

    async initializeTableHeaders(){
        console.log("Initializing table headers...");
        const headerRow = document.getElementById('table-headers');
        headerRow.innerHTML = '';
        if(this.shownColumnsTableView.length == 0)
        {
            return;
        }
        const cbc = document.createElement('th');
        cbc.classList.add('checkbox-column');
        cbc.innerHTML = '<input type="checkbox" id="selectAll" title="Select All">';
        headerRow.appendChild(cbc);

        const colHeadImg = document.createElement('th');
        colHeadImg.innerHTML = 'Image';
        headerRow.appendChild(colHeadImg);

        this.columns.forEach(item =>{
            if(!this.shownColumnsTableView.includes(item)){
                return;
            }
            const colHead = document.createElement('th');
            colHead.classList.add('sortable');
            colHead.innerHTML = this.getShortColumnName(item) + '<span class="sort-arrow">' + 
            (this.sortColumn == item ? (this.sortDirection == 'asc' ? '↑' : '↓') : '↕' ) + '</span>';
            headerRow.appendChild(colHead);
        })
    }

    async initializeTableFilters(){
        console.log("Initializing table filters...");
        const headerRow = document.getElementById('table-filters');
        headerRow.innerHTML = '';
        if(this.shownColumnsTableView.length == 0)
        {
            return;
        }
        const cbc = document.createElement('th');
        headerRow.appendChild(cbc);
        headerRow.appendChild(document.createElement('th'));
        this.columns.forEach((column) =>{this.initializeColumnFilter(column)});
        this.bindFilters();
    }

    initializeColumnFilter(column){
        const headerRow = document.getElementById('table-filters');
        if(!this.shownColumnsTableView.includes(column)){
            return;
        }
        const colHead = document.createElement('th');
        headerRow.appendChild(colHead);

        const filterGroupDiv = (document.getElementById(column + 'filterGroupDiv') === null ? document.createElement('div') : document.getElementById(column + 'filterGroupDiv'));
        filterGroupDiv.innerHTML = '';

        const filterSelect = document.createElement('input');
        const filterDataList = document.createElement('datalist');
        filterDataList.setAttribute('id',`${column}FilterDataList`);
        filterSelect.setAttribute('placeholder',"All");
        filterSelect.setAttribute('list',`${column}FilterDataList`);
        filterSelect.classList.add('filterSelect');
        filterSelect.setAttribute('id',`${column}FilterSelect`);

        colHead.appendChild(filterGroupDiv);
        colHead.appendChild(filterDataList);
        filterGroupDiv.appendChild(filterSelect);       

        const kw = new Set();
        this.filteredData.forEach(item => {
            if(this.getPropertyOfItem(item,column))
            {
                kw.add(this.getPropertyOfItem(item,column));
            }
        });
        const keywords = Array.from(kw).sort();
        keywords.forEach(keyword =>{
            const newOption = document.createElement('option');
            newOption.textContent = keyword;
            newOption.setAttribute('value', keyword);
            filterDataList.appendChild(newOption);
        })

        let index = this.columns.indexOf(column);
        if(this.currentFilters[index] == null){
            filterSelect.value = "";
        }
        else{
            filterSelect.value = this.currentFilters[index];
        }
    }

    // ── Filters ───────────────────────────────────────────────────────────────

    toggleFilterPanel() {
        const panel = document.getElementById('filterPanel');
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }

    applyFilters(){
        console.log("Applying filters");
        this.storeFilters();
        const tempApples = this.data.filter(item => {
            return (this.appleSatisfiesFilters(item))
        });
        console.log(tempApples.length);
        this.filteredData = [...tempApples];
    }

    clearFilters(){
        const filters = document.querySelectorAll('.filterSelect');
        filters.forEach(filter =>{
            filter.value = '';
        });
        this.filteredData = [...this.data];
    }

    storeFilters(){
        this.currentFilters = [];
        this.columns.forEach(item =>{
            const filt = document.getElementById(`${item}FilterSelect`);
            if(filt){
                this.currentFilters.push(filt.value);
            }else{
                this.currentFilters.push(null);
            }
        });
        console.log("Current filters: " + this.currentFilters);
    }

    appleSatisfiesFilters(item){
        const filters = document.querySelectorAll('.filterSelect');
        let satisfies = true;
        filters.forEach((filter, index) =>{
            if(filter.value == ''){
                return;
            }
            const column = this.shownColumnsTableView[index];
            if(!this.getPropertyOfItem(item,column))
            {
                satisfies = false;
                return;
            }
            if(!this.getPropertyOfItem(item,column).toString().toLowerCase().includes(filter.value.toLowerCase())){
                satisfies = false;
                return;
            }
        });
        return satisfies;
    }

    // ── Column show/hide ──────────────────────────────────────────────────────

    showOrHideColumnUsingCheckbox(checkbox){
        if(this.isMultiSelectActive)
        {
            return;
        }
        const column = (checkbox.id.slice(0, checkbox.id.length-8));
        if(checkbox.checked){
            this.shownColumnsTableView.push(column);
            this.sortableColumns.push(column);
            this.renderSortColumnOptions();
            this.shownColumnsTableView.sort((a,b)=>{
                return (this.columns.indexOf(a)-this.columns.indexOf(b));
            })
        }
        else{
            this.shownColumnsTableView.splice(this.shownColumnsTableView.indexOf(column), 1);
        }
        this.renderData();
    }

    showAllColumns(){    
        this.isMultiSelectActive = true;
        document.querySelectorAll('.show-column-checkbox').forEach((checkbox) => {
            checkbox.checked = true;
        });
        this.shownColumnsTableView = [...this.columns];
        this.isMultiSelectActive = false;
        this.renderData();
    }

    hideAllColumns(){    
        this.isMultiSelectActive = true;
        document.querySelectorAll('.show-column-checkbox').forEach((checkbox) => {
            checkbox.checked = false;
        });
        this.shownColumnsTableView.length = 0;
        this.isMultiSelectActive = false;
        this.renderData();
    }

    // ── Getter helpers ────────────────────────────────────────────────────────

    getPropertyOfItem(item, column){
        if(column.includes(':')){
            const upper = column.split(':')[0];
            const nested = column.split(':')[1];
            if(item.hasOwnProperty(upper)){
                if (item[upper].hasOwnProperty(nested)) {
                    return item[upper][nested];
                }
            }  
        }
        else{
            if(column in item){
                return item[column];
            }
        }
        return "";
    }

    getReadableColumnName(item){
        if(item.includes(':')){
            const readableName = this.getReadableColumnName(item.split(':')[0]) + ": " + this.getReadableColumnName(item.split(':')[1]);
            return readableName;
        }
        if(item.includes(' ')){
            const readableName = (item.split(' ')).forEach(word =>{
                this.getReadableColumnName(word);
            }).join();
            return readableName;
        }
        if(item.includes('_')){
            return this.getReadableColumnName(item.replaceAll('_',""));
        }
        return (item.charAt(0).toUpperCase() + item.slice(1).replaceAll(/[A-Z]/g,function(match){
            return " " + match;
        }));
    }

    getShortColumnName(item){
        if(item.includes(':')){
            return this.getReadableColumnName(item.split(':')[1]);
        }
        if(item.includes(' ')){
            const readableName = (item.split(' ')).forEach(word =>{
                this.getReadableColumnName(word);
            }).join();
            return readableName;
        }
        if(item.includes('_')){
            return this.getReadableColumnName(item.replaceAll('_',""));
        }
        return (item.charAt(0).toUpperCase() + item.slice(1).replaceAll(/[A-Z]/g,function(match){
            return " " + match;
        }));
    }

    // ── Misc helpers ──────────────────────────────────────────────────────────

    appendChildren(parent, children){
        children.forEach(child => {
            parent.appendChild(child);
        })
    }
}   

document.addEventListener('DOMContentLoaded', () => {
    const searchListManager = new SearchListManager();

    // Disable add/edit/delete/import buttons for viewers
    if(searchListManager.userRole === 'Viewer'){
        const addEntryBtn = document.getElementById('addEntryBtn');
        const editEntryBtn = document.getElementById('editEntryBtn');
        const deleteEntryBtn = document.getElementById('delEntryBtn');
        const importBtn = document.getElementById('importBtn');
        const massImageBtn = document.getElementById('massImageBtn');
        
        addEntryBtn.disabled = true;
        editEntryBtn.disabled = true;
        deleteEntryBtn.disabled = true;
        importBtn.disabled = true;
        massImageBtn.disabled = true;
        addEntryBtn.style.cursor = 'not-allowed';
        editEntryBtn.style.cursor = 'not-allowed';
        deleteEntryBtn.style.cursor = 'not-allowed';
        importBtn.style.cursor = 'not-allowed';
        importBtn.style.pointerEvents = "none";
        massImageBtn.style.cursor = 'not-allowed';
    }
});