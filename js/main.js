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
window.rondaResultsMap = new Map(); // <-- Adicione esta variável global



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

// Botões e Seções de alternância de visualização
const showEquipmentButton = document.getElementById('showEquipmentButton');
const showOsButton = document.getElementById('showOsButton');
const showRondaButton = document.getElementById('showRondaButton'); 
const showDivergenceButton = document.getElementById('showDivergenceButton');
const equipmentSection = document.getElementById('equipmentSection');
const osSection = document.getElementById('osSection');
const rondaSection = document.getElementById('rondaSection'); 
const divergenceSection = document.getElementById('divergenceSection');

// Elementos da seção de Ronda
const rondaSectorSelect = document.getElementById('rondaSectorSelect');
const startRondaButton = document.getElementById('startRondaButton');
const rondaFileInput = document.getElementById('rondaFileInput');
const loadRondaButton = document.getElementById('loadRondaButton');
const saveRondaButton = document.getElementById('saveRondaButton');
const rondaTableBody = document.querySelector('#rondaTable tbody');
const rondaCountSpan = document.getElementById('rondaCount');
const divergenceTableBody = document.querySelector('#divergenceTable tbody');
const rondaResultInput = document.getElementById('rondaResultInput'); 
const loadRondaResultButton = document.getElementById('loadRondaResultButton');

function toggleSectionVisibility(sectionToShowId) {
    if (equipmentSection) equipmentSection.classList.add('hidden');
    if (osSection) osSection.classList.add('hidden');
    if (rondaSection) rondaSection.classList.add('hidden'); 
    if (divergenceSection) divergenceSection.classList.add('hidden');

    document.querySelectorAll('.toggle-section-button').forEach(button => {
        button.classList.remove('active');
    });

    if (sectionToShowId === 'equipmentSection' && equipmentSection) {
        equipmentSection.classList.remove('hidden');
        if (showEquipmentButton) showEquipmentButton.classList.add('active');
    } else if (sectionToShowId === 'osSection' && osSection) {
        osSection.classList.remove('hidden');
        if (showOsButton) showOsButton.classList.add('active');
    } else if (sectionToShowId === 'rondaSection' && rondaSection) { 
        rondaSection.classList.remove('hidden');
        if (showRondaButton) showRondaButton.classList.add('active');
    } else if (sectionToShowId === 'divergenceSection' && divergenceSection) {
        divergenceSection.classList.remove('hidden');
        if (showDivergenceButton) showDivergenceButton.classList.add('active');
    }
}


function populateCalibrationStatusFilter(rawCalibrationsData) {
    const filterElement = calibrationStatusFilter; 
    filterElement.innerHTML = '<option value="">Todos os Status</option>';
    const fixedOptions = [
        { value: 'Calibrado (Consolidado)', text: 'Calibrado (Consolidado)' },
        { value: 'Calibrado (Total)', text: 'Calibrado (Total)' }, 
        { value: 'Não Calibrado/Não Encontrado (Seu Cadastro)', text: 'Não Calibrado/Não Encontrado (Seu Cadastro)' },
    ];
    fixedOptions.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.text;
        filterElement.appendChild(option);
    });
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
}


// Local: js/main.js

