import { Sofa3DVisualizer } from './three-visualizer.js';
import { Sofa2DPlanner } from './canvas-2d.js';

// Application State
const state = {
    // Room dimensions (cm)
    wallA: 400,
    wallB: 300,
    
    // Sofa properties (cm)
    type: 'straight', // 'straight' | 'l-shape' | 'u-shape'
    width: 240,
    depth: 90,
    chaiseDepth: 160,
    chaiseWidth: 90,
    chaiseDir: 'left', // 'left' | 'right'
    height: 80,
    seatHeight: 42,
    armrestWidth: 20,
    cushionCount: 3,
    
    // Styling properties
    color: '#f1ebd9',
    colorName: 'Krem Kadife',
    legType: 'wood', // 'wood' | 'brass' | 'black'
    legHeight: 15,
    
    // Customer Info
    customerName: '',
    customerPhone: '',
    customerNotes: ''
};

// Global Visualizer Instances
let visualizer3D;
let planner2D;

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Visualizers
    visualizer3D = new Sofa3DVisualizer('three-container');
    planner2D = new Sofa2DPlanner('canvas-2d');

    // Load initial parameters into visualizers
    syncVisualizers();

    // Set up UI Interaction Event Listeners
    setupSidebarTabs();
    setupViewerTabs();
    setupInputsSync();
    setupSofaTypeSelector();
    setupColorSwatches();
    setupLegSelector();
    setupFileActions();
    setupPrintAction();
    setupSaveActions();
    
    // Show welcome toast
    showToast('Hoş geldiniz! Koltuk tasarım aracı hazır.', 'success');
});

// Sync both 2D and 3D Visualizers with current State
function syncVisualizers() {
    if (visualizer3D) {
        visualizer3D.setSofaParams(state);
    }
    if (planner2D) {
        planner2D.updateRoom(state.wallA, state.wallB);
        planner2D.updateSofa({
            type: state.type,
            width: state.width,
            depth: state.depth,
            chaiseDepth: state.chaiseDepth,
            chaiseWidth: state.chaiseWidth,
            chaiseDir: state.chaiseDir,
            armrestWidth: state.armrestWidth,
            cushionCount: state.cushionCount,
            color: state.color
        });
    }
}

// 1. Sidebar Tab Navigation
function setupSidebarTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const targetPanelId = tab.getAttribute('data-tab');
            const panels = document.querySelectorAll('.tab-panel');
            panels.forEach(p => p.classList.remove('active'));
            document.getElementById(targetPanelId).classList.add('active');
        });
    });
}

// 2. Viewer Tabs (3D vs 2D Toggle)
function setupViewerTabs() {
    const viewTabs = document.querySelectorAll('.view-tab-btn');
    viewTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            viewTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const targetView = tab.getAttribute('data-view');
            const panels = document.querySelectorAll('.viewer-panel');
            
            // Hide all panels
            panels.forEach(p => {
                p.classList.remove('active');
            });

            // Show active panel
            if (targetView === '3d') {
                document.getElementById('three-container').classList.add('active');
                if (visualizer3D) visualizer3D.resize();
            } else {
                document.getElementById('canvas-container').classList.add('active');
                // Redraw 2D canvas to fit layout boundary
                if (planner2D) planner2D.redraw();
            }
        });
    });

    // 2D Specific buttons
    document.getElementById('btn-rotate-2d').addEventListener('click', () => {
        if (planner2D) planner2D.rotateSofa();
    });

    document.getElementById('btn-reset-pos').addEventListener('click', () => {
        if (planner2D) planner2D.resetPosition();
    });

    // 3D Screenshot Button
    document.getElementById('btn-screenshot').addEventListener('click', () => {
        if (visualizer3D) {
            const dataUrl = visualizer3D.takeScreenshot();
            const link = document.createElement('a');
            link.download = `koltuk_tasarim_${state.customerName || '3d'}.png`;
            link.href = dataUrl;
            link.click();
            showToast('3D Görsel indirildi!', 'success');
        }
    });
}

