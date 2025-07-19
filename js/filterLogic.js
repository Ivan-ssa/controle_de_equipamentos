// js/filterLogic.js

/**
 * Aplica os filtros nos dados de equipamentos.
 * @param {Array<Object>} allEquipments - O array de objetos de equipamentos.
 * @param {Object} filters - Os filtros a serem aplicados.
 * @param {Function} normalizeId - Função utilitária para normalizar IDs.
 * @returns {Array<Object>} - O array de objetos de equipamentos filtrados.
 */
export function applyFilters(allEquipments, filters, normalizeId) {
    return allEquipments.filter(eq => {
        // Filtro de Setor
        if (filters.sector && String(eq['Setor']).trim() !== filters.sector.trim()) {
            return false;
        }

        // Filtro de Status de Calibração
        if (filters.calibrationStatus) {
            const sn = normalizeId(eq['Nº Série'] || eq.NumeroSerie);
            const isCalibratedConsolidated = window.consolidatedCalibratedMap.has(sn);
            const isInDivergence = window.divergenceSNs.has(sn); // Nova verificação de divergência

            let calibStatusText = 'Não Calibrado/Não Encontrado (Seu Cadastro)';
            
            if (isCalibratedConsolidated) {
                calibStatusText = 'Calibrado (Consolidado)';
            } else if (String(eq['Status Calibração']).trim() !== '') {
                 calibStatusText = 'Calibrado (Total)';
            }
            
            // Lógica para o filtro de divergência
            if (filters.calibrationStatus.startsWith('Divergência')) {
                const parts = filters.calibrationStatus.split('(');
                const fornecedorFilter = parts.length > 1 ? parts[1].replace(')', '').trim() : 'Todos Fornecedores';

                // Se o filtro for para "Todos os Fornecedores" ou um fornecedor específico
                if (fornecedorFilter === 'Todos Fornecedores') {
                    if (!isInDivergence) {
                        return false;
                    }
                } else {
                    // Lógica para filtrar por fornecedor específico em divergência (se a sua aba de divergência tiver essa coluna)
                    // Atualmente, estamos apenas verificando se o SN está na lista de divergência.
                    if (!isInDivergence) {
                        return false;
                    }
                }
            } else if (filters.calibrationStatus !== calibStatusText) {
                return false;
            }
        }
        
        // Filtro de Manutenção Externa
        if (filters.maintenance) {
            const sn = normalizeId(eq['Nº Série'] || eq.NumeroSerie);
            const isInMaintenance = window.externalMaintenanceSNs.has(sn);
            const maintenanceFilterValue = filters.maintenance === 'manutencao_sim' ? true : false;
            if (isInMaintenance !== maintenanceFilterValue) {
                return false;
            }
        }

        // Filtro de busca de texto
        if (filters.search) {
            const searchNormalized = filters.search.toLowerCase();
            const tagNormalized = normalizeId(eq['TAG']);
            const patrimonioNormalized = normalizeId(eq['Patrimônio']);
            const snNormalized = normalizeId(eq['Nº Série']);

            if (tagNormalized.includes(searchNormalized) ||
                patrimonioNormalized.includes(searchNormalized) ||
                snNormalized.includes(searchNormalized)) {
                // Continua no loop, pois o item passou no filtro
            } else {
                return false;
            }
        }

        // Filtros de cabeçalho
        const headerFilters = filters.headerFilters;
        for (const prop in headerFilters) {
            if (headerFilters.hasOwnProperty(prop)) {
                const filterValue = headerFilters[prop];
                const columnValue = String(eq[prop] || '').toLowerCase();
                
                if (Array.isArray(filterValue)) {
                    // Filtro de múltipla seleção
                    if (!filterValue.includes(columnValue)) {
                        return false;
                    }
                } else {
                    // Filtro de texto (input)
                    const normalizedColumnValue = normalizeId(columnValue);
                    if (!normalizedColumnValue.includes(normalizeId(filterValue))) {
                        return false;
                    }
                }
            }
        }

        return true;
    });
}