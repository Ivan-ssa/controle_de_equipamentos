import { readExcelFile } from './excelReader.js';
import { renderTable, populateSectorFilter, updateEquipmentCount } from './tableRenderer.js';
import { applyFilters } from './filterLogic.js';
import { renderOsTable } from './osRenderer.js';
import { renderDivergenceTable } from './divergenceRenderer.js';
import { initRonda, populateRondaSectorSelect } from './rondaManager.js';

// Função para padronizar IDs (SN, Patrimônio)
function normalizeId(id) {
    if (id === null || id === undefined) return '';
    let strId = String(id).trim();
    if (/^\d+$/.test(strId)) { return String(parseInt(strId, 10)); }
    return strId.toLowerCase();
}

// Variáveis globais para armazenar os dados
let allEquipments = [];
window.consolidatedCalibratedMap = new Map();
window.externalMaintenanceSNs = new Set();
window.osRawData = [];
window.rawDivergenceData = [];
window.rondaResultsMap = new Map();
window.mainEquipmentsBySN = new Map();
window.mainEquipmentsByPatrimonio = new Map();

// --- ELEMENTOS DO DOM ---
const excelFileInput = document.getElementById('excelFileInput');
const processButton = document.getElementById('processButton');
const outputDiv = document.getElementById('output');
const equipmentTableBody = document.querySelector('#equipmentTable tbody');
const osTableBody = document.querySelector('#osTable tbody');
const sectorFilter = document.getElementById('sectorFilter');
const calibrationStatusFilter = document.getElementById('calibrationStatusFilter');
const searchInput = document.getElementById('searchInput');
const maintenanceFilter = document.getElementById('maintenanceFilter');
const showEquipmentButton = document.getElementById('showEquipmentButton');
const showOsButton = document.getElementById('showOsButton');
const showRondaButton = document.getElementById('showRondaButton');
const showDivergenceButton = document.getElementById('showDivergenceButton');
const equipmentSection = document.getElementById('equipmentSection');
const osSection = document.getElementById('osSection');
const rondaSection = document.getElementById('rondaSection');
const divergenceSection = document.getElementById('divergenceSection');
const rondaSectorSelect = document.getElementById('rondaSectorSelect');
const startRondaButton = document.getElementById('startRondaButton');
const rondaTableBody = document.querySelector('#rondaTable tbody');
const rondaCountSpan = document.getElementById('rondaCount');
const divergenceTableBody = document.querySelector('#divergenceTable tbody');
const exportOsButton = document.getElementById('exportOsButton');

// Função para alternar a visibilidade das seções
function toggleSectionVisibility(sectionToShowId) {
    [equipmentSection, osSection, rondaSection, divergenceSection].forEach(section => {
        if (section) section.classList.add('hidden');
    });
    document.querySelectorAll('.toggle-section-button').forEach(button => button.classList.remove('active'));

    const sections = { equipmentSection, osSection, rondaSection, divergenceSection };
    const buttons = { equipmentSection: showEquipmentButton, osSection: showOsButton, rondaSection: showRondaButton, divergenceSection: showDivergenceButton };

    if (sections[sectionToShowId]) {
        sections[sectionToShowId].classList.remove('hidden');
        if (buttons[sectionToShowId]) buttons[sectionToShowId].classList.add('active');
    }
}

// Função principal para processar o arquivo Excel
async function handleProcessFile() {
    if (outputDiv) outputDiv.textContent = 'Processando arquivo...';
    const file = excelFileInput.files[0];
    if (!file) {
        if (outputDiv) outputDiv.textContent = 'Por favor, selecione um arquivo.';
        return;
    }

    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);

        // 1. Processa a aba Mestra (sempre a primeira)
        const masterSheet = workbook.Sheets[workbook.SheetNames[0]];
        allEquipments = XLSX.utils.sheet_to_json(masterSheet, { raw: true, defval: '' });

        window.consolidatedCalibratedMap.clear();
        window.externalMaintenanceSNs.clear();
        window.osRawData = [];
        window.mainEquipmentsBySN.clear();
        window.mainEquipmentsByPatrimonio.clear();

        allEquipments.forEach(item => {
            const sn = normalizeId(item['Nº Série'] || item.NumeroSerie);
            const patrimonio = normalizeId(item['Patrimônio'] || item.Patrimonio);
            const fornecedor = String(item['Fornecedor'] || '').trim();
            if (sn && fornecedor) {
                window.consolidatedCalibratedMap.set(sn, { fornecedor, dataCalibracao: item['Data Calibração'] });
            }
            if (sn && String(item['Manutenção Externa'] || '').toLowerCase().includes('manutenção')) {
                window.externalMaintenanceSNs.add(sn);
            }
            if (String(item['OS'] || '').trim()) {
                window.osRawData.push(item);
            }
            if (sn) window.mainEquipmentsBySN.set(sn, item);
            if (patrimonio) window.mainEquipmentsByPatrimonio.set(patrimonio, item);
        });

        // =========================================================================
        // --- INÍCIO DA CORREÇÃO IMPORTANTE ---
        // =========================================================================
        // 2. Processa a aba de Ronda (se existir)
        window.rondaResultsMap.clear();
        if (workbook.SheetNames.includes('Ronda')) {
            const rondaSheet = workbook.Sheets['Ronda'];
            // Usar sheet_to_json é aceitável aqui, desde que o objeto seja construído corretamente.
            const rondaData = XLSX.utils.sheet_to_json(rondaSheet, { raw: true, defval: '' });
            
            rondaData.forEach(item => {
                // Normaliza o Nº de Série da aba Ronda
                const sn = normalizeId(item['Nº Série'] || item['Nº de Série'] || item.NumeroSerie);
                if (sn) {
                    // CRIA UM OBJETO QUE CONTÉM A CHAVE "Setor" QUE O RENDERER PRECISA
                    const rondaInfo = {
                        // A linha abaixo é a correção. Lê a coluna 'Setor' da aba 'Ronda'
                        Setor: String(item.Setor || '').trim(),
                        Status: item.Status
                    };
                    window.rondaResultsMap.set(sn, rondaInfo);
                }
            });
        }
        // =========================================================================
        // --- FIM DA CORREÇÃO ---
        // =========================================================================
        
        console.log("Mapa da Ronda criado:", window.rondaResultsMap); // Log para confirmar que o mapa está correto

        if (outputDiv) outputDiv.textContent = 'Processamento concluído. Renderizando tabelas...';
        applyAllFiltersAndRender();
        if (sectorFilter) populateSectorFilter(allEquipments, sectorFilter);
        if (rondaSectorSelect) populateRondaSectorSelect(allEquipments, rondaSectorSelect);
        
        toggleSectionVisibility('equipmentSection');

    } catch (error) {
        if (outputDiv) outputDiv.textContent = `Erro ao processar o arquivo: ${error.message}`;
        console.error(error);
    }
}

