// js/filterLogic.js

/**
 * Aplica os filtros nos dados de equipamentos.
 * @param {Array<Array<any>>} allEquipments - O array de arrays de equipamentos.
 * @param {Object} filters - Os filtros a serem aplicados.
 * @param {Function} normalizeId - Função utilitária para normalizar IDs.
 * @returns {Array<Array<any>>} - O array de arrays de equipamentos filtrados.
 */
export function applyFilters(allEquipments, filters, normalizeId) {
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

    return allEquipments.filter(eq => {
        // Filtro de Setor
        if (filters.sector && String(eq[COLUMNS.SETOR]).trim() !== filters.sector.trim()) {
            return false;
        }

        // Filtro de Status de Calibração
        if (filters.calibrationStatus) {
            const sn = normalizeId(eq[COLUMNS.NUMERO_SERIE]);
            const isCalibratedConsolidated = window.consolidatedCalibratedMap.has(sn);
            let calibStatusText = 'Não Calibrado/Não Encontrado (Seu Cadastro)';
            
            if (isCalibratedConsolidated) {
                calibStatusText = 'Calibrado (Consolidado)';
            } else if (String(eq[COLUMNS.STATUS_CALIBRACAO]).trim() !== '') {
                 calibStatusText = 'Calibrado (Total)';
            }

            if (filters.calibrationStatus !== calibStatusText) {
                return false;
            }
        }
        
        // Filtro de Manutenção Externa
        if (filters.maintenance) {
            const sn = normalizeId(eq[COLUMNS.NUMERO_SERIE]);
            const isInMaintenance = window.externalMaintenanceSNs.has(sn);
            const maintenanceFilterValue = filters.maintenance === 'manutencao_sim' ? true : false;
            if (isInMaintenance !== maintenanceFilterValue) {
                return false;
            }
        }

        // Filtro de busca de texto
        if (filters.search) {
            const searchNormalized = filters.search.toLowerCase();
            const tagNormalized = normalizeId(eq[COLUMNS.TAG]);
            const patrimonioNormalized = normalizeId(eq[COLUMNS.PATRIMONIO]);
            const snNormalized = normalizeId(eq[COLUMNS.NUMERO_SERIE]);

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
                const columnValue = String(eq[COLUMNS[prop.toUpperCase().replace(/\s/g, '_')]] || '').toLowerCase();
                
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