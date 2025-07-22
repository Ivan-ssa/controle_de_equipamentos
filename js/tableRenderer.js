// js/tableRenderer.js

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
 * Renderiza a tabela principal de equipamentos.
 * @param {Array<Object>} filteredEquipments - O array de objetos de equipamentos.
 * @param {HTMLElement} tableBodyElement - O elemento <tbody> da tabela de equipamentos.
 * @param {Map<string, Object>} consolidatedCalibratedMap - Mapa de SN -> { fornecedor, dataCalibracao }.
 * @param {Set<string>} externalMaintenanceSNs - Set de SNs em manutenção externa.
 * @param {Function} normalizeId - <-- ALTERAÇÃO 1: Função de normalização adicionada como parâmetro.
 */
export function renderTable(filteredEquipments, tableBodyElement, consolidatedCalibratedMap, externalMaintenanceSNs, normalizeId) {
    tableBodyElement.innerHTML = '';
    
    if (filteredEquipments.length === 0) {
        const row = tableBodyElement.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 10; // Ajustado para 10 colunas, se necessário
        cell.textContent = 'Nenhum equipamento encontrado com os filtros aplicados.';
        cell.style.textAlign = 'center';
        updateEquipmentCount(0);
        return;
    }

    filteredEquipments.forEach(eq => {
        const row = tableBodyElement.insertRow();
        
        // <-- ALTERAÇÃO 2: A normalização agora é feita usando a função passada como parâmetro.
        const sn = normalizeId(eq['Nº Série'] || eq.NumeroSerie);

        // Lógica de status de calibração
        let calibStatusCellText = eq['Status Calibração'] ?? '';
        
        // Esta verificação agora funcionará corretamente para números de série com zeros à esquerda.
        let isCalibratedConsolidated = consolidatedCalibratedMap.has(sn);
        let dataCalibracao = '';
        
        if (isCalibratedConsolidated) {
            row.classList.add('calibrated-dhme');
            const calibInfo = consolidatedCalibratedMap.get(sn);
            calibStatusCellText = calibInfo.fornecedor; // Agora mostra só o nome do fornecedor
            dataCalibracao = formatExcelDate(calibInfo.dataCalibricao);
        } else if (String(calibStatusCellText).toLowerCase().includes('não calibrado') || calibStatusCellText.trim() === '') {
            row.classList.add('not-calibrated');
            calibStatusCellText = 'Não Calibrado/Não Encontrado (Seu Cadastro)';
        } else {
            row.classList.add('calibrated');
            calibStatusCellText = 'Calibrado (Total)';
        }

        // Lógica de status de manutenção (também usará o 'sn' normalizado)
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
        row.insertCell().textContent = calibStatusCellText; // Célula Fornecedor
        row.insertCell().textContent = dataCalibracao; // Célula Data Calibração
        row.insertCell().textContent = formatExcelDate(eq['Data Vencimento Calibração']) ?? ''; // Célula Data Vencimento Calibração
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