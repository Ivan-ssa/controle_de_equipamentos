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

