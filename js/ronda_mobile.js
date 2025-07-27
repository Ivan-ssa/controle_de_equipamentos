// js/ronda_mobile.js
// Versão revisada e atualizada

// === Variáveis Globais ===
let allEquipments = [];
let rondaItems = []; // Armazena os itens DO SETOR selecionado
let currentFoundItem = null; // Armazena o último item encontrado na busca
let previousRondaMap = new Map(); // Mapa para guardar dados da ronda anterior

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

// 1. Lógica para ler a aba MESTRA e a aba RONDA do mesmo arquivo
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
        
        // --- Leitura da Aba Mestra (sempre a primeira) ---
        const masterSheetName = workbook.SheetNames[0];
        const masterWorksheet = workbook.Sheets[masterSheetName];
        allEquipments = XLSX.utils.sheet_to_json(masterWorksheet, { raw: true, defval: '' });

        mainEquipmentsBySN.clear();
        mainEquipmentsByPatrimonio.clear();
        allEquipments.forEach(eq => {
            const sn = normalizeId(eq['Nº Série'] || eq.NumeroSerie);
            const pat = normalizeId(eq['Patrimônio'] || eq.Patrimonio);
            if (sn) mainEquipmentsBySN.set(sn, eq);
            if (pat) mainEquipmentsByPatrimonio.set(pat, eq);
        });

        // --- Leitura da Aba "Ronda" (se existir) ---
        previousRondaMap.clear();
        if (workbook.SheetNames.includes('Ronda')) {
            const rondaWorksheet = workbook.Sheets['Ronda'];
            const previousRondaData = XLSX.utils.sheet_to_json(rondaWorksheet, { raw: true, defval: '' });

            // Cria um mapa com os dados da ronda anterior para consulta rápida
            previousRondaData.forEach(item => {
                const sn = normalizeId(item['Nº de Série'] || item['Nº Série']);
                if (sn) {
                    previousRondaMap.set(sn, item);
                }
            });
            statusMessage.textContent = `Lista mestra e ronda anterior com ${previousRondaMap.size} itens carregadas.`;
        } else {
            statusMessage.textContent = `Lista mestra carregada. Aba 'Ronda' não encontrada.`;
        }

        populateSectorSelect();
        statusMessage.style.color = 'green';
        
        // Controla a visibilidade das seções
        fileLoaderSection.classList.add('hidden');
        sectorSelectorSection.classList.remove('hidden');
        rondaSection.classList.add('hidden');
        rondaListSection.classList.add('hidden');

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

// 2. Inicia a ronda cruzando com os dados da ronda anterior
startRondaButton.addEventListener('click', () => {
    const selectedSector = sectorSelect.value;
    if (!selectedSector) {
        alert('Por favor, selecione um setor para iniciar a ronda.');
        return;
    }

    const equipmentsForThisRonda = allEquipments.filter(eq => String(eq.Setor || '').trim() === selectedSector);

    // Prepara a lista de itens da ronda, verificando se já estavam na ronda anterior
    rondaItems = equipmentsForThisRonda.map(eq => {
        const sn = normalizeId(eq['Nº Série']);
        const previousData = previousRondaMap.get(sn);

        if (previousData) {
            // Se o item foi encontrado na ronda anterior, já marca como localizado
            return {
                ...eq,
                Localizacao: previousData.Localizacao || previousData['Localização'] || previousData['Localização Encontrada'] || '',
                Observacoes: previousData.Observacoes || '',
                Status: 'LOCALIZADO'
            };
        } else {
            // Se não, marca como não localizado
            return {
                ...eq,
                Localizacao: '',
                Observacoes: '',
                Status: 'NÃO LOCALIZADO'
            };
        }
    });

    updateRondaListDisplay();
    
    // Controla a visibilidade das seções
    sectorSelectorSection.classList.add('hidden');
    rondaSection.classList.remove('hidden');
    rondaListSection.classList.remove('hidden');
    
    searchInput.focus();
});


// 3. Busca um equipamento dentro da ronda do setor
searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = normalizeId(searchInput.value);
    
    currentFoundItem = rondaItems.find(item => 
        normalizeId(item['Nº Série']) === query || normalizeId(item['Patrimônio']) === query
    );

    if (currentFoundItem) {
        equipmentDetails.innerHTML = `
            <p><strong>TAG:</strong> ${currentFoundItem.TAG ?? 'N/A'}</p>
            <p><strong>Equipamento:</strong> ${currentFoundItem.Equipamento ?? 'N/A'}</p>
            <p><strong>Setor Cadastro:</strong> ${currentFoundItem.Setor ?? 'N/A'}</p>
        `;
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


// 4. Confirma a localização do item (campo de localização é opcional)
confirmItemButton.addEventListener('click', () => {
    if (!currentFoundItem) {
        alert('Busque um equipamento válido primeiro.');
        return;
    }

    currentFoundItem.Localizacao = locationInput.value.trim().toUpperCase();
    currentFoundItem.Observacoes = obsInput.value.trim().toUpperCase();
    currentFoundItem.Status = 'LOCALIZADO';
    currentFoundItem['Data da Ronda'] = new Date().toLocaleDateString('pt-BR');
    currentFoundItem['Hora da Ronda'] = new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});

    updateRondaListDisplay();
    resetSearchForm();
});

// 5. Atualiza a lista visual de itens da ronda
function updateRondaListDisplay() {
    rondaList.innerHTML = '';
    rondaCounter.textContent = `${rondaItems.filter(item => item.Status === 'LOCALIZADO').length}/${rondaItems.length}`;

    // Ordena por status para mostrar os não localizados primeiro
    rondaItems.sort((a, b) => {
        if (a.Status < b.Status) return 1;
        if (a.Status > b.Status) return -1;
        return 0;
    });

    rondaItems.forEach(item => {
        const listItem = document.createElement('li');
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

// 6. Exporta/Compartilha a ronda finalizada
exportRondaButton.addEventListener('click', async () => {
    if (rondaItems.length === 0) {
        alert('Nenhum item na ronda para compartilhar.');
        return;
    }
    const worksheet = XLSX.utils.json_to_sheet(rondaItems);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ronda');
    
    const today = new Date();
    const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const fileName = `Ronda_Preenchida_${dateString}.xlsx`;

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
            } else {
                XLSX.writeFile(workbook, fileName);
            }
        } catch (error) {
            XLSX.writeFile(workbook, fileName);
        }
    } else {
        XLSX.writeFile(workbook, fileName);
    }
});