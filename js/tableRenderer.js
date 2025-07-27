// js/tableRenderer.js
// Versão completa e atualizada

/**
 * Converte um número de data do Excel para uma string de data formatada (DD/MM/AAAA).
 * @param {number} excelDate - O número de data do Excel.
 * @returns {string} - A string de data formatada.
 */
function formatExcelDate(excelDate) {
    if (typeof excelDate !== 'number' || excelDate <= 0) {
        return '';
    }
    const date = new Date(Date.UTC(0, 0, excelDate - 1));
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

/**
 * ATUALIZADA: Renderiza a tabela principal de equipamentos com a nova lógica visual.
 * @param {Array<Object>} filteredEquipments - O array de objetos de equipamentos.
 * @param {HTMLElement} tableBodyElement - O elemento <tbody> da tabela de equipamentos.
 * @param {Map<string, Object>} consolidatedCalibratedMap - Mapa de SN -> { fornecedor, dataCalibracao }.
 * @param {Set<string>} externalMaintenanceSNs - Set de SNs em manutenção externa.
 * @param {Function} normalizeId - Função para normalizar IDs.
 * @param {Map<string, Object>} rondaResultsMap - Mapa com os resultados da última ronda carregada.
 */
export function renderTable(filteredEquipments, tableBodyElement, consolidatedCalibratedMap, externalMaintenanceSNs, normalizeId, rondaResultsMap) {
    tableBodyElement.innerHTML = '';
    
    if (filteredEquipments.length === 0) {
        const row = tableBodyElement.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 10;
        cell.textContent = 'Nenhum equipamento encontrado com os filtros aplicados.';
        cell.style.textAlign = 'center';
        updateEquipmentCount(0);
        return;
    }

    filteredEquipments.forEach(eq => {
        const row = tableBodyElement.insertRow();
        const sn = normalizeId(eq['Nº Série'] || eq.NumeroSerie);

        // --- Lógica de Calibração (Estilo de TEXTO) ---
        let calibStatusCellText = eq['Status Calibração'] ?? '';
        let isCalibratedConsolidated = consolidatedCalibratedMap.has(sn);
        let dataCalibracao = '';
        
        if (isCalibratedConsolidated) {
            row.classList.add('calibrated-text'); // ALTERADO: Aplica o estilo de TEXTO verde
            const calibInfo = consolidatedCalibratedMap.get(sn);
            calibStatusCellText = calibInfo.fornecedor;
            dataCalibracao = formatExcelDate(calibInfo.dataCalibracao);
        } else if (String(eq['Status Calibração']).toLowerCase().includes('não calibrado') || String(eq['Status Calibração']).trim() === '') {
            row.classList.add('not-calibrated'); // Mantém o FUNDO vermelho
            calibStatusCellText = 'Não Calibrado/Não Encontrado';
        }

        // --- Lógica de Manutenção (sem alterações) ---
        if (externalMaintenanceSNs.has(sn)) {
            row.classList.add('in-external-maintenance');
        }

        // --- NOVA Lógica da Ronda (Estilo de FUNDO) ---
        if (rondaResultsMap && rondaResultsMap.has(sn)) {
            const rondaInfo = rondaResultsMap.get(sn);
            const setorCadastrado = String(eq.Setor || '').trim().toUpperCase();
            
            // Compara a localização da ronda com o setor de cadastro do equipamento
            if (rondaInfo.Localizacao && setorCadastrado !== rondaInfo.Localizacao) {
                row.classList.add('location-divergence'); // Aplica o FUNDO amarelo
            }
        }

        // --- Renderiza as células da tabela ---
        row.insertCell().textContent = eq['TAG'] ?? '';
        row.insertCell().textContent = eq['Equipamento'] ?? '';
        row.insertCell().textContent = eq['Modelo'] ?? '';
        row.insertCell().textContent = eq['Fabricante'] ?? '';
        row.insertCell().textContent = eq['Setor'] ?? '';
        row.insertCell().textContent = eq['Nº Série'] ?? '';
        row.insertCell().textContent = eq['Patrimônio'] ?? '';
        row.insertCell().textContent = calibStatusCellText; // Célula Fornecedor
        row.insertCell().textContent = dataCalibracao; // Célula Data Calibração
        row.insertCell().textContent = formatExcelDate(eq['Data Vencimento Calibração']) ?? '';
    });
    updateEquipmentCount(filteredEquipments.length);
}

/**
 * Atualiza a contagem de equipamentos na página.
 * @param {number} count - O número de equipamentos a ser exibido.
 */
export function updateEquipmentCount(count) {
    document.getElementById('equipmentCount').textContent = `Total: ${count} equipamentos`;
}

/**
 * Popula o dropdown de setores com base nos dados.
 * @param {Array<Object>} allEquipments - O array de objetos de equipamentos.
 * @param {HTMLElement} selectElement - O elemento <select> de setor.
 */
export function populateSectorFilter(allEquipments, selectElement) {
    const uniqueSectors = new Set(
        allEquipments
            .map(eq => String(eq['Setor'] || '').trim())
            .filter(sector => sector !== '')
    );
    
    selectElement.innerHTML = '<option value="">Todos os Setores</option>';
    
    Array.from(uniqueSectors).sort().forEach(sector => {
        const option = document.createElement('option');
        option.value = sector;
        option.textContent = sector;
        selectElement.appendChild(option);
    });
}