/**
 * Renderiza a tabela de Ordens de Serviço (OS) em aberto.
 * Cruza dados da OS com os status de calibração e manutenção dos equipamentos principais.
 * @param {Array<Object>} osData - O array de objetos de dados da OS.
 * @param {HTMLElement} tableBodyElement - O elemento <tbody> da tabela de OS.
 * @param {Map<string, Object>} mainEquipmentsBySN - Mapa de SN (normalizado) para o objeto do equipamento principal.
 * @param {Map<string, Object>} mainEquipmentsByPatrimonio - Mapa de Patrimônio (normalizado) para o objeto do equipamento principal.
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
        const osSN = normalizeId(os['Nº Série'] || os.NumeroSerie); 
        const osPatrimonio = normalizeId(os['Patrimônio'] || os.Patrimonio); 

        const correspondingEquipment = mainEquipmentsBySN.get(osSN) || mainEquipmentsByPatrimonio.get(osPatrimonio);
        
        const row = tableBodyElement.insertRow();
        osCount++; 

        // Aplica as classes de status, se houver equipamento correspondente
        if (correspondingEquipment) {
            const equipmentMainSN = normalizeId(correspondingEquipment['Nº Série'] || correspondingEquipment.NumeroSerie); 
            
            if (consolidatedCalibratedMap.has(equipmentMainSN)) {
                row.classList.add('calibrated-text'); // verde para calibrado
            }
            if (externalMaintenanceSNs.has(equipmentMainSN)) {
                row.classList.add('in-external-maintenance'); // vermelho/itálico para manutenção externa
            }
        }

        // Preenche as células da linha
        row.insertCell().textContent = os['OS'] ?? '';
        row.insertCell().textContent = os['Patrimônio'] ?? ''; 
        row.insertCell().textContent = os['Nº Série'] ?? ''; 
        row.insertCell().textContent = os['Equipamento'] ?? '';
        row.insertCell().textContent = os['Modelo'] ?? '';
        row.insertCell().textContent = os['Fabricante'] ?? '';
        row.insertCell().textContent = correspondingEquipment ? (correspondingEquipment['Setor'] ?? 'Não Cadastrado') : 'Não Cadastrado';
    });

    document.getElementById('osCount').textContent = `Total: ${osCount} OS`;
}