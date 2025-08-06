// Funções auxiliares (sem alteração)
function formatExcelDate(excelDate) {
    if (typeof excelDate !== 'number' || excelDate <= 0) return '';
    const date = new Date(Date.UTC(0, 0, excelDate - 1));
    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function normalizarTexto(str) {
    // Retorna a string normalizada ou uma string vazia se a entrada for nula/vazia
    return String(str || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').toUpperCase();
}


/// --- VERSÃO FINAL COM CORREÇÃO DE PRIORIDADE DE CSS ---
export function renderTable(filteredEquipments, tableBodyElement, consolidatedCalibratedMap, externalMaintenanceSNs, normalizeId, rondaResultsMap) {
    tableBodyElement.innerHTML = '';
    if (filteredEquipments.length === 0) {
        const row = tableBodyElement.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 10;
        cell.textContent = 'Nenhum equipamento encontrado.';
        cell.style.textAlign = 'center';
        updateEquipmentCount(0);
        return;
    }

    filteredEquipments.forEach(eq => {
        const row = tableBodyElement.insertRow();
        const sn = normalizeId(eq['Nº Série'] || eq.NumeroSerie);

        // 1. Aplica as classes de estilo primeiro
        let isCalibrated = consolidatedCalibratedMap.has(sn);
        if (isCalibrated) row.classList.add('calibrated-text'); else row.classList.add('not-calibrated');
        if (externalMaintenanceSNs.has(sn)) row.classList.add('in-external-maintenance');

        // 2. Aplica a lógica da Ronda, que terá a prioridade final na cor de fundo
        if (rondaResultsMap && rondaResultsMap.has(sn)) {
            const rondaInfo = rondaResultsMap.get(sn);
            const setorDeOrigem = normalizarTexto(eq.Setor);
            let setorDaRonda = '';
            const setorKey = Object.keys(rondaInfo).find(key => normalizarTexto(key) === 'SETOR');

            if (setorKey) {
                setorDaRonda = normalizarTexto(rondaInfo[setorKey]);
            }

            // --- MUDANÇA IMPORTANTE AQUI ---
            // Usamos setProperty para poder adicionar '!important' e sobrepor o CSS
            if (setorDaRonda && setorDaRonda === setorDeOrigem) {
                // Se o setor está correto (VERDE), sobrepõe qualquer outra cor de fundo
                row.style.setProperty('background-color', '#e7da5f', 'important');
            } else {
                // Se o setor está divergente (AMARELO), sobrepõe qualquer outra cor de fundo
                row.style.setProperty('background-color', '#fda502', 'important');
            }
        }
        
        // 3. Preenche as células da tabela
        let calibInfo = isCalibrated ? consolidatedCalibratedMap.get(sn) : null;
        row.insertCell().textContent = eq['TAG'] ?? '';
        row.insertCell().textContent = eq['Equipamento'] ?? '';
        // ... (resto do preenchimento das células continua igual)
        row.insertCell().textContent = eq['Modelo'] ?? '';
        row.insertCell().textContent = eq['Fabricante'] ?? '';
        row.insertCell().textContent = eq['Setor'] ?? '';
        row.insertCell().textContent = eq['Nº Série'] ?? '';
        row.insertCell().textContent = eq['Patrimônio'] ?? '';
        row.insertCell().textContent = calibInfo ? calibInfo.fornecedor : 'Não Calibrado';
        row.insertCell().textContent = calibInfo ? formatExcelDate(calibInfo.dataCalibracao) : '';
        row.insertCell().textContent = formatExcelDate(eq['Data Vencimento Calibração']);
    });
}

// Demais funções exportadas (sem alterações)
export function updateEquipmentCount(count) {
    const countElement = document.getElementById('equipmentCount');
    if (countElement) countElement.textContent = `Total: ${count} equipamentos`;
}

export function populateSectorFilter(allEquipments, selectElement) {
    if (!selectElement) return;
    const uniqueSectors = [...new Set(allEquipments.map(eq => String(eq['Setor'] || '').trim()).filter(Boolean))].sort();
    selectElement.innerHTML = '<option value="">Todos os Setores</option>';
    uniqueSectors.forEach(sector => {
        const option = document.createElement('option');
        option.value = sector;
        option.textContent = sector;
        selectElement.appendChild(option);
    });
}