// 3. Slider and Input Box Sync (Two-Way Binding)
function setupInputsSync() {
    // Inputs Map: [Slider ID, Number Input ID, Output Value Span ID, State Property Name]
    const inputsConfig = [
        ['input-wall-a', 'num-wall-a', 'val-wall-a', 'wallA'],
        ['input-wall-b', 'num-wall-b', 'val-wall-b', 'wallB'],
        ['input-sofa-width', 'num-sofa-width', 'val-sofa-width', 'width'],
        ['input-sofa-depth', 'num-sofa-depth', 'val-sofa-depth', 'depth'],
        ['input-chaise-depth', 'num-chaise-depth', 'val-chaise-depth', 'chaiseDepth'],
        ['input-chaise-width', 'num-chaise-width', 'val-chaise-width', 'chaiseWidth'],
        ['input-sofa-height', 'num-sofa-height', 'val-sofa-height', 'height'],
        ['input-seat-height', 'num-seat-height', 'val-seat-height', 'seatHeight'],
        ['input-armrest-width', 'num-armrest-width', 'val-armrest-width', 'armrestWidth'],
        ['input-leg-height', 'num-leg-height', 'val-leg-height', 'legHeight']
    ];

    inputsConfig.forEach(([sliderId, numberId, spanId, prop]) => {
        const sliderEl = document.getElementById(sliderId);
        const numberEl = document.getElementById(numberId);
        const spanEl = document.getElementById(spanId);

        if (!sliderEl || !numberEl) return;

        // On Slider Change
        sliderEl.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            numberEl.value = val;
            if (spanEl) spanEl.textContent = val;
            state[prop] = val;
            
            validateAndSyncState(prop);
        });

        // On Number Input Change
        numberEl.addEventListener('change', (e) => {
            let val = parseInt(e.target.value);
            const min = parseInt(numberEl.min);
            const max = parseInt(numberEl.max);

            if (isNaN(val)) val = min;
            if (val < min) val = min;
            if (val > max) val = max;

            numberEl.value = val;
            sliderEl.value = val;
            if (spanEl) spanEl.textContent = val;
            state[prop] = val;

            validateAndSyncState(prop);
        });
    });

    // Cushion count slider (straight only)
    const cushionSlider = document.getElementById('input-cushion-count');
    if (cushionSlider) {
        cushionSlider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            document.getElementById('val-cushion-count').textContent = val;
            state.cushionCount = val;
            syncVisualizers();
        });
    }

    // Customer form binding
    const nameInput = document.getElementById('customer-name');
    const phoneInput = document.getElementById('customer-phone');
    const notesInput = document.getElementById('customer-notes');

    nameInput.addEventListener('input', (e) => state.customerName = e.target.value);
    phoneInput.addEventListener('input', (e) => state.customerPhone = e.target.value);
    notesInput.addEventListener('input', (e) => state.customerNotes = e.target.value);
}

// Validate business constraints on changes
function validateAndSyncState(changedProp) {
    // 1. Armrest width check
    if (state.type === 'straight') {
        const minSeatingW = 50; // At least 50cm seating space
        if (state.width - 2 * state.armrestWidth < minSeatingW) {
            state.armrestWidth = Math.floor((state.width - minSeatingW) / 2);
            updateUIValue('input-armrest-width', 'num-armrest-width', 'val-armrest-width', state.armrestWidth);
        }
    }

    // 2. Leg height cannot exceed seat height
    if (state.legHeight >= state.seatHeight - 10) {
        state.legHeight = Math.max(5, state.seatHeight - 10);
        updateUIValue('input-leg-height', 'num-leg-height', 'val-leg-height', state.legHeight);
    }

    // 3. Seat height cannot exceed backrest height
    if (state.seatHeight >= state.height - 15) {
        state.seatHeight = state.height - 15;
        updateUIValue('input-seat-height', 'num-seat-height', 'val-seat-height', state.seatHeight);
    }

    syncVisualizers();
}

function updateUIValue(sliderId, numberId, spanId, val) {
    const s = document.getElementById(sliderId);
    const n = document.getElementById(numberId);
    const sp = document.getElementById(spanId);
    if (s) s.value = val;
    if (n) n.value = val;
    if (sp) sp.textContent = val;
}

