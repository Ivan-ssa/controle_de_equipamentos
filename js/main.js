// js/main.js

import { readExcelFile } from './excelReader.js';
import { renderTable, populateSectorFilter, updateEquipmentCount } from './tableRenderer.js';
import { applyFilters } from './filterLogic.js';
import { renderOsTable } from './osRenderer.js'; 
import { renderDivergenceTable } from './divergenceRenderer.js';
import { initRonda, loadExistingRonda, saveRonda, populateRondaSectorSelect } from './rondaManager.js'; 


// === FUNÇÃO DE NORMALIZAÇÃO DE NÚMERO DE SÉRIE / PATRIMÔNIO ===
function normalizeId(id) {
    if (id === null || id === undefined) {
        return '';
    }
    let strId = String(id).trim(); 

    if (/^\d+$/.test(strId)) { 
        return String(parseInt(strId, 10)); 
    }
    return strId.toLowerCase(); 
}
// =============================================================

let allEquipments = [];
window.consolidatedCalibratedMap = new Map(); 
window.consolidatedCalibrationsRawData = []; 
window.externalMaintenanceSNs = new Set(); 
window.osRawData = []; 
window.rondaData = []; 
window.divergenceSNs = new Set();
window.rawDivergenceData = [];
window.rondaResultsMap = new Map(); // ADICIONADO


// Referências aos elementos do DOM
const excelFileInput = document.getElementById('excelFileInput');
const processButton = document.getElementById('processButton');
const outputDiv = document.getElementById('output');
const equipmentTableBody = document.querySelector('#equipmentTable tbody');
const osTableBody = document.querySelector('#osTable tbody'); 
const sectorFilter = document.getElementById('sectorFilter'); 
const calibrationStatusFilter = document.getElementById('calibrationStatusFilter');
const searchInput = document.getElementById('searchInput'); 
const maintenanceFilter = document.getElementById('maintenanceFilter'); 
const exportButton = document.getElementById('exportButton');
const exportOsButton = document.getElementById('exportOsButton'); 


const headerFiltersRow = document.getElementById('headerFilters'); 
// ... (resto das suas referências DOM originais)


async function handleProcessFile() {
        outputDiv.textContent = 'Processando arquivo Excel...';
        const file = excelFileInput.files[0];
        if (!file) {
            outputDiv.textContent = 'Por favor, selecione um arquivo Excel.';
            return;
        }
    
        try {
            outputDiv.textContent = `Lendo o arquivo: ${file.name}...`;
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);

            // 1. LÊ A ABA MESTRE (PRIMEIRA ABA) E PROCESSA TUDO
            const masterSheetName = workbook.SheetNames[0];
            const masterWorksheet = workbook.Sheets[masterSheetName];
            allEquipments = XLSX.utils.sheet_to_json(masterWorksheet, { raw: true, defval: '' });

            outputDiv.textContent = `Arquivo mestre com ${allEquipments.length} equipamentos carregado.`;
            
            const mainEquipmentsBySN = new Map();
            const mainEquipmentsByPatrimonio = new Map();

            window.consolidatedCalibratedMap.clear();
            window.externalMaintenanceSNs.clear();
            window.osRawData = [];
            window.divergenceSNs.clear();

            allEquipments.forEach(item => {
                const sn = normalizeId(item['Nº Série'] || item.NumeroSerie);
                const patrimonio = normalizeId(item['Patrimônio'] || item.Patrimonio);
                if (sn) mainEquipmentsBySN.set(item, item);
                if (patrimonio) mainEquipmentsByPatrimonio.set(item, item);

                const fornecedor = String(item['Fornecedor'] || '').trim();
                const dataCalib = item['Data Calibração'];
                if (sn && fornecedor !== '') {
                    window.consolidatedCalibratedMap.set(sn, { fornecedor, dataCalibricao: dataCalib });
                }

                const manutencaoExterna = String(item['Manutenção Externa'] || '').trim().toLowerCase();
                if (sn && (manutencaoExterna.includes('manutenção'))) {
                    window.externalMaintenanceSNs.add(sn);
                }

                const osNumero = String(item['OS'] || '').trim();
                if (osNumero !== '') {
                    window.osRawData.push(item);
                }
            });

            // 2. LÊ A ABA "RONDA" DO MESMO ARQUIVO (SE EXISTIR)
            window.rondaResultsMap.clear();
            if (workbook.SheetNames.includes('Ronda')) {
                const rondaWorksheet = workbook.Sheets['Ronda'];
                const rondaData = XLSX.utils.sheet_to_json(rondaWorksheet, { raw: true, defval: '' });
                rondaData.forEach(item => {
                    const sn = normalizeId(item['Nº de Série'] || item.NumeroSerie);
                    if (sn) {
                        window.rondaResultsMap.set(sn, {
                            Localizacao: String(item.Localizacao || item['Localização Encontrada'] || '').trim().toUpperCase(),
                            Status: item.Status
                        });
                    }
                });
                outputDiv.textContent += `\nAba 'Ronda' encontrada com ${window.rondaResultsMap.size} itens.`;
            }

            // 3. RENDERIZA TUDO COM TODAS AS INFORMAÇÕES
            outputDiv.textContent += '\nProcessamento concluído. Renderizando tabelas...';
            applyAllFiltersAndRender(); 
            populateSectorFilter(allEquipments, sectorFilter); 
            populateCalibrationStatusFilter(window.consolidatedCalibrationsRawData); 
            setupHeaderFilters(allEquipments);
            renderOsTable(window.osRawData, osTableBody, mainEquipmentsBySN, mainEquipmentsByPatrimonio, window.consolidatedCalibratedMap, window.externalMaintenanceSNs, normalizeId);
            populateRondaSectorSelect(allEquipments, rondaSectorSelect);
            initRonda([], rondaTableBody, rondaCountSpan, '', normalizeId);
            toggleSectionVisibility('equipmentSection'); 

        } catch (error) {
            outputDiv.textContent = `Erro ao processar o arquivo: ${error.message}`;
            console.error('Erro ao processar arquivos:', error);
        }
    }


