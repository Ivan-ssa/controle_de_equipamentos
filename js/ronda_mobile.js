// js/ronda_mobile.js (VERSÃO FINAL)

import { readExcelFile } from './excelReader.js';

// --- ESTADO DA APLICAÇÃO ---
let allEquipments = [];
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
const rondaSection = document.getElementById('rondaSection');
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const searchResult = document.getElementById('searchResult');
const equipmentDetails = document.getElementById('equipmentDetails');
const locationInput = document.getElementById('locationInput');
const obsInput = document.getElementById('obsInput');
const confirmItemButton = document.getElementById('confirmItemButton');
const rondaListSection = document.getElementById('rondaListSection');
const rondaCounter = document.getElementById('rondaCounter');
const rondaList = document.getElementById('rondaList');
const exportRondaButton = document.getElementById('exportRondaButton');


function normalizeId(id) {
    if (id === null || id === undefined) return '';
    let strId = String(id).trim();
    // Se a string for composta apenas por dígitos...
    if (/^\d+$/.test(strId)) {
        // Converte para número para remover zeros à esquerda e depois para string novamente.
        return String(parseInt(strId, 10));
    }
    // Para outros casos (letras e números), apenas converte para maiúsculas.
    return strId.toUpperCase();
}

function updateStatus(message, isError = false) {
    if (statusMessage) {
        statusMessage.textContent = message;
        statusMessage.className = isError ? 'status error' : 'status success';
    }
}

// --- LÓGICA PRINCIPAL ---

function populateSectorSelect(equipments) {
    if (!rondaSectorSelect) {
        console.error("ERRO CRÍTICO: O elemento <select> com id 'rondaSectorSelect' não foi encontrado no HTML.");
        updateStatus("Erro de interface: Seletor de setor não encontrado.", true);
        return;
    }

    const sectors = equipments.map(eq => String(eq.Setor || '').trim()).filter(Boolean);
    const uniqueSectors = [...new Set(sectors)].sort();

    rondaSectorSelect.innerHTML = '<option value="">Selecione um setor...</option>';
    uniqueSectors.forEach(sector => {
        const option = document.createElement('option');
        option.value = sector;
        option.textContent = sector;
        rondaSectorSelect.appendChild(option);
    });
}

function startRonda(sector) {
    if (!sector) {
        alert("Por favor, selecione um setor para iniciar a ronda.");
        return;
    }
    currentRondaItems = allEquipments.filter(eq => String(eq.Setor || '').trim() === sector);
    itemsConfirmedInRonda.clear();

    rondaSection.classList.remove('hidden');
    rondaListSection.classList.remove('hidden');

    updateRondaCounter();
    if (rondaList) rondaList.innerHTML = ''; 
    
    searchInput.value = '';
    searchInput.focus();
}

function renderRondaList() {
    if (!rondaList) return;
    rondaList.innerHTML = '';
    currentRondaItems.forEach(item => {
        const li = document.createElement('li');
        const sn = normalizeId(item['Nº Série'] || item.NumeroSerie);
        li.dataset.sn = sn;
        li.textContent = `${item.Equipamento} (SN: ${sn})`;

        if (itemsConfirmedInRonda.has(sn)) {
            li.classList.add('confirmed');
            const rondaInfo = itemsConfirmedInRonda.get(sn);
            if (rondaInfo.divergence) {
                li.classList.add('divergence');
            }
        } else {
            li.classList.add('pending');
        }
        rondaList.appendChild(li);
    });
}

function updateRondaCounter() {
    if (rondaCounter) {
        rondaCounter.textContent = `${itemsConfirmedInRonda.size} / ${currentRondaItems.length}`;
    }
}

function displayEquipment(equipment) {
    currentEquipment = equipment;
    if (equipmentDetails) {
        equipmentDetails.innerHTML = `
            <p><strong>Equipamento:</strong> ${equipment.Equipamento || 'N/A'}</p>
            <p><strong>Nº Série:</strong> ${equipment['Nº Série'] || 'N/A'}</p>
            <p><strong>Setor Original:</strong> ${equipment.Setor || 'N/A'}</p>
        `;
    }
    if (searchResult) {
        searchResult.classList.remove('hidden');
    }
    locationInput.value = '';
    obsInput.value = '';
}

// --- EVENT LISTENERS ---

if (loadFileButton) {
    loadFileButton.addEventListener('click', async () => {
        const file = masterFileInput.files[0];
        if (!file) {
            updateStatus('Por favor, selecione um arquivo.', true);
            return;
        }
        updateStatus('Lendo arquivo mestre...');
        try {
            allEquipments = await readExcelFile(file, 'Equip_VBA');
            
            mainEquipmentsBySN.clear();
            allEquipments.forEach(eq => {
                const sn = normalizeId(eq['Nº Série'] || eq.NumeroSerie);
                if (sn) mainEquipmentsBySN.set(sn, eq);
            });

            populateSectorSelect(allEquipments);
            sectorSelectorSection.classList.remove('hidden');
            updateStatus('Arquivo mestre carregado com sucesso! Selecione um setor.', false);

        } catch (error) {
            updateStatus(`Erro ao ler o arquivo: ${error.message}`, true);
            console.error(error);
        }
    });
}