// 4. Sofa Type Selector (Straight vs L-Shape vs U-Shape)
function setupSofaTypeSelector() {
    const radios = document.getElementsByName('sofa-type');
    radios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            state.type = e.target.value;
            
            // Toggle specific UI sections depending on sofa type
            const lElements = document.querySelectorAll('.l-only');
            const uElements = document.querySelectorAll('.u-only');
            const straightElements = document.querySelectorAll('.straight-only');

            if (state.type === 'straight') {
                lElements.forEach(el => el.style.display = 'none');
                uElements.forEach(el => el.style.display = 'none');
                straightElements.forEach(el => el.style.display = 'block');
            } 
            else if (state.type === 'l-shape') {
                lElements.forEach(el => el.style.display = 'block');
                uElements.forEach(el => el.style.display = 'block');
                straightElements.forEach(el => el.style.display = 'none');
            } 
            else if (state.type === 'u-shape') {
                lElements.forEach(el => el.style.display = 'none'); // Chaise depth is shown but direction selector not needed or customized
                uElements.forEach(el => el.style.display = 'block');
                straightElements.forEach(el => el.style.display = 'none');
                
                // Show chaise depth for U-shape as well (using .u-only)
                const chaiseDepthConfig = document.getElementById('input-chaise-depth').closest('.control-group');
                const chaiseWidthConfig = document.getElementById('input-chaise-width').closest('.control-group');
                if (chaiseDepthConfig) chaiseDepthConfig.style.display = 'block';
                if (chaiseWidthConfig) chaiseWidthConfig.style.display = 'block';
            }

            syncVisualizers();
        });
    });

    // Chaise Direction Selectors
    const dirRadios = document.getElementsByName('chaise-dir');
    dirRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            state.chaiseDir = e.target.value;
            syncVisualizers();
        });
    });
}

// 5. Color Swatches Selection
function setupColorSwatches() {
    const swatches = document.querySelectorAll('.color-swatch');
    const colorLabel = document.getElementById('selected-color-name');
    
    swatches.forEach(swatch => {
        swatch.addEventListener('click', () => {
            swatches.forEach(s => s.classList.remove('active'));
            swatch.classList.add('active');
            
            const color = swatch.getAttribute('data-color');
            const name = swatch.getAttribute('data-name');
            
            state.color = color;
            state.colorName = name;
            colorLabel.textContent = name;
            
            syncVisualizers();
        });
    });
}

// 6. Leg Selector Sync
function setupLegSelector() {
    const selectLeg = document.getElementById('select-leg-type');
    if (selectLeg) {
        selectLeg.addEventListener('change', (e) => {
            state.legType = e.target.value;
            syncVisualizers();
        });
    }
}

