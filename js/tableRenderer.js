// js/tableRenderer.js

/**
 * Renderiza a tabela principal de equipamentos.
 * @param {Array<Object>} filteredEquipments - O array de objetos de equipamentos.
 * @param {HTMLElement} tableBodyElement - O elemento <tbody> da tabela de equipamentos.
 * @param {Map<string, Object>} consolidatedCalibratedMap - Mapa de SN -> { fornecedor, dataCalibracao }.
 * @param {Set<string>} externalMaintenanceSNs - Set de SNs em manutenção externa.
 */
export function renderTable(filteredEquipments, tableBodyElement, consolidatedCalibratedMap, externalMaintenanceSNs) {
    tableBodyElement.innerHTML = '';
    
    if (filteredEquipments.length === 0) {
        const row = tableBodyElement.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 9;
        cell.textContent = 'Nenhum equipamento encontrado com os filtros aplicados.';
        cell.style.textAlign = 'center';
        updateEquipmentCount(0);
        return;
    }

    filteredEquipments.forEach(eq => {
        const row = tableBodyElement.insertRow();
        const sn = String(eq['Nº Série'] || eq.NumeroSerie || '').trim().toLowerCase();

        // Lógica de status de calibração
        let calibStatusCellText = eq['Status Calibração'] ?? '';
        let isCalibratedConsolidated = consolidatedCalibratedMap.has(sn);
        
        if (isCalibratedConsolidated) {
            row.classList.add('calibrated-dhme');
            const calibInfo = consolidatedCalibratedMap.get(sn);
            calibStatusCellText = `Calibrado (${calibInfo.fornecedor})`;
        } else if (String(calibStatusCellText).toLowerCase().includes('não calibrado') || calibStatusCellText.trim() === '') {
            row.classList.add('not-calibrated');
            calibStatusCellText = 'Não Calibrado/Não Encontrado (Seu Cadastro)';
        } else {
            row.classList.add('calibrated');
            calibStatusCellText = 'Calibrado (Total)';
        }

        // Lógica de status de manutenção
        if (externalMaintenanceSNs.has(sn)) {
            row.classList.add('in-external-maintenance');
        }

        row.insertCell().textContent = eq['TAG'] ?? '';
        row.insertCell().textContent = eq['Equipamento'] ?? '';
        row.insertCell().textContent = eq['Modelo'] ?? '';
        row.insertCell().textContent = eq['Fabricante'] ?? '';
        row.insertCell().textContent = eq['Setor'] ?? '';
        row.insertCell().textContent = eq['Nº Série'] ?? '';
        row.insertCell().textContent = eq['Patrimônio'] ?? '';
        row.insertCell().textContent = calibStatusCellText;
        row.insertCell().textContent = eq['Data Vencimento Calibração'] ?? '';
        const dataCalib = consolidatedCalibratedMap.has(sn) ? consolidatedCalibratedMap.get(sn).dataCalibricao : '';
row.insertCell().textContent = dataCalib;

row.insertCell().textContent = eq['Data Vencimento Calibração'] ?? '';
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