function applyAllFiltersAndRender() {
    const filters = {
        sector: sectorFilter.value, 
        calibrationStatus: calibrationStatusFilter.value,
        search: normalizeId(searchInput.value), 
        maintenance: maintenanceFilter.value,
        headerFilters: {} 
    };
    // ... (resto da lógica de filtros) ...
    const filteredEquipments = applyFilters(allEquipments, filters, normalizeId); 
    
    // MODIFICADO: Adicionamos window.rondaResultsMap no final da chamada
    renderTable(filteredEquipments, equipmentTableBody, window.consolidatedCalibratedMap, window.externalMaintenanceSNs, normalizeId, window.rondaResultsMap); 
    
    updateEquipmentCount(filteredEquipments.length);
}

function populateCalibrationStatusFilter(rawCalibrationsData) {
    const filterElement = document.getElementById('calibrationStatusFilter');
    if (!filterElement) return; // Adiciona uma verificação de segurança

    filterElement.innerHTML = '<option value="">Todos os Status</option>';
    const fixedOptions = [
        { value: 'Calibrado (Consolidado)', text: 'Calibrado (Consolidado)' },
        { value: 'Não Calibrado/Não Encontrado', text: 'Não Calibrado/Não Encontrado' },
    ];
    fixedOptions.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.text;
        filterElement.appendChild(option);
    });

    // Esta parte do código pode ser reativada no futuro se você tiver
    // uma fonte de dados de calibração mais detalhada.
    /*
    const uniqueSuppliers = new Set();
    rawCalibrationsData.forEach(item => {
        const fornecedor = String(item.FornecedorConsolidacao || item.Fornecedor || '').trim();
        if (fornecedor) {
            uniqueSuppliers.add(fornecedor); 
        }
    });
    Array.from(uniqueSuppliers).sort().forEach(fornecedor => {
        const optionDivergence = document.createElement('option');
        optionDivergence.value = `Divergência (${fornecedor})`;
        optionDivergence.textContent = `Divergência (${fornecedor})`;
        filterElement.appendChild(optionDivergence);
    });
    */
}