// 7. File Upload/Download Actions (JSON)
function setupFileActions() {
    const btnExport = document.getElementById('btn-export');
    const btnImportTrigger = document.getElementById('btn-import-trigger');
    const fileImport = document.getElementById('file-import');

    btnExport.addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `koltuk_tasarim_${state.customerName || 'proje'}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        showToast('JSON tasarım dosyası indirildi.', 'success');
    });

    btnImportTrigger.addEventListener('click', () => {
        fileImport.click();
    });

    fileImport.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedState = JSON.parse(event.target.result);
                // Merge with default state
                Object.assign(state, importedState);
                
                // Update UI Controls to match imported state
                updateUIElementsToMatchState();
                
                // Redraw
                syncVisualizers();
                showToast('Tasarım başarıyla yüklendi!', 'success');
            } catch (err) {
                showToast('HATA: Geçersiz dosya formatı.', 'error');
            }
        };
        reader.readAsText(file);
    });
}

// Update UI to match the current memory state (used after loading/importing)
function updateUIElementsToMatchState() {
    // Sync Wall / Sofa inputs
    const props = ['wallA', 'wallB', 'width', 'depth', 'chaiseDepth', 'chaiseWidth', 'height', 'seatHeight', 'armrestWidth', 'legHeight'];
    props.forEach(p => {
        // Find matching slider / number
        const s = document.querySelector(`input[type="range"][id$="-${p.replace(/([A-Z])/g, '-$1').toLowerCase()}"]`);
        // Note: property names map slightly differently. Let's do simple mapping:
        let idBase = p;
        if (p === 'wallA') idBase = 'wall-a';
        else if (p === 'wallB') idBase = 'wall-b';
        else if (p === 'width') idBase = 'sofa-width';
        else if (p === 'depth') idBase = 'sofa-depth';
        else if (p === 'chaiseDepth') idBase = 'chaise-depth';
        else if (p === 'chaiseWidth') idBase = 'chaise-width';
        else if (p === 'height') idBase = 'sofa-height';
        else if (p === 'seatHeight') idBase = 'seat-height';
        else if (p === 'armrestWidth') idBase = 'armrest-width';
        else if (p === 'legHeight') idBase = 'leg-height';

        updateUIValue(`input-${idBase}`, `num-${idBase}`, `val-${idBase}`, state[p]);
    });

    // Sofa type
    const typeRadio = document.querySelector(`input[name="sofa-type"][value="${state.type}"]`);
    if (typeRadio) {
        typeRadio.checked = true;
        typeRadio.dispatchEvent(new Event('change'));
    }

    // Chaise dir
    const dirRadio = document.querySelector(`input[name="chaise-dir"][value="${state.chaiseDir}"]`);
    if (dirRadio) dirRadio.checked = true;

    // Cushion count
    const cushionSlider = document.getElementById('input-cushion-count');
    if (cushionSlider) {
        cushionSlider.value = state.cushionCount;
        document.getElementById('val-cushion-count').textContent = state.cushionCount;
    }

    // Color swatch active
    const swatches = document.querySelectorAll('.color-swatch');
    swatches.forEach(s => {
        if (s.getAttribute('data-color') === state.color) {
            s.classList.add('active');
            document.getElementById('selected-color-name').textContent = state.colorName;
        } else {
            s.classList.remove('active');
        }
    });

    // Leg type select
    const legSelect = document.getElementById('select-leg-type');
    if (legSelect) legSelect.value = state.legType;

    // Text inputs
    document.getElementById('customer-name').value = state.customerName || '';
    document.getElementById('customer-phone').value = state.customerPhone || '';
    document.getElementById('customer-notes').value = state.customerNotes || '';
}

// 8. LocalStorage Save / Load Management
function setupSaveActions() {
    const btnSave = document.getElementById('btn-save');
    const btnNew = document.getElementById('btn-new');
    const btnToggleDesigns = document.getElementById('btn-designs');
    const designsMenu = document.getElementById('designs-menu');

    // Toggle Saved designs dropdown
    btnToggleDesigns.addEventListener('click', (e) => {
        designsMenu.classList.toggle('show');
        e.stopPropagation();
    });

    document.addEventListener('click', () => {
        designsMenu.classList.remove('show');
    });

    // Save current design
    btnSave.addEventListener('click', () => {
        const name = state.customerName.trim() || `Tasarım ${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR')}`;
        
        let savedDesigns = JSON.parse(localStorage.getItem('sofa_designs') || '[]');
        
        // If overwrite exists, update it, else append
        const existingIndex = savedDesigns.findIndex(d => d.id === name);
        const designData = {
            id: name,
            timestamp: Date.now(),
            state: { ...state }
        };

        if (existingIndex > -1) {
            savedDesigns[existingIndex] = designData;
        } else {
            savedDesigns.push(designData);
        }

        localStorage.setItem('sofa_designs', JSON.stringify(savedDesigns));
        renderSavedDesignsList();
        showToast(`Tasarım "${name}" kaydedildi!`, 'success');
    });

    // Start a clean slate
    btnNew.addEventListener('click', () => {
        if (confirm('Tüm mevcut çizimleri sıfırlayıp yeni bir tasarıma başlamak istediğinizden emin misiniz?')) {
            // Reset to defaults
            Object.assign(state, {
                wallA: 400,
                wallB: 300,
                type: 'straight',
                width: 240,
                depth: 90,
                chaiseDepth: 160,
                chaiseWidth: 90,
                chaiseDir: 'left',
                height: 80,
                seatHeight: 42,
                armrestWidth: 20,
                cushionCount: 3,
                color: '#f1ebd9',
                colorName: 'Krem Kadife',
                legType: 'wood',
                legHeight: 15,
                customerName: '',
                customerPhone: '',
                customerNotes: ''
            });

            updateUIElementsToMatchState();
            syncVisualizers();
            showToast('Yeni tasarım sayfası açıldı.', 'success');
        }
    });

    renderSavedDesignsList();
}

