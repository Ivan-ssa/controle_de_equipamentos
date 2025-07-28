// js/ronda_mobile.js

import { readExcelWorkbook } from './excelReader.js';

// --- ESTADO DA APLICAÇÃO ---
let allEquipments = [];
let previousRondaData = [];
let mainEquipmentsBySN = new Map();
let currentRondaItems = [];
let itemsConfirmedInRonda = new Map();
let currentEquipment = null;

// --- ELEMENTOS DO DOM ---
const masterFileInput = document.getElementById('masterFileInput');
const loadFileButton = document.getElementById('loadFileButton');
const statusMessage = document.getElementById('statusMessage');
const sectorSelectorSection = document.getElementById('sectorSelectorSection');
const rondaSectorSelect = document.getElementById('rondaSectorSelect');
const startRondaButton = document.getElementById('startRondaButton');
// ... (resto dos elementos do DOM)
const exportRondaButton = document.getElementById('exportRondaButton');


// --- FUNÇÕES AUXILIARES ---
function normalizeId(id) { /* ... (a sua função normalizeId) ... */ }
function updateStatus(message, isError = false) { /* ... (a sua função updateStatus) ... */ }


// --- LÓGICA DE CARREGAMENTO (ATUALIZADA PARA NÃO TRAVAR) ---
if (loadFileButton) {
    loadFileButton.addEventListener('click', () => {
        const file = masterFileInput.files[0];
        if (!file) {
            updateStatus('Por favor, selecione um arquivo.', true);
            return;
        }

        // 1. Mostra a mensagem inicial e desativa o botão para evitar cliques duplos
        updateStatus('A processar... Por favor, aguarde.');
        loadFileButton.disabled = true;
        
        // 2. Usa setTimeout para dar tempo ao navegador de renderizar a mensagem acima
        setTimeout(async () => {
            try {
                updateStatus('Passo 1/3: Lendo o ficheiro Excel...');
                // A função await permite que o código espere aqui sem travar a interface
                const allSheets = await readExcelWorkbook(file);
                
                updateStatus('Passo 2/3: Organizando dados dos equipamentos...');
                
                // Lógica para obter os dados das abas
                allEquipments = allSheets.get('Equip_VBA') || [];
                if (allEquipments.length === 0) {
                    const firstSheetName = allSheets.keys().next().value;
                    allEquipments = allSheets.get(firstSheetName) || [];
                    if(allEquipments.length === 0) throw new Error("A aba de equipamentos está vazia ou não foi encontrada.");
                }
                previousRondaData = allSheets.get('Ronda') || [];
                
                // Lógica para processar os dados
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
                // 3. Reativa o botão no final, quer tenha sucesso ou falhe
                loadFileButton.disabled = false;
            }
        }, 100); // Um pequeno atraso de 100ms é suficiente
    });
}

// O resto do seu ficheiro js/ronda_mobile.js continua aqui sem alterações...
// cole o resto das suas funções aqui.
// --------------------------------------------------------------------------

// (Funções restantes como populateSectorSelect, startRonda, exportRondaButton, etc. devem ser mantidas)

// Cole aqui o resto das suas funções para que o ficheiro fique completo.
// ...