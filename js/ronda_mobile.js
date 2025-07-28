// js/ronda_mobile.js (VERSÃO FINAL OTIMIZADA)

import { readExcelWorkbook } from './excelReader.js';

// --- ESTADO DA APLICAÇÃO ---
let allEquipments = [];
let previousRondaData = [];
let mainEquipmentsBySN = new Map();
// ... (resto das variáveis de estado)

// --- ELEMENTOS DO DOM ---
// ... (sem alterações)

// --- FUNÇÕES AUXILIARES ---
// ... (sem alterações)

// =========================================================================
// --- LÓGICA DE CARREGAMENTO OTIMIZADA ---
// =========================================================================
if (loadFileButton) {
    loadFileButton.addEventListener('click', () => {
        const file = masterFileInput.files[0];
        if (!file) {
            updateStatus('Por favor, selecione um arquivo.', true);
            return;
        }

        updateStatus('A processar... Por favor, aguarde.');
        loadFileButton.disabled = true;
        
        setTimeout(async () => {
            try {
                updateStatus('Passo 1/3: Lendo o ficheiro Excel...');
                const allSheets = await readExcelWorkbook(file);
                
                updateStatus('Passo 2/3: Filtrando e organizando dados...');

                // --- INÍCIO DA OTIMIZAÇÃO ---

                // 1. Define as colunas que queremos manter para cada aba
                const colunasEquipVBA = ['TAG', 'Equipamento', 'Fabricante', 'Modelo', 'Setor', 'Nº Série', 'Patrimônio']; // Colunas A a G
                const colunasRonda = ['TAG', 'Equipamento', 'Fabricante', 'Modelo', 'Setor', 'Nº Série', 'Patrimônio', 'Status', 'Localização Encontrada', 'Data da Ronda', 'Observações']; // Colunas A a J (e outras importantes)

                // 2. Função auxiliar para filtrar os objetos, mantendo apenas as colunas desejadas
                const filtrarDados = (dados, colunasParaManter) => {
                    if (!dados) return [];
                    return dados.map(itemOriginal => {
                        const itemFiltrado = {};
                        colunasParaManter.forEach(coluna => {
                            if (itemOriginal[coluna] !== undefined) {
                                itemFiltrado[coluna] = itemOriginal[coluna];
                            }
                        });
                        return itemFiltrado;
                    });
                };

                // 3. Lê e filtra os dados das abas
                let dadosBrutosEquipVBA = allSheets.get('Equip_VBA') || [];
                if (dadosBrutosEquipVBA.length === 0) {
                    const firstSheetName = allSheets.keys().next().value;
                    dadosBrutosEquipVBA = allSheets.get(firstSheetName) || [];
                }
                
                let dadosBrutosRonda = allSheets.get('Ronda') || [];

                // ATRIBUI OS DADOS JÁ FILTRADOS E MAIS LEVES ÀS VARIÁVEIS GLOBAIS
                allEquipments = filtrarDados(dadosBrutosEquipVBA, colunasEquipVBA);
                previousRondaData = filtrarDados(dadosBrutosRonda, colunasRonda);

                console.log(`Dados da 'Equip_VBA' processados. Mantidas ${colunasEquipVBA.length} colunas.`);
                console.log(`Dados da 'Ronda' processados. Mantidas ${colunasRonda.length} colunas.`);
                
                // --- FIM DA OTIMIZAÇÃO ---
                
                if (allEquipments.length === 0) throw new Error("A aba de equipamentos está vazia ou não foi encontrada.");
                
                mainEquipmentsBySN.clear();
                allEquipments.forEach(eq => {
                    const sn = normalizeId(eq['Nº Série']);
                    if (sn) mainEquipmentsBySN.set(sn, eq);
                });

                updateStatus('Passo 3/3: A preparar a interface...');
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

// (Funções restantes como populateSectorSelect, startRonda, exportRondaButton, etc. devem ser mantidas)
// ...