// Aplica todos os filtros e re-renderiza a tabela principal
function applyAllFiltersAndRender() {
    if (!allEquipments.length) return;
    const filters = {
        sector: sectorFilter ? sectorFilter.value : '',
        calibrationStatus: calibrationStatusFilter ? calibrationStatusFilter.value : '',
        search: searchInput ? normalizeId(searchInput.value) : '',
        maintenance: maintenanceFilter ? maintenanceFilter.value : '',
    };
    const filteredEquipments = applyFilters(allEquipments, filters, normalizeId);
    if (equipmentTableBody) {
        renderTable(filteredEquipments, equipmentTableBody, window.consolidatedCalibratedMap, window.externalMaintenanceSNs, normalizeId, window.rondaResultsMap);
    }
}

// --- EVENT LISTENERS (sem alterações) ---

if (processButton) processButton.addEventListener('click', handleProcessFile);
if (sectorFilter) sectorFilter.addEventListener('change', applyAllFiltersAndRender);
if (calibrationStatusFilter) calibrationStatusFilter.addEventListener('change', applyAllFiltersAndRender);
if (searchInput) searchInput.addEventListener('keyup', applyAllFiltersAndRender);
if (maintenanceFilter) maintenanceFilter.addEventListener('change', applyAllFiltersAndRender);

if (showEquipmentButton) showEquipmentButton.addEventListener('click', () => toggleSectionVisibility('equipmentSection'));

if (showOsButton) {
    showOsButton.addEventListener('click', () => {
        if(osTableBody) renderOsTable(
            window.osRawData,
            osTableBody,
            window.mainEquipmentsBySN,
            window.mainEquipmentsByPatrimonio,
            window.consolidatedCalibratedMap,
            window.externalMaintenanceSNs,
            normalizeId
        );
        toggleSectionVisibility('osSection');
    });
}

if (showDivergenceButton) {
    showDivergenceButton.addEventListener('click', () => {
        if(divergenceTableBody) renderDivergenceTable(window.rawDivergenceData, divergenceTableBody);
        toggleSectionVisibility('divergenceSection');
    });
}

if (showRondaButton) showRondaButton.addEventListener('click', () => toggleSectionVisibility('rondaSection'));

if (startRondaButton) {
    startRondaButton.addEventListener('click', () => {
        if (rondaTableBody && rondaCountSpan && rondaSectorSelect) {
            initRonda(allEquipments, rondaTableBody, rondaCountSpan, rondaSectorSelect.value, normalizeId);
        }
    });
}

if (exportOsButton) {
    exportOsButton.addEventListener('click', async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('OS em Aberto');
        worksheet.addRow(['OS', 'Patrimônio', 'Nº Série', 'Equipamento', 'Modelo', 'Fabricante', 'Setor']);
        document.querySelectorAll('#osTable tbody tr').forEach(tr => {
            const rowData = Array.from(tr.children).map(td => td.textContent);
            const excelRow = worksheet.addRow(rowData);
            if (tr.classList.contains('calibrated-text')) {
                excelRow.eachCell(cell => { cell.font = { color: { argb: 'FF1A7431' }, bold: true }; });
            }
            if (tr.classList.contains('in-external-maintenance')) {
                excelRow.eachCell(cell => { cell.font = { color: { argb: 'FFDC3545' }, italic: true, bold: true }; });
            }
        });
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/octet-stream' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'os_em_aberto.xlsx';
        link.click();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    toggleSectionVisibility('equipmentSection');
});