// js/ronda_mobile.js

import { readOptimizedExcelWorkbook } from './excelReader.js'; // Importa a nova função OTIMIZADA

// --- ESTADO DA APLICAÇÃO ---
let allEquipments = [];
let previousRondaData = [];
// ... (resto das variáveis)

// --- ELEMENTOS DO DOM ---
// ... (sem alterações)

// --- LÓGICA DE CARREGAMENTO (OTIMIZADA) ---
if (loadFileButton) {
    loadFileButton.addEventListener('click', () => {
        const file = masterFileInput.files[0];
        if (!file) {
            updateStatus('Por favor, selecione um arquivo.', true);
            return;
        }

        updateStatus('A processar de forma otimizada...');
        loadFileButton.disabled = true;
        
        setTimeout(async () => {
            try {
                // 1. Define exatamente quais colunas ler para cada aba
                const configDeLeitura = {
                    'Equip_VBA': ['TAG', 'Equipamento', 'Fabricante', 'Modelo', 'Setor', 'Nº Série', 'Patrimônio'],
                    'Ronda': [
                        'TAG', 'Equipamento', 'Fabricante', 'Modelo', 'Setor', 'Nº Série',
                        'Patrimônio', 'Status', 'Localização Encontrada', 'Data da Ronda', 'Observações'
                    ]
                };

                // 2. Chama a nova função otimizada com a configuração
                const allSheets = await readOptimizedExcelWorkbook(file, configDeLeitura);

                allEquipments = allSheets.get('Equip_VBA') || [];
                previousRondaData = allSheets.get('Ronda') || [];

                if (allEquipments.length === 0) throw new Error("A aba 'Equip_VBA' não foi encontrada ou está vazia.");
                console.log(`Leitura otimizada: ${allEquipments.length} equipamentos e ${previousRondaData.length} registos de ronda carregados.`);

                mainEquipmentsBySN.clear();
                allEquipments.forEach(eq => {
                    const sn = normalizeId(eq['Nº Série']);
                    if (sn) mainEquipmentsBySN.set(sn, eq);
                });

                populateSectorSelect(allEquipments);
                sectorSelectorSection.classList.remove('hidden');
                updateStatus('Ficheiro mestre carregado! Selecione um setor.', false);

            } catch (error) {
                updateStatus(`Erro ao ler o ficheiro: ${error.message}`, true);
                console.error(error);
            } finally {
                loadFileButton.disabled = false;
            }
        }, 100);
    });
}


// O resto do seu ficheiro js/ronda_mobile.js continua aqui sem alterações...
// cole o resto das suas funções aqui.
// --------------------------------------------------------------------------
// (Funções restantes como normalizeId, populateSectorSelect, startRonda, exportRondaButton, etc. devem ser mantidas)
// ...