async function handleProcessFile() {
    outputDiv.textContent = 'Processando arquivo Excel...';
    const file = excelFileInput.files[0];
    if (!file) {
        outputDiv.textContent = 'Por favor, selecione um arquivo Excel.';
        return;
    }

    try {
        const data = await readExcelFile(file);
        if (data.length === 0) {
            outputDiv.textContent = 'Nenhum dado encontrado na planilha.';
            return;
        }

        // LÓGICA INTELIGENTE PARA IDENTIFICAR O TIPO DE ARQUIVO
        if (data[0].hasOwnProperty('Status') || data[0].hasOwnProperty('Localização') || data[0].hasOwnProperty('Localização Encontrada')) {
            // SE FOR UM ARQUIVO DE RONDA
            outputDiv.textContent = 'Arquivo de ronda detectado. Atualizando status de localização...';
            window.rondaResultsMap.clear();
            data.forEach(item => {
                const sn = normalizeId(item['Nº de Série'] || item.NumeroSerie);
                if (sn) {
                    window.rondaResultsMap.set(sn, {
                        Localizacao: String(item.Localizacao || item['Localização Encontrada'] || '').trim().toUpperCase(),
                        Status: item.Status
                    });
                }
            });
            outputDiv.textContent += `\nResultado da ronda com ${window.rondaResultsMap.size} itens carregado. A tabela foi atualizada.`;
            applyAllFiltersAndRender();

        } else {
            // SE FOR O ARQUIVO MESTRE (COMPORTAMENTO ORIGINAL)
            outputDiv.textContent = `Arquivo mestre com ${data.length} equipamentos detectado. Processando...`;
            allEquipments = data;
            
            // ... (resto de toda a lógica original para processar o arquivo mestre) ...
            
            outputDiv.textContent += '\nProcessamento concluído. Renderizando tabelas...';
            applyAllFiltersAndRender();
            populateSectorFilter(allEquipments, sectorFilter);
            // ... (resto das chamadas de função para renderizar tudo) ...
        }

    } catch (error) {
        outputDiv.textContent = `Erro ao processar o arquivo: ${error.message}`;
        console.error('Erro ao processar arquivos:', error);
    }
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


function applyAllFiltersAndRender() {
    const filters = {
        sector: sectorFilter.value, 
        calibrationStatus: calibrationStatusFilter.value,
        search: normalizeId(searchInput.value), 
        maintenance: maintenanceFilter.value,
        headerFilters: {} 
    };
    document.querySelectorAll('#headerFilters input[type="text"]').forEach(input => {
        if (input.value.trim() !== '') {
            filters.headerFilters[input.dataset.property] = normalizeId(input.value); 
        }
    });
    document.querySelectorAll('#headerFilters .filter-popup').forEach(popup => {
        const property = popup.dataset.property;
        const selectedValues = [];
        popup.querySelectorAll('input[type="checkbox"]:checked:not(.select-all)').forEach(checkbox => {
            selectedValues.push(checkbox.value.toLowerCase()); 
        });
        const allOptionsCount = popup.querySelectorAll('input[type="checkbox"]:not(.select-all)').length;
        if (selectedValues.length < allOptionsCount) {
            filters.headerFilters[property] = selectedValues;
        }
    });
    const filteredEquipments = applyFilters(allEquipments, filters, normalizeId); 

    // ALTERAÇÃO IMPORTANTE AQUI: Adicionamos window.rondaResultsMap no final
    renderTable(filteredEquipments, equipmentTableBody, window.consolidatedCalibratedMap, window.externalMaintenanceSNs, normalizeId, window.rondaResultsMap); 
    
    updateEquipmentCount(filteredEquipments.length);
}


async function exportWithExcelJS(tableId, fileName) {
    const table = document.getElementById(tableId);
    if (!table) return alert(`Tabela com ID "${tableId}" não encontrada.`);
    
    if (typeof ExcelJS === 'undefined') {
        return alert('ERRO CRÍTICO: A biblioteca de exportação (ExcelJS) não foi carregada. Verifique o arquivo index.html.');
    }
    
    outputDiv.textContent = `Gerando arquivo Excel estilizado...`;

    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Dados');

        const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0056B3' } }; 
        const headerFont = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
        const calibratedFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB3E6B3' } };
        const notCalibratedFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCCCC' } };
        const maintenanceFont = { name: 'Calibri', size: 11, color: { argb: 'FFDC3545' }, bold: true, italic: true };
        const defaultFont = { name: 'Calibri', size: 11 };
        const defaultBorder = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

        const headerHTMLRows = Array.from(table.querySelectorAll('thead tr'));
        const headerData = [];
        headerHTMLRows.forEach(tr => {
            if (tr.id === 'headerFilters') return; 
            const rowValues = [];
            tr.querySelectorAll('th').forEach(th => rowValues.push(th.textContent));
            headerData.push(rowValues);
        });

        worksheet.columns = headerData[0].map(headerText => ({ header: headerText, key: headerText, width: 20 }));
        
        const headerRow = worksheet.getRow(1);
        headerRow.eachCell(cell => {
            cell.fill = headerFill;
            cell.font = headerFont;
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = defaultBorder;
        });

        const bodyHTMLRows = Array.from(table.querySelectorAll('tbody tr'));
        bodyHTMLRows.forEach(tr => {
            if (tr.querySelector('td')?.colSpan > 1) return; 

            const cellValues = Array.from(tr.querySelectorAll('td')).map(td => td.textContent);
            const addedRow = worksheet.addRow(cellValues);

            addedRow.eachCell(cell => {
                let cellFill = null;
                if (tr.classList.contains('calibrated-dhme')) {
                    cellFill = calibratedFill;
                } else if (tr.classList.contains('not-calibrated')) {
                    cellFill = notCalibratedFill;
                }
                if (cellFill) cell.fill = cellFill;

                if (tr.classList.contains('in-external-maintenance')) {
                    cell.font = maintenanceFont;
                } else {
                    cell.font = defaultFont;
                }
                cell.border = defaultBorder;
            });
        });
        
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        outputDiv.textContent = `Arquivo gerado com sucesso!`;

    } catch (error) {
        console.error("Erro ao gerar arquivo com ExcelJS:", error);
        outputDiv.textContent = `Erro ao gerar arquivo: ${error.message}`;
    }
}

