// js/ronda_mobile.js

// === Variáveis Globais ===
let allEquipments = [];
let mainEquipmentsBySN = new Map();
let mainEquipmentsByPatrimonio = new Map();
let rondaItems = []; // Armazena os itens verificados nesta sessão
let currentFoundItem = null; // Armazena o último item encontrado na busca

// === Referências aos Elementos do DOM ===
const masterFileInput = document.getElementById('masterFileInput');
const loadFileButton = document.getElementById('loadFileButton');
const statusMessage = document.getElementById('statusMessage');

const rondaSection = document.getElementById('rondaSection');
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');

const searchResult = document.getElementById('searchResult');
const equipmentDetails = document.getElementById('equipmentDetails');
const locationInput = document.getElementById('locationInput');
const obsInput = document.getElementById('obsInput');
const addToRondaButton = document.getElementById('addToRondaButton');

const rondaListSection = document.getElementById('rondaListSection');
const rondaCounter = document.getElementById('rondaCounter');
const rondaList = document.getElementById('rondaList');
const exportRondaButton = document.getElementById('exportRondaButton');

// === Funções Auxiliares ===
function normalizeId(id) {
    if (id === null || id === undefined) return '';
    let strId = String(id).trim();
    return /^\d+$/.test(strId) ? String(parseInt(strId, 10)) : strId.toLowerCase();
}

// === Lógica Principal ===

// 1. CARREGAR O ARQUIVO MESTRE
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
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        allEquipments = XLSX.utils.sheet_to_json(worksheet, { raw: true, defval: '' });

        // Popula os mapas para busca rápida
        allEquipments.forEach(eq => {
            const sn = normalizeId(eq['Nº Série'] || eq.NumeroSerie);
            const pat = normalizeId(eq['Patrimônio'] || eq.Patrimonio);
            if (sn) mainEquipmentsBySN.set(sn, eq);
            if (pat) mainEquipmentsByPatrimonio.set(pat, eq);
        });

        statusMessage.textContent = `Arquivo carregado com ${allEquipments.length} equipamentos. Pronto para iniciar a ronda.`;
        statusMessage.style.color = 'green';
        rondaSection.classList.remove('hidden'); // Mostra a seção de busca
        fileLoaderSection.classList.add('hidden'); // Esconde o carregador de arquivo

    } catch (error) {
        statusMessage.textContent = `Erro ao ler o arquivo: ${error.message}`;
        statusMessage.style.color = 'red';
        console.error(error);
    }
});

// 2. BUSCAR UM EQUIPAMENTO
searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = normalizeId(searchInput.value);
    currentFoundItem = mainEquipmentsBySN.get(query) || mainEquipmentsByPatrimonio.get(query);

    if (currentFoundItem) {
        equipmentDetails.innerHTML = `
            <p><strong>TAG:</strong> ${currentFoundItem.TAG ?? 'N/A'}</p>
            <p><strong>Equipamento:</strong> ${currentFoundItem.Equipamento ?? 'N/A'}</p>
            <p><strong>Setor Cadastro:</strong> ${currentFoundItem.Setor ?? 'N/A'}</p>
        `;
        searchResult.classList.remove('hidden');
        locationInput.focus(); // Foca no campo de localização
    } else {
        equipmentDetails.innerHTML = `<p style="color:red;">Equipamento não encontrado.</p>`;
        searchResult.classList.add('hidden');
        currentFoundItem = null;
    }
});

// 3. ADICIONAR O ITEM ENCONTRADO À RONDA
addToRondaButton.addEventListener('click', () => {
    if (!currentFoundItem || !locationInput.value) {
        alert('Busque um equipamento e preencha a localização antes de adicionar.');
        return;
    }

    const rondaItem = {
        'TAG': currentFoundItem.TAG,
        'Equipamento': currentFoundItem.Equipamento,
        'Setor': currentFoundItem.Setor,
        'Nº de Série': currentFoundItem['Nº Série'],
        'Patrimônio': currentFoundItem.Patrimônio,
        'Localização': locationInput.value.trim(),
        'Status': 'Localizado', // Status automático
        'Observações': obsInput.value.trim(),
        'Data da Ronda': new Date().toLocaleDateString('pt-BR'),
        'Hora da Ronda': new Date().toLocaleTimeString('pt-BR'),
        // Adicionar responsável no futuro
    };

    rondaItems.push(rondaItem);
    updateRondaListDisplay();
    resetSearchForm();
});

// 4. EXPORTAR A RONDA PARA EXCEL
exportRondaButton.addEventListener('click', () => {
    if (rondaItems.length === 0) {
        alert('Nenhum item na ronda para exportar.');
        return;
    }

    const worksheet = XLSX.utils.json_to_sheet(rondaItems);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ronda');
    
    const today = new Date();
    const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    XLSX.writeFile(workbook, `Ronda_Preenchida_${dateString}.xlsx`);
});


// Funções para atualizar a tela
function updateRondaListDisplay() {
    rondaListSection.classList.remove('hidden');
    rondaCounter.textContent = rondaItems.length;

    // Adiciona apenas o último item à lista para performance
    const lastItem = rondaItems[rondaItems.length - 1];
    const listItem = document.createElement('li');
    listItem.innerHTML = `
        <strong>${lastItem.Equipamento}</strong> (SN: ${lastItem['Nº de Série']})<br>
        <span class="location">Local: ${lastItem.Localização}</span>
    `;
    rondaList.prepend(listItem); // Adiciona no topo
}

function resetSearchForm() {
    currentFoundItem = null;
    searchResult.classList.add('hidden');
    searchInput.value = '';
    locationInput.value = '';
    obsInput.value = '';
    searchInput.focus();
}