// js/osRenderer.js

/**
 * Renderiza a tabela de Ordens de Serviço (OS) em aberto.
 * Cruza dados da OS com os status de calibração e manutenção dos equipamentos principais.
 * @param {Array<Array<any>>} osData - O array de arrays de dados da OS.
 * @param {HTMLElement} tableBodyElement - O elemento <tbody> da tabela de OS.
 * @param {Map<string, Array<any>>} mainEquipmentsBySN - Mapa de SN (normalizado) para o objeto do equipamento principal.
 * @param {Map<string, Array<any>>} mainEquipmentsByPatrimonio - Mapa de Patrimônio (normalizado) para o objeto do equipamento principal.
 * @param {Map<string, Object>} consolidatedCalibratedMap - Mapa SN -> { fornecedor, dataCalibracao }.
 * @param {Set<string>} externalMaintenanceSNs - Set de SNs em manutenção externa.
 * @param {Function} normalizeId - Função utilitária para normalizar IDs (removendo zeros à esquerda).
 */
export function renderOsTable(
    osData, 
    tableBodyElement, 
    mainEquipmentsBySN, 
    mainEquipmentsByPatrimonio,
    consolidatedCalibratedMap, 
    externalMaintenanceSNs,
    normalizeId 
) {
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

    if (osData.length === 0) {
        const row = tableBodyElement.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 7; // Ajustado para 7 colunas
        cell.textContent = 'Nenhuma Ordem de Serviço em aberto encontrada.';
        cell.style.textAlign = 'center';
        document.getElementById('osCount').textContent = `Total: 0 OS`;
        return;
    }

    let osCount = 0;
    osData.forEach(os => {
        const osSN = normalizeId(os[COLUMNS.NUMERO_SERIE]); 
        const osPatrimonio = normalizeId(os[COLUMNS.PATRIMONIO]); 

        const correspondingEquipment = mainEquipmentsBySN.get(osSN) || mainEquipmentsByPatrimonio.get(osPatrimonio);

        let osStatusCalib = 'Não Encontrado'; 
        let osStatusManutencao = 'N/A'; 

        if (correspondingEquipment) {
            const equipmentMainSN = normalizeId(correspondingEquipment[COLUMNS.NUMERO_SERIE]); 

            const calibInfo = consolidatedCalibratedMap.get(equipmentMainSN);
            if (calibInfo) {
                osStatusCalib = `Calibrado (${calibInfo.fornecedor})`; 
            } else {
                const originalCalibStatusLower = String(correspondingEquipment[COLUMNS.STATUS_CALIBRACAO] || '').toLowerCase();
                if (originalCalibStatusLower.includes('não calibrado') || originalCalibStatusLower.includes('não cadastrado')) {
                    osStatusCalib = 'Não Calibrado/Não Encontrado (Seu Cadastro)';
                } else if (originalCalibStatusLower.includes('calibrado (total)')) {
                    osStatusCalib = 'Calibrado (Total)';
                } else {
                    osStatusCalib = 'Desconhecido'; 
                }
            }

            if (externalMaintenanceSNs.has(equipmentMainSN)) {
                osStatusManutencao = 'Em Manutenção Externa'; 
            } else {
                osStatusManutencao = 'Não em Manutenção Externa'; 
            }
        } else {
             osStatusCalib = 'Equip. Não Cadastrado';
             osStatusManutencao = 'Equip. Não Cadastrado';
        }

        const row = tableBodyElement.insertRow();
        osCount++; 

        if (osStatusCalib.includes('Calibrado (')) { 
            row.classList.add('calibrated-dhme'); 
        } else if (osStatusCalib.includes('Não Calibrado')) { 
            row.classList.add('not-calibrated');
        }

        if (osStatusManutencao.includes('Em Manutenção Externa')) {
            row.classList.add('in-external-maintenance'); 
        }

        row.insertCell().textContent = os[COLUMNS.OS] ?? '';
        row.insertCell().textContent = os[COLUMNS.PATRIMONIO] ?? ''; 
        row.insertCell().textContent = os[COLUMNS.NUMERO_SERIE] ?? ''; 
        row.insertCell().textContent = os[COLUMNS.EQUIPAMENTO] ?? '';
        row.insertCell().textContent = os[COLUMNS.MODELO] ?? '';
        row.insertCell().textContent = os[COLUMNS.FABRICANTE] ?? '';
        
        row.insertCell().textContent = correspondingEquipment ? correspondingEquipment[COLUMNS.SETOR] ?? 'Não Cadastrado' : 'Não Cadastrado';
    });

    document.getElementById('osCount').textContent = `Total: ${osCount} OS`;
}