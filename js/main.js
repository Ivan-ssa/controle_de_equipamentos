import { applyFilters } from './filterLogic.js';

let allData = [];

document.getElementById('fileInput').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  const status = document.getElementById('output');
  const tableBody = document.querySelector('#equipmentTable tbody');

  if (!file) {
    status.innerText = 'Nenhum arquivo selecionado.';
    return;
  }

  status.innerText = 'Lendo arquivo...';

  const data = await readEquipmentsFromExcel(file);
  allData = data;

  renderEquipmentTable(data);
  renderOSTable(data);
  preencherFiltros(data);

  status.innerText = `Arquivo processado! Total de equipamentos: ${data.length}`;
});

function renderEquipmentTable(data) {
  const tableBody = document.querySelector('#equipmentTable tbody');
  tableBody.innerHTML = '';

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const tr = document.createElement('tr');

    const nomeEmpresa = row[8]?.toString().trim();
    const dataRaw = row[9];
    const dataCalibracao = nomeEmpresa && dataRaw ? formatDateExcelStyle(dataRaw) : '';

    // Verifica se calibrado (tem nome na coluna 8)
    const isCalibrado = nomeEmpresa !== '';

    // Adiciona classe verde se calibrado
    if (isCalibrado) {
      tr.classList.add('linha-calibrada');
    }

    tr.innerHTML = `
      <td>${row[0] || ''}</td>  <!-- TAG -->
      <td>${row[1] || ''}</td>  <!-- Equipamento -->
      <td>${row[2] || ''}</td>  <!-- Modelo -->
      <td>${row[3] || ''}</td>  <!-- Fabricante -->
      <td>${row[4] || ''}</td>  <!-- Setor -->
      <td>${row[5] || ''}</td>  <!-- Nº Série -->
      <td>${row[6] || ''}</td>  <!-- Patrimônio -->
      <td>${isCalibrado ? nomeEmpresa : ''}</td>  <!-- Status -->
      <td>${isCalibrado ? dataCalibracao : ''}</td> <!-- Data Calibração -->
    `;

    tableBody.appendChild(tr);
  }

  document.getElementById('equipmentCount').innerText = `Total: ${data.length - 1} equipamentos`;
}

function formatDateExcelStyle(excelDate) {
  const jsDate = new Date((excelDate - 25569) * 86400 * 1000);
  return jsDate.toLocaleDateString('pt-BR');
}

function renderOSTable(data) {
  const tableBody = document.querySelector('#osTable tbody');
  tableBody.innerHTML = '';

  const osData = data.filter(row => row['OS aberta calibração']);

  osData.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row['OS aberta calibração'] || ''}</td>
      <td>${row['Patrimônio'] || ''}</td>
      <td>${row['Nº Série'] || ''}</td>
      <td>${row['Equipamento'] || ''}</td>
      <td>${row['Modelo'] || ''}</td>
      <td>${row['Fabricante'] || ''}</td>
      <td>${row['Setor'] || ''}</td>
    `;
    tableBody.appendChild(tr);
  });

  document.getElementById('osCount').innerText = `Total: ${osData.length} OS`;
}

function preencherFiltros(data) {
  const setorSelect = document.getElementById('sectorFilter');
  const rondaSelect = document.getElementById('rondaSectorSelect');

  const setores = new Set();

  data.forEach(row => {
    if (row['Setor']) setores.add(row['Setor']);
  });

  setorSelect.innerHTML = `<option value="">Todos os Setores</option>`;
  rondaSelect.innerHTML = `<option value="">Selecione um Setor</option>`;

  setores.forEach(setor => {
    const option1 = document.createElement('option');
    option1.value = setor;
    option1.textContent = setor;
    setorSelect.appendChild(option1);

    const option2 = option1.cloneNode(true);
    rondaSelect.appendChild(option2);
  });
}

async function readEquipmentsFromExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function (e) {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });

      const worksheet = workbook.Sheets['Equip_VBA'];
      if (!worksheet) {
        reject("Aba 'Equip_VBA' não encontrada.");
        return;
      }
      const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      resolve(json);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
