// js/tableRenderer.js

/**
 * Renderiza a tabela principal de equipamentos.
 * @param {Array<Array<any>>} filteredEquipments - O array de arrays de equipamentos.
 * @param {HTMLElement} tableBodyElement - O elemento <tbody> da tabela de equipamentos.
 * @param {Map<string, Object>} consolidatedCalibratedMap - Mapa de SN -> { fornecedor, dataCalibracao }.
 * @param {Set<string>} externalMaintenanceSNs - Set de SNs em manutenção externa.
 */
export function renderTable(filteredEquipments, tableBodyElement, consolidatedCalibratedMap, externalMaintenanceSNs) {
    // Mapa de colunas para o array de arrays (AoA)
    const COLUMNS = {
        TAG: 0,
        EQUIPAMENTO: 1,
        MODELO: 2,
        FABRICANTE: 3,
        SETOR: 4,
        NUMERO_SERIE: 5,
        PATRIMONIO: 6,
        STATUS_CALIBRACAO: 7,
        DATA_VENCIMENTO_CALIBRACAO: 8,
        FORNECEDOR: 9,
        DATA_CALIBRACAO: 10,
        MANUTENCAO_EXTERNA: 11,
        OS: 12
    };

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
        const sn = String(eq[COLUMNS.NUMERO_SERIE] || '').trim().toLowerCase();

        // Lógica de status de calibração
        let calibStatusCellText = eq[COLUMNS.STATUS_CALIBRACAO] ?? '';
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

        row.insertCell().textContent = eq[COLUMNS.TAG] ?? '';
        row.insertCell().textContent = eq[COLUMNS.EQUIPAMENTO] ?? '';
        row.insertCell().textContent = eq[COLUMNS.MODELO] ?? '';
        row.insertCell().textContent = eq[COLUMNS.FABRICANTE] ?? '';
        row.insertCell().textContent = eq[COLUMNS.SETOR] ?? '';
        row.insertCell().textContent = eq[COLUMNS.NUMERO_SERIE] ?? '';
        row.insertCell().textContent = eq[COLUMNS.PATRIMONIO] ?? '';
        row.insertCell().textContent = calibStatusCellText;
        row.insertCell().textContent = eq[COLUMNS.DATA_VENCIMENTO_CALIBRACAO] ?? '';
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
 * @param {Array<Array<any>>} allEquipments - O array de arrays de equipamentos.
 * @param {HTMLElement} selectElement - O elemento <select> de setor.
 */
export function populateSectorFilter(allEquipments, selectElement) {
    const COLUMNS = { SETOR: 4 };

    const uniqueSectors = new Set(
        allEquipments
            .map(eq => String(eq[COLUMNS.SETOR] || '').trim())
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