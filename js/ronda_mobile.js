// js/ronda_mobile.js

// === Variáveis Globais ===
let allEquipments = [];
let rondaItems = []; // Armazena os itens DO SETOR selecionado
let currentFoundItem = null; // Armazena o último item encontrado na busca

// Mapas para busca rápida na lista MESTRA
let mainEquipmentsBySN = new Map();
let mainEquipmentsByPatrimonio = new Map();

// === Referências aos Elementos do DOM ===
const masterFileInput = document.getElementById('masterFileInput');
const loadFileButton = document.getElementById('loadFileButton');
const statusMessage = document.getElementById('statusMessage');

const sectorSelectorSection = document.getElementById('sectorSelectorSection');
const sectorSelect = document.getElementById('sectorSelect');
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

// === Funções Auxiliares ===
function normalizeId(id) {
    if (id === null || id === undefined) return '';
    // Converte para maiúsculas durante a normalização
    let strId = String(id).trim().toUpperCase();
    return /^\d+$/.test(strId) ? String(parseInt(strId, 10)) : strId;
}

// === Lógica Principal ===

// 1. CARREGAR O ARQUIVO MESTRE (SEMPRE DA PRIMEIRA ABA)
loadFileButton.addEventListener('click', async () => {
    const file = masterFileInput.files[0];
    if (!file) {
        statusMessage.textContent = 'Por favor, selecione um arquivo.';
        return;
    }

    statusMessage.textContent = 'Processando arquivo mestre...';
    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const firstSheetName = workbook.SheetNames[0]; // SEMPRE lê a primeira aba
        const worksheet = workbook.Sheets[firstSheetName];
        allEquipments = XLSX.utils.sheet_to_json(worksheet, { raw: true, defval: '' });

        mainEquipmentsBySN.clear();
        mainEquipmentsByPatrimonio.clear();
        
        allEquipments.forEach(eq => {
            const sn = normalizeId(eq['Nº Série'] || eq.NumeroSerie);
            const pat = normalizeId(eq['Patrimônio'] || eq.Patrimonio);
            if (sn) mainEquipmentsBySN.set(sn, eq);
            if (pat) mainEquipmentsByPatrimonio.set(pat, eq);
        });

        populateSectorSelect();
        statusMessage.textContent = `Arquivo com ${allEquipments.length} equipamentos carregado.`;
        statusMessage.style.color = 'green';
        fileLoaderSection.classList.add('hidden');
        sectorSelectorSection.classList.remove('hidden'); // Mostra a seleção de setor

    } catch (error) {
        statusMessage.textContent = `Erro ao ler o arquivo: ${error.message}`;
        statusMessage.style.color = 'red';
        console.error(error);
    }
});

function populateSectorSelect() {
    const uniqueSectors = [...new Set(allEquipments.map(eq => String(eq.Setor || '').trim()).filter(s => s))].sort();
    sectorSelect.innerHTML = '<option value="">Selecione um setor...</option>';
    uniqueSectors.forEach(sector => {
        const option = document.createElement('option');
        option.value = sector;
        option.textContent = sector;
        sectorSelect.appendChild(option);
    });
}

// 2. INICIAR A RONDA PARA O SETOR SELECIONADO
startRondaButton.addEventListener('click', () => {
    const selectedSector = sectorSelect.value;
    if (!selectedSector) {
        alert('Por favor, selecione um setor para iniciar a ronda.');
        return;
    }

    // Filtra os equipamentos apenas para o setor escolhido
    const equipmentsForThisRonda = allEquipments.filter(eq => String(eq.Setor || '').trim() === selectedSector);

    // Prepara a lista de itens da ronda com status inicial
    rondaItems = equipmentsForThisRonda.map(eq => ({
        ...eq, // Copia todos os dados originais
        Localizacao: '', // Localização encontrada começa vazia
        Observacoes: '',
        Status: 'NÃO LOCALIZADO' // Status inicial padrão
    }));

    updateRondaListDisplay();
    sectorSelectorSection.classList.add('hidden');
    rondaSection.classList.remove('hidden');
    rondaListSection.classList.remove('hidden');
    searchInput.focus();
});


// 3. BUSCAR UM EQUIPAMENTO DENTRO DA RONDA DO SETOR
searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = normalizeId(searchInput.value);
    
    // Busca o item na lista da ronda atual
    currentFoundItem = rondaItems.find(item => 
        normalizeId(item['Nº Série']) === query || normalizeId(item['Patrimônio']) === query
    );

    if (currentFoundItem) {
        equipmentDetails.innerHTML = `
            <p><strong>TAG:</strong> ${currentFoundItem.TAG ?? 'N/A'}</p>
            <p><strong>Equipamento:</strong> ${currentFoundItem.Equipamento ?? 'N/A'}</p>
            <p><strong>Setor Cadastro:</strong> ${currentFoundItem.Setor ?? 'N/A'}</p>
        `;
        // Preenche com dados existentes se já tiver sido verificado antes
        locationInput.value = currentFoundItem.Localizacao || '';
        obsInput.value = currentFoundItem.Observacoes || '';
        
        searchResult.classList.remove('hidden');
        locationInput.focus();
    } else {
        equipmentDetails.innerHTML = `<p style="color:red;">Equipamento não pertence a este setor ou não foi encontrado.</p>`;
        searchResult.classList.remove('hidden');
        currentFoundItem = null;
    }
});

// 4. CONFIRMAR A LOCALIZAÇÃO DO ITEM
confirmItemButton.addEventListener('click', () => {
    if (!currentFoundItem) {
        alert('Busque um equipamento válido primeiro.');
        return;
    }

    // Atualiza o item na lista principal 'rondaItems'
    currentFoundItem.Localizacao = locationInput.value.trim().toUpperCase();
    currentFoundItem.Observacoes = obsInput.value.trim().toUpperCase();
    currentFoundItem.Status = 'LOCALIZADO'; // Muda o status
    currentFoundItem['Data da Ronda'] = new Date().toLocaleDateString('pt-BR');
    currentFoundItem['Hora da Ronda'] = new Date().toLocaleTimeString('pt-BR');

    updateRondaListDisplay();
    resetSearchForm();
});

// FUNÇÕES DE ATUALIZAÇÃO E EXPORTAÇÃO
function updateRondaListDisplay() {
    rondaList.innerHTML = ''; // Limpa a lista
    rondaCounter.textContent = `${rondaItems.filter(item => item.Status === 'LOCALIZADO').length}/${rondaItems.length}`;

    rondaItems.forEach(item => {
        const listItem = document.createElement('li');
        // Adiciona classe de acordo com o status
        listItem.className = item.Status === 'LOCALIZADO' ? 'item-localizado' : 'item-nao-localizado';
        
        let localizacaoTexto = item.Localizacao ? `Local: ${item.Localizacao}` : `Status: ${item.Status}`;
        
        listItem.innerHTML = `
            <strong>${item.Equipamento ?? ''}</strong> (SN: ${item['Nº Série'] ?? ''})<br>
            <span class="location">${localizacaoTexto}</span>
        `;
        rondaList.appendChild(listItem);
    });
}

function resetSearchForm() {
    currentFoundItem = null;
    searchResult.classList.add('hidden');
    searchInput.value = '';
    searchInput.focus();
}

exportRondaButton.addEventListener('click', async () => {
    if (rondaItems.length === 0) {
        alert('Nenhum item na ronda para compartilhar.');
        return;
    }
    // O resto da função de exportar/compartilhar pode permanecer como estava
    // ...
});

// Você precisará adicionar estilos para .item-localizado e .item-nao-localizado no seu CSS