// Render dropdown with locally saved designs
function renderSavedDesignsList() {
    const designsMenu = document.getElementById('designs-menu');
    if (!designsMenu) return;

    const savedDesigns = JSON.parse(localStorage.getItem('sofa_designs') || '[]');
    designsMenu.innerHTML = '';

    if (savedDesigns.length === 0) {
        designsMenu.innerHTML = '<span class="dropdown-empty">Kayıtlı tasarım bulunamadı</span>';
        return;
    }

    savedDesigns.sort((a, b) => b.timestamp - a.timestamp).forEach(design => {
        const item = document.createElement('div');
        item.className = 'dropdown-item';
        
        const textSpan = document.createElement('span');
        textSpan.textContent = design.id;
        textSpan.style.cursor = 'pointer';
        textSpan.addEventListener('click', () => {
            Object.assign(state, design.state);
            updateUIElementsToMatchState();
            syncVisualizers();
            showToast(`"${design.id}" yüklendi.`, 'success');
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`"${design.id}" silinecektir. Emin misiniz?`)) {
                let currentDesigns = JSON.parse(localStorage.getItem('sofa_designs') || '[]');
                currentDesigns = currentDesigns.filter(d => d.id !== design.id);
                localStorage.setItem('sofa_designs', JSON.stringify(currentDesigns));
                renderSavedDesignsList();
                showToast('Tasarım silindi.', 'success');
            }
        });

        item.appendChild(textSpan);
        item.appendChild(deleteBtn);
        designsMenu.appendChild(item);
    });
}

// 9. Printing & Proposal Layout Generation
function setupPrintAction() {
    const btnPrint = document.getElementById('btn-print');

    btnPrint.addEventListener('click', () => {
        // 1. Sync State to Quotation PDF Form elements
        document.getElementById('print-date').textContent = new Date().toLocaleDateString('tr-TR');
        document.getElementById('print-quote-id').textContent = 'KT-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);

        document.getElementById('print-cust-name').textContent = state.customerName || 'Ahmet Yılmaz';
        document.getElementById('print-cust-phone').textContent = state.customerPhone || 'Girilmedi';
        document.getElementById('print-cust-notes').textContent = state.customerNotes || 'Belirtilmedi';

        document.getElementById('print-wall-a').textContent = state.wallA;
        document.getElementById('print-wall-b').textContent = state.wallB;

        // Sofa spec table mapping
        const typeLabels = {
            'straight': 'Düz Model Koltuk',
            'l-shape': `L-Köşe Köşe Takımı (${state.chaiseDir === 'left' ? 'Sol' : 'Sağ'} Uzanmalı)`,
            'u-shape': 'U-Köşe Köşe Takımı'
        };
        document.getElementById('print-spec-type').textContent = typeLabels[state.type];
        document.getElementById('print-spec-width').textContent = state.width;
        document.getElementById('print-spec-depth').textContent = state.depth;
        document.getElementById('print-spec-height').textContent = state.height;
        document.getElementById('print-spec-seat-height').textContent = state.seatHeight;
        document.getElementById('print-spec-armrest').textContent = state.armrestWidth;

        // Handle L/U specific chaise rows
        const chaiseRow = document.querySelector('.print-chaise-row');
        if (state.type !== 'straight') {
            chaiseRow.style.display = 'table-row';
            document.getElementById('print-spec-chaise-depth').textContent = state.chaiseDepth;
            document.getElementById('print-spec-chaise-width').textContent = state.chaiseWidth;
        } else {
            chaiseRow.style.display = 'none';
        }

        document.getElementById('print-spec-fabric').textContent = `${state.colorName} (${state.color})`;
        
        const legLabels = {
            'wood': 'Doğal Ahşap',
            'brass': 'Pirinç Altın Metal',
            'black': 'Siyah Mat Metal'
        };
        document.getElementById('print-spec-leg-type').textContent = legLabels[state.legType];
        document.getElementById('print-spec-leg-height').textContent = state.legHeight;

        // 2. Capture Snapshots
        showToast('Fotoğraflar derleniyor...', 'success');
        
        // Wait a small frame for canvases to sync and render
        setTimeout(() => {
            // Threejs snapshot
            if (visualizer3D) {
                const img3dUrl = visualizer3D.takeScreenshot();
                document.getElementById('print-img-3d').src = img3dUrl;
            }

            // 2D Planner snapshot
            if (planner2D) {
                // Ensure 2D plan is drawn with dimensions before print
                planner2D.redraw();
                const img2dUrl = planner2D.takeScreenshot();
                document.getElementById('print-img-2d').src = img2dUrl;
            }

            // Trigger browser print action
            // This pops up native print dialog to save as PDF
            window.print();
        }, 300);
    });
}

// UI Toast feedback helper
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = `toast show ${type}`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Register Service Worker for PWA (Offline support)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('Service Worker registered successfully:', reg.scope))
            .catch(err => console.warn('Service Worker registration failed:', err));
    });
}