function setupHeaderFilters(equipments) {
    headerFiltersRow.innerHTML = ''; 

    const headerFilterMap = {
        'TAG': { prop: 'TAG', type: 'text' },
        'Equipamento': { prop: 'Equipamento', type: 'select_multiple' }, 
        'Modelo': { prop: 'Modelo', type: 'select_multiple' },         
        'Fabricante': { prop: 'Fabricante', type: 'select_multiple' },     
        'Setor': { prop: 'Setor', type: 'select_multiple' },             
        'Nº Série': { prop: 'Nº Série', type: 'text' },
        'Patrimônio': { prop: 'Patrimônio', type: 'text' },
        'Fornecedor': { prop: 'Fornecedor', type: 'select_multiple' },
        'Data Calibração': { prop: 'Data Calibração', type: 'text' },
        'Data Vencimento Calibração': { prop: 'Data Vencimento Calibração', type: 'text' },
    };

    const originalHeaders = document.querySelectorAll('#equipmentTable thead tr:first-child th');
    originalHeaders.forEach(th => {
        const filterCell = document.createElement('th');
        const headerText = th.textContent.trim();
        if (!headerText) return;

        const columnInfo = headerFilterMap[headerText];
        if (columnInfo) {
            if (columnInfo.type === 'text') {
                const filterInput = document.createElement('input');
                filterInput.type = 'text';
                filterInput.placeholder = `Filtrar...`;
                filterInput.dataset.property = columnInfo.prop;
                filterInput.addEventListener('keyup', applyAllFiltersAndRender);
                filterCell.appendChild(filterInput);
            } else if (columnInfo.type === 'select_multiple') {
                const filterButton = document.createElement('div');
                filterButton.className = 'filter-button';
                filterButton.textContent = `Filtrar`; 
                filterButton.dataset.property = columnInfo.prop;
                const filterPopup = document.createElement('div');
                filterPopup.className = 'filter-popup';
                filterPopup.dataset.property = columnInfo.prop; 
                const searchPopupInput = document.createElement('input');
                searchPopupInput.type = 'text';
                searchPopupInput.placeholder = 'Buscar...';
                searchPopupInput.className = 'filter-search-input';
                filterPopup.appendChild(searchPopupInput);
                const optionsContainer = document.createElement('div'); 
                optionsContainer.className = 'filter-options-container'; 
                filterPopup.appendChild(optionsContainer);
                const uniqueValues = new Set();
                equipments.forEach(eq => {
                    let value = eq[columnInfo.prop];
                    if (value && String(value).trim() !== '') {
                        uniqueValues.add(String(value).trim());
                    }
                });
                const populateCheckboxes = (searchTerm = '') => {
                    optionsContainer.innerHTML = ''; 
                    const filteredValues = Array.from(uniqueValues).filter(val => String(val).toLowerCase().includes(searchTerm.toLowerCase())).sort();
                    const selectAllLabel = document.createElement('label');
                    selectAllLabel.className = 'select-all-label'; 
                    const selectAllCheckbox = document.createElement('input');
                    selectAllCheckbox.type = 'checkbox';
                    selectAllCheckbox.className = 'select-all';
                    selectAllCheckbox.checked = true; 
                    selectAllLabel.appendChild(selectAllCheckbox);
                    selectAllLabel.appendChild(document.createTextNode('(Selecionar Todos)'));
                    optionsContainer.appendChild(selectAllLabel);
                    selectAllCheckbox.addEventListener('change', () => {
                        const allIndividualCheckboxes = optionsContainer.querySelectorAll('input[type="checkbox"]:not(.select-all)');
                        allIndividualCheckboxes.forEach(cb => cb.checked = selectAllCheckbox.checked);
                        applyAllFiltersAndRender();
                    });
                    filteredValues.forEach(value => {
                        const label = document.createElement('label');
                        const checkbox = document.createElement('input');
                        checkbox.type = 'checkbox';
                        checkbox.value = value; 
                        checkbox.checked = true; 
                        checkbox.addEventListener('change', () => {
                            const allIndividualCheckboxes = optionsContainer.querySelectorAll('input[type="checkbox"]:not(.select-all)');
                            selectAllCheckbox.checked = Array.from(allIndividualCheckboxes).every(cb => cb.checked);
                            applyAllFiltersAndRender();
                        });
                        label.appendChild(checkbox);
                        label.appendChild(document.createTextNode(value));
                        optionsContainer.appendChild(label);
                    });
                };
                populateCheckboxes(); 
                searchPopupInput.addEventListener('keyup', (event) => populateCheckboxes(event.target.value));
                filterButton.addEventListener('click', (event) => {
                    document.querySelectorAll('.filter-popup.active').forEach(popup => {
                        if (popup !== filterPopup) popup.classList.remove('active');
                    });
                    filterPopup.classList.toggle('active'); 
                    event.stopPropagation(); 
                });
                document.addEventListener('click', (event) => {
                    if (!filterPopup.contains(event.target) && !filterButton.contains(event.target)) {
                        filterPopup.classList.remove('active');
                    }
                });
                filterCell.appendChild(filterButton);
                filterCell.appendChild(filterPopup);
            }
        }
        headerFiltersRow.appendChild(filterCell);
    });
}

// --- EVENT LISTENERS ---
processButton.addEventListener('click', handleProcessFile);
sectorFilter.addEventListener('change', applyAllFiltersAndRender); 
calibrationStatusFilter.addEventListener('change', applyAllFiltersAndRender);
searchInput.addEventListener('keyup', applyAllFiltersAndRender);
maintenanceFilter.addEventListener('change', applyAllFiltersAndRender); 
// ... (outros listeners originais) ...

