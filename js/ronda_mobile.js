// js/ronda_mobile.js - Versão estável com fluxo por setor
let allEquipments = [], rondaItems = [], currentFoundItem = null;
let mainEquipmentsBySN = new Map(), mainEquipmentsByPatrimonio = new Map();

const masterFileInput = document.getElementById('masterFileInput'), loadFileButton = document.getElementById('loadFileButton'),
      statusMessage = document.getElementById('statusMessage'), sectorSelectorSection = document.getElementById('sectorSelectorSection'),
      sectorSelect = document.getElementById('sectorSelect'), startRondaButton = document.getElementById('startRondaButton'),
      rondaSection = document.getElementById('rondaSection'), searchForm = document.getElementById('searchForm'),
      searchInput = document.getElementById('searchInput'), searchResult = document.getElementById('searchResult'),
      equipmentDetails = document.getElementById('equipmentDetails'), locationInput = document.getElementById('locationInput'),
      obsInput = document.getElementById('obsInput'), confirmItemButton = document.getElementById('confirmItemButton'),
      rondaListSection = document.getElementById('rondaListSection'), rondaCounter = document.getElementById('rondaCounter'),
      rondaList = document.getElementById('rondaList'), exportRondaButton = document.getElementById('exportRondaButton');

function normalizeId(id) {
    if (id === null || id === undefined) return '';
    let strId = String(id).trim().toUpperCase();
    return /^\d+$/.test(strId) ? String(parseInt(strId, 10)) : strId;
}

loadFileButton.addEventListener('click', async () => {
    const file = masterFileInput.files[0];
    if (!file) { statusMessage.textContent = 'Por favor, selecione um arquivo.'; return; }
    statusMessage.textContent = 'Processando arquivo mestre...';
    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        allEquipments = XLSX.utils.sheet_to_json(worksheet, { raw: true, defval: '' });
        mainEquipmentsBySN.clear(); mainEquipmentsByPatrimonio.clear();
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
        sectorSelectorSection.classList.remove('hidden');
    } catch (error) {
        statusMessage.textContent = `Erro ao ler o arquivo: ${error.message}`;
        statusMessage.style.color = 'red';
    }
});

function populateSectorSelect() {
    const uniqueSectors = [...new Set(allEquipments.map(eq => String(eq.Setor || '').trim()).filter(s => s))].sort();
    sectorSelect.innerHTML = '<option value="">Selecione um setor...</option>';
    uniqueSectors.forEach(sector => {
        const option = document.createElement('option');
        option.value = sector; option.textContent = sector;
        sectorSelect.appendChild(option);
    });
}

startRondaButton.addEventListener('click', () => {
    const selectedSector = sectorSelect.value;
    if (!selectedSector) { alert('Por favor, selecione um setor para iniciar a ronda.'); return; }
    const equipmentsForThisRonda = allEquipments.filter(eq => String(eq.Setor || '').trim() === selectedSector);
    rondaItems = equipmentsForThisRonda.map(eq => ({ ...eq, Localizacao: '', Observacoes: '', Status: 'NÃO LOCALIZADO' }));
    updateRondaListDisplay();
    sectorSelectorSection.classList.add('hidden');
    rondaSection.classList.remove('hidden');
    rondaListSection.classList.remove('hidden');
    searchInput.focus();
});

searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = normalizeId(searchInput.value);
    currentFoundItem = rondaItems.find(item => normalizeId(item['Nº Série']) === query || normalizeId(item['Patrimônio']) === query);
    if (currentFoundItem) {
        equipmentDetails.innerHTML = `<p><strong>TAG:</strong> ${currentFoundItem.TAG ?? 'N/A'}</p><p><strong>Equipamento:</strong> ${currentFoundItem.Equipamento ?? 'N/A'}</p><p><strong>Setor Cadastro:</strong> ${currentFoundItem.Setor ?? 'N/A'}</p>`;
        locationInput.value = currentFoundItem.Localizacao || ''; obsInput.value = currentFoundItem.Observacoes || '';
        searchResult.classList.remove('hidden');
        locationInput.focus();
    } else {
        equipmentDetails.innerHTML = `<p style="color:red;">Equipamento não pertence a este setor ou não foi encontrado.</p>`;
        searchResult.classList.remove('hidden'); currentFoundItem = null;
    }
});

confirmItemButton.addEventListener('click', () => {
    if (!currentFoundItem) { alert('Busque um equipamento válido primeiro.'); return; }
    currentFoundItem.Localizacao = locationInput.value.trim().toUpperCase();
    currentFoundItem.Observacoes = obsInput.value.trim().toUpperCase();
    currentFoundItem.Status = 'LOCALIZADO';
    currentFoundItem['Data da Ronda'] = new Date().toLocaleDateString('pt-BR');
    currentFoundItem['Hora da Ronda'] = new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
    updateRondaListDisplay(); resetSearchForm();
});

function updateRondaListDisplay() {
    rondaList.innerHTML = '';
    rondaCounter.textContent = `${rondaItems.filter(item => item.Status === 'LOCALIZADO').length}/${rondaItems.length}`;
    rondaItems.sort((a, b) => { if (a.Status < b.Status) return 1; if (a.Status > b.Status) return -1; return 0; });
    rondaItems.forEach(item => {
        const listItem = document.createElement('li');
        listItem.className = item.Status === 'LOCALIZADO' ? 'item-localizado' : 'item-nao-localizado';
        let localizacaoTexto = item.Localizacao ? `Local: ${item.Localizacao}` : `Status: ${item.Status}`;
        listItem.innerHTML = `<strong>${item.Equipamento ?? ''}</strong> (SN: ${item['Nº Série'] ?? ''})<br><span class="location">${localizacaoTexto}</span>`;
        rondaList.appendChild(listItem);
    });
}

function resetSearchForm() {
    currentFoundItem = null; searchResult.classList.add('hidden');
    searchInput.value = ''; searchInput.focus();
}

exportRondaButton.addEventListener('click', async () => {
    if (rondaItems.length === 0) { alert('Nenhum item na ronda para compartilhar.'); return; }
    const worksheet = XLSX.utils.json_to_sheet(rondaItems);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ronda');
    const today = new Date();
    const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const fileName = `Ronda_Preenchida_${dateString}.xlsx`;
    if (navigator.share) {
        try {
            const blob = XLSX.write(workbook, { bookType: 'xlsx', type: 'blob' });
            const file = new File([blob], fileName, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            await navigator.share({ title: 'Ronda de Equipamentos', files: [file] });
        } catch (error) { XLSX.writeFile(workbook, fileName); }
    } else { XLSX.writeFile(workbook, fileName); }
});