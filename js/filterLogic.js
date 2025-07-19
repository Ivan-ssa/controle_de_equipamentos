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
        const sn = normalizeId(eq['Nº Série'] || eq.NumeroSerie);

        // Filtro de Setor
        if (filters.sector && String(eq['Setor']).trim() !== filters.sector.trim()) {
            return false;
        }
        
        // Filtro de Manutenção Externa
        if (filters.maintenance) {
            const isInMaintenance = window.externalMaintenanceSNs.has(sn);
            const maintenanceFilterValue = filters.maintenance === 'manutencao_sim' ? true : false;
            if (isInMaintenance !== maintenanceFilterValue) {
                return false;
            }
        }

        // Filtro de status de calibração
        if (filters.calibrationStatus) {
            if (filters.calibrationStatus === 'Calibrado (Consolidado)') {
                if (!window.consolidatedCalibratedMap.has(sn)) {
                    return false;
                }
            } else if (filters.calibrationStatus.startsWith('Divergência')) {
                // Lógica corrigida para o filtro de Divergência
                if (!window.divergenceSNs.has(sn)) {
                    return false;
                }
            } else if (filters.calibrationStatus === 'Não Calibrado/Não Encontrado (Seu Cadastro)') {
                if (window.consolidatedCalibratedMap.has(sn) || (String(eq['Status Calibração']).trim() !== '')) {
                    return false;
                }
            } else if (filters.calibrationStatus === 'Calibrado (Total)') {
                if (window.consolidatedCalibratedMap.has(sn) || (String(eq['Status Calibração']).trim() === '')) {
                    return false;
                }
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