// --- EVENT LISTENERS (VERSÃO CORRIGIDA E SIMPLIFICADA) ---
processButton.addEventListener('click', handleProcessFile);
sectorFilter.addEventListener('change', applyAllFiltersAndRender); 
calibrationStatusFilter.addEventListener('change', applyAllFiltersAndRender);
searchInput.addEventListener('keyup', applyAllFiltersAndRender);
maintenanceFilter.addEventListener('change', applyAllFiltersAndRender); 

exportButton.addEventListener('click', () => {
    exportWithExcelJS('equipmentTable', 'equipamentos_filtrados');
});

exportOsButton.addEventListener('click', () => {
    exportWithExcelJS('osTable', 'os_abertas_filtradas');
});

showEquipmentButton.addEventListener('click', () => toggleSectionVisibility('equipmentSection'));
showOsButton.addEventListener('click', () => toggleSectionVisibility('osSection'));
showDivergenceButton.addEventListener('click', () => {
    toggleSectionVisibility('divergenceSection');
    renderDivergenceTable(window.rawDivergenceData, divergenceTableBody);
});
showRondaButton.addEventListener('click', () => toggleSectionVisibility('rondaSection')); 

// Listeners da aba de Ronda do painel principal
startRondaButton.addEventListener('click', () => {
    initRonda(allEquipments, rondaTableBody, rondaCountSpan, rondaSectorSelect.value, normalizeId); 
});
loadRondaButton.addEventListener('click', async () => {
    const file = rondaFileInput.files[0];
    if (file) {
        try {
            outputDiv.textContent = `\nCarregando Ronda...`;
            const existingRondaData = await readExcelFile(file);
            loadExistingRonda(existingRondaData, rondaTableBody, rondaCountSpan); 
            outputDiv.textContent = `\nRonda carregada.`;
        } catch(error) {
            outputDiv.textContent = `\nErro ao carregar ronda: ${error.message}`;
        }
    } else {
        alert(`Selecione um arquivo de Ronda.`);
    }
});
saveRondaButton.addEventListener('click', () => {
    saveRonda(rondaTableBody); 
});

// Listener para carregar o conteúdo inicial
document.addEventListener('DOMContentLoaded', () => {
    toggleSectionVisibility('equipmentSection');
});