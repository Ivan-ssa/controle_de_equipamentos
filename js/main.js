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

// ADICIONADO: Referências para o novo carregador de ronda
const rondaResultInput = document.getElementById('rondaResultInput'); 
const loadRondaResultButton = document.getElementById('loadRondaResultButton');

const headerFiltersRow = document.getElementById('headerFilters'); 
// ... (resto das suas referências DOM originais)


// Sua função handleProcessFile original e completa vai aqui
async function handleProcessFile() {
    // ... (Cole sua função handleProcessFile original aqui, sem alterações)
}

// ... (Suas outras funções originais: setupHeaderFilters, exportWithExcelJS, toggleSectionVisibility, etc.)

// ATUALIZADO: A chamada da renderTable agora inclui rondaResultsMap
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


// --- EVENT LISTENERS ---
processButton.addEventListener('click', handleProcessFile);
sectorFilter.addEventListener('change', applyAllFiltersAndRender); 
calibrationStatusFilter.addEventListener('change', applyAllFiltersAndRender);
searchInput.addEventListener('keyup', applyAllFiltersAndRender);
maintenanceFilter.addEventListener('change', applyAllFiltersAndRender); 
// ... (outros listeners originais) ...

// ADICIONADO: Novo Event Listener para o botão de carregar a ronda
loadRondaResultButton.addEventListener('click', async () => {
    const file = rondaResultInput.files[0];
    if (!file) {
        alert('Por favor, selecione um arquivo de ronda preenchida.');
        return;
    }
    outputDiv.textContent = 'Lendo arquivo de ronda...';

    try {
        const rondaData = await readExcelFile(file);
        window.rondaResultsMap.clear();

        rondaData.forEach(item => {
            const sn = normalizeId(item['Nº de Série'] || item.NumeroSerie);
            if (sn) {
                window.rondaResultsMap.set(sn, {
                    Localizacao: String(item.Localizacao || item['Localização Encontrada'] || '').trim().toUpperCase(),
                    Status: item.Status
                });
            }
        });

        outputDiv.textContent = `Resultado da ronda com ${window.rondaResultsMap.size} itens carregado. A tabela foi atualizada.`;
        // Re-renderiza a tabela principal com as novas informações de localização
        applyAllFiltersAndRender();

    } catch (error) {
        outputDiv.textContent = `Erro ao processar o arquivo de ronda: ${error.message}`;
    }
});

// ... (resto dos seus listeners originais)