if (startRondaButton) {
    startRondaButton.addEventListener('click', () => {
        startRonda(rondaSectorSelect.value);
    });
}

if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const searchTerm = normalizeId(searchInput.value);
        if (!searchTerm) return;

        const found = mainEquipmentsBySN.get(searchTerm) || 
                      allEquipments.find(eq => normalizeId(eq.Patrimonio) === searchTerm);
        
        if (found) {
            displayEquipment(found);
        } else {
            alert('Equipamento não encontrado no arquivo mestre.');
            searchResult.classList.add('hidden');
            currentEquipment = null;
        }
    });
}

if (confirmItemButton) {
    confirmItemButton.addEventListener('click', () => {
        if (!currentEquipment) return;
        const sn = normalizeId(currentEquipment['Nº Série'] || currentEquipment.NumeroSerie);
        const originalSector = String(currentEquipment.Setor || '').trim();
        const foundLocation = locationInput.value.trim();

        const rondaInfo = {
            'Nº de Série': sn,
            'Setor Original': originalSector,
            'Status': 'Localizado',
            'Localização Encontrada': foundLocation,
            'Observações': obsInput.value.trim(),
            'divergence': foundLocation !== '' && normalizeId(foundLocation) !== normalizeId(originalSector)
        };

        itemsConfirmedInRonda.set(sn, rondaInfo);
        
        // --- ALTERAÇÃO AQUI ---
        // Adiciona o item confirmado à lista visualmente
        const li = document.createElement('li');
        li.dataset.sn = sn;
        li.textContent = `${rondaInfo.Equipamento} (SN: ${sn})`;
        rondaList.appendChild(li);
        if (rondaInfo.divergence) {
            li.classList.add('divergence');
        } else {
            li.classList.add('confirmed');
        }
        // A lógica de cores será aplicada no próximo passo

        // ... (o resto da função: alert, limpar campos, etc. continua igual)
        alert(`${currentEquipment.Equipamento} confirmado!`);
        searchInput.value = '';
        searchInput.focus();
        searchResult.classList.add('hidden');
        currentEquipment = null;
        
        updateRondaCounter();
        // Não precisamos mais de renderRondaList() aqui
    });
}

// =========================================================================
// --- NOVA FUNÇÃO DE EXPORTAÇÃO COMPLETA ---
// =========================================================================
if (exportRondaButton) {
    exportRondaButton.addEventListener('click', () => {
        if (allEquipments.length === 0) {
            alert("O arquivo mestre não foi carregado. Não há dados para exportar.");
            return;
        }

        // 1. FAZ UMA CÓPIA DO ARQUIVO MESTRE ORIGINAL
        // Usamos JSON.parse(JSON.stringify(...)) para garantir uma cópia profunda e não alterar o original
        const dadosParaExportar = JSON.parse(JSON.stringify(allEquipments));

        // 2. ATUALIZA A CÓPIA COM OS DADOS DA RONDA ATUAL
        const dataDaRonda = new Date().toLocaleDateString('pt-BR');

        dadosParaExportar.forEach(equipamento => {
            const sn = normalizeId(equipamento['Nº Série']);

            // Verifica se este equipamento foi confirmado na ronda atual
            if (itemsConfirmedInRonda.has(sn)) {
                const infoDaRonda = itemsConfirmedInRonda.get(sn);

                // Atualiza as colunas do equipamento com os novos dados da ronda
                equipamento['Status'] = infoDaRonda.Status;
                equipamento['Localização Encontrada'] = infoDaRonda['Localização Encontrada'];
                equipamento['Observações'] = infoDaRonda.Observações;
                equipamento['Data da Ronda'] = dataDaRonda;
            }
        });

        console.log("Dados finais mesclados para exportação:", dadosParaExportar);

        // 3. DEFINE OS CABEÇALHOS NA ORDEM CORRETA DO ARQUIVO MESTRE
        const headers = [
            'TAG', 'Equipamento', 'Fabricante', 'Modelo', 'Setor', 'Nº Série',
            'Patrimônio', 'Fornecedor', 'Data Calibração', 'Data Vencimento Calibração',
            'Manutenção Externa', 'OS', 'Status', 'Localização Encontrada',
            'Data da Ronda', 'Observações'
        ];

        // 4. CONVERTE OS DADOS PARA O FORMATO DA PLANILHA (ARRAY DE ARRAYS)
        const dadosParaPlanilha = dadosParaExportar.map(item => {
            return headers.map(header => item[header] || ''); // Garante a ordem e preenche com vazio se não houver dado
        });

        // Adiciona a linha de cabeçalhos no topo
        dadosParaPlanilha.unshift(headers);

        // 5. GERA E DESCARREGA O FICHEIRO EXCEL
        const worksheet = XLSX.utils.aoa_to_sheet(dadosParaPlanilha);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Equip_VBA_Atualizado');

        const nomeFicheiro = `Controle_Equipamentos_Ronda_${dataDaRonda.replace(/\//g, '-')}.xlsx`;
        XLSX.writeFile(workbook, nomeFicheiro);
    });
}