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

// ATUALIZADO: Lógica para carregar tanto o arquivo mestre quanto uma ronda existente.
loadFileButton.addEventListener('click', async () => {
    const file = masterFileInput.files[0];
    if (!file) {
        statusMessage.textContent = 'Por favor, selecione um arquivo.';
        return;
    }

    statusMessage.textContent = 'Processando arquivo...';
    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: true, defval: '' });

        if (jsonData.length === 0) {
            statusMessage.textContent = 'O arquivo selecionado está vazio.';
            statusMessage.style.color = 'red';
            return;
        }

        // Verifica se o arquivo carregado é uma ronda (pela presença da coluna 'Localização')
        if (jsonData[0].hasOwnProperty('Localização') || jsonData[0].hasOwnProperty('Localização Encontrada')) {
            rondaItems = jsonData.map(item => ({...item, 'Nº de Série': item['Nº de Série'] ?? item.NumeroSerie})); // Garante a chave correta
            statusMessage.textContent = `Ronda com ${rondaItems.length} itens carregada. Continue a verificação.`;
            updateRondaListDisplay();
        } else {
             // É a lista mestra de equipamentos
            allEquipments = jsonData;
            allEquipments.forEach(eq => {
                const sn = normalizeId(eq['Nº Série'] || eq.NumeroSerie);
                const pat = normalizeId(eq['Patrimônio'] || eq.Patrimonio);
                if (sn) mainEquipmentsBySN.set(sn, eq);
                if (pat) mainEquipmentsByPatrimonio.set(pat, eq);
            });
            statusMessage.textContent = `Arquivo mestre com ${allEquipments.length} equipamentos carregado.`;
        }
        
        statusMessage.style.color = 'green';
        rondaSection.classList.remove('hidden');
        fileLoaderSection.classList.add('hidden'); // Esconde o carregador após o sucesso

    } catch (error) {
        statusMessage.textContent = `Erro ao ler o arquivo: ${error.message}`;
        statusMessage.style.color = 'red';
        console.error(error);
    }
});

// ATUALIZADO: Lógica de busca que verifica se o item já existe na ronda.
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

        const snToFind = normalizeId(currentFoundItem['Nº Série']);
        const existingRondaItem = rondaItems.find(item => normalizeId(item['Nº de Série']) === snToFind);

        if (existingRondaItem) {
            locationInput.value = existingRondaItem.Localização || existingRondaItem['Localização Encontrada'] || '';
            obsInput.value = existingRondaItem.Observações || '';
            addToRondaButton.textContent = 'Atualizar Item na Ronda';
        } else {
            locationInput.value = '';
            obsInput.value = '';
            addToRondaButton.textContent = 'Adicionar à Ronda';
        }

        searchResult.classList.remove('hidden');
        locationInput.focus();
    } else {
        equipmentDetails.innerHTML = `<p style="color:red;">Equipamento não encontrado na lista mestre.</p>`;
        searchResult.classList.remove('hidden'); // Mostra a mensagem de erro
        currentFoundItem = null;
    }
});

// ATUALIZADO: Lógica do botão para adicionar OU atualizar um item.
addToRondaButton.addEventListener('click', () => {
    if (!currentFoundItem || !locationInput.value) {
        alert('Busque um equipamento e preencha a localização antes de adicionar.');
        return;
    }

    const snToFind = normalizeId(currentFoundItem['Nº Série']);
    let existingRondaItem = rondaItems.find(item => normalizeId(item['Nº de Série']) === snToFind);

    if (existingRondaItem) {
        // ATUALIZA o item existente
        existingRondaItem.Localização = locationInput.value.trim();
        existingRondaItem.Observações = obsInput.value.trim();
        existingRondaItem.Status = 'Localizado';
        existingRondaItem['Data da Ronda'] = new Date().toLocaleDateString('pt-BR');
        existingRondaItem['Hora da Ronda'] = new Date().toLocaleTimeString('pt-BR');
    } else {
        // ADICIONA um novo item
        const rondaItem = {
            'TAG': currentFoundItem.TAG,
            'Equipamento': currentFoundItem.Equipamento,
            'Setor': currentFoundItem.Setor,
            'Nº de Série': currentFoundItem['Nº Série'],
            'Patrimônio': currentFoundItem.Patrimônio,
            'Localização': locationInput.value.trim(),
            'Status': 'Localizado',
            'Observações': obsInput.value.trim(),
            'Data da Ronda': new Date().toLocaleDateString('pt-BR'),
            'Hora da Ronda': new Date().toLocaleTimeString('pt-BR'),
        };
        rondaItems.push(rondaItem);
    }

    updateRondaListDisplay();
    resetSearchForm();
});

// NOVO: Função de compartilhar/exportar com fallback para download.
exportRondaButton.addEventListener('click', async () => {
    if (rondaItems.length === 0) {
        alert('Nenhum item na ronda para compartilhar.');
        return;
    }

    const dataToExport = rondaItems.map(item => ({
        'TAG': item.TAG,
        'Equipamento': item.Equipamento,
        'Setor': item.Setor,
        'Nº de Série': item['Nº de Série'],
        'Patrimônio': item.Patrimônio,
        'Localização': item.Localização,
        'Status': item.Status,
        'Observações': item.Observações,
        'Data da Ronda': item['Data da Ronda'],
        'Hora da Ronda': item['Hora da Ronda'],
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ronda');
    
    const today = new Date();
    const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const fileName = `Ronda_Preenchida_${dateString}.xlsx`;

    // Tenta usar a API de Compartilhamento Nativo (Web Share API)
    if (navigator.share && navigator.canShare) {
        try {
            const blob = XLSX.write(workbook, { bookType: 'xlsx', type: 'blob' });
            const file = new File([blob], fileName, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

            if (navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: 'Ronda de Equipamentos',
                    text: `Relatório de ronda gerado em ${today.toLocaleDateString('pt-BR')}.`,
                    files: [file]
                });
                console.log('Arquivo compartilhado com sucesso.');
            } else {
                console.warn("Compartilhamento de arquivos não é suportado, fazendo download.");
                XLSX.writeFile(workbook, fileName);
            }
        } catch (error) {
            console.error('Erro ao compartilhar:', error);
            alert("Ocorreu um erro ao tentar compartilhar. O arquivo será baixado.");
            XLSX.writeFile(workbook, fileName);
        }
    } else {
        // Fallback para download normal em desktops ou navegadores sem suporte
        console.log("API de compartilhamento não disponível, fazendo download.");
        XLSX.writeFile(workbook, fileName);
    }
});


// Funções para atualizar a tela
function updateRondaListDisplay() {
    if(rondaItems.length > 0){
        rondaListSection.classList.remove('hidden');
    }
    rondaCounter.textContent = rondaItems.length;
    rondaList.innerHTML = ''; // Limpa a lista antes de redesenhar

    // Ordena para mostrar os mais recentes primeiro
    const sortedItems = [...rondaItems].reverse();

    sortedItems.forEach(item => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `
            <strong>${item.Equipamento ?? ''}</strong> (SN: ${item['Nº de Série'] ?? ''})<br>
            <span class="location">Local: ${item.Localização ?? ''}</span>
        `;
        rondaList.appendChild(listItem); // Usa appendChild para manter a ordem
    });
}

function resetSearchForm() {
    currentFoundItem = null;
    searchResult.classList.add('hidden');
    searchInput.value = '';
    locationInput.value = '';
    obsInput.value = '';
    searchInput.focus();
}