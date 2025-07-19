// main.js
import { applyFilters } from './filterLogic.js';

let allData = [];

document.getElementById('fileInput').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  const status = document.getElementById('output'); // Usando output como área de status
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

  status.innerText = Arquivo processado! Total de equipamentos: ${data.length};
});

f.em-manutencao {
    color: red !important;
    font-style: italic !important;
}

function renderEquipmentTable(data) {
  const tableBody = document.querySelector('#equipmentTable tbody');
  tableBody.innerHTML = '';

  // Começa da 2ª linha, pois 0 é cabeçalho
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const tr = document.createElement('tr');

    const nomeEmpresa = row[8] ? row[8].toString().trim() : '';
    const dataCalibracaoRaw = row[9];
    const dataCalibracao = dataCalibracaoRaw ? formatDateExcelStyle(dataCalibracaoRaw) : '';

    // Status e data ficam vazios se não tem nome da empresa
    const statusCalibracao = nomeEmpresa || '';
    const dataCalibExibida = nomeEmpresa ? dataCalibracao : '';

    if (nomeEmpresa) {
      tr.classList.add('linha-calibrada'); // pinta de verde
    } else {
      tr.classList.remove('linha-calibrada');
    }

    // Criar as colunas conforme seu header esperado
    tr.innerHTML = 
      <td>${row[0] || ''}</td>  <!-- TAG -->
      <td>${row[1] || ''}</td>  <!-- Equipamento -->
      <td>${row[2] || ''}</td>  <!-- Modelo -->
      <td>${row[3] || ''}</td>  <!-- Fabricante -->
      <td>${row[4] || ''}</td>  <!-- Setor -->
      <td>${row[5] || ''}</td>  <!-- Nº Série -->
      <td>${row[6] || ''}</td>  <!-- Patrimônio -->
      <td>${statusCalibracao}</td>  <!-- Status Calibração = nome da empresa -->
      <td>${dataCalibExibida}</td>  <!-- Data Calibração -->
    ;

    tableBody.appendChild(tr);
  }

  document.getElementById('equipmentCount').innerText = Total: ${data.length - 1} equipamentos;
}

function formatDateExcelStyle(excelDate) {
  // Excel serial date to JS Date
  const jsDate = new Date((excelDate - 25569) * 86400 * 1000);
  return jsDate.toLocaleDateString('pt-BR');
}



function renderOSTable(data) {
  const tableBody = document.querySelector('#osTable tbody');
  tableBody.innerHTML = '';

  // Considera as OS abertas (se houver campo OS aberta calibração preenchido)
  const osData = data.filter(row => row['OS aberta calibração']);

  osData.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = 
      <td>${row['OS aberta calibração'] || ''}</td>
      <td>${row['Patrimônio'] || ''}</td>
      <td>${row['Nº Série'] || ''}</td>
      <td>${row['Equipamento'] || ''}</td>
      <td>${row['Modelo'] || ''}</td>
      <td>${row['Fabricante'] || ''}</td>
      <td>${row['Setor'] || ''}</td>
    ;
    tableBody.appendChild(tr);
  });

  document.getElementById('osCount').innerText = Total: ${osData.length} OS;
}

function preencherFiltros(data) {
  const setorSelect = document.getElementById('sectorFilter');
  const rondaSelect = document.getElementById('rondaSectorSelect');

  const setores = new Set();

  data.forEach(row => {
    if (row['Setor']) setores.add(row['Setor']);
  });

  setorSelect.innerHTML = <option value="">Todos os Setores</option>;
  rondaSelect.innerHTML = <option value="">Selecione um Setor</option>;

  setores.forEach(setor => {
    const option1 = document.createElement('option');
    option1.value = setor;
    option1.textContent = setor;
    setorSelect.appendChild(option1);

    const option2 = option1.cloneNode(true);
    rondaSelect.appendChild(option2);
  });
}

function formatDate(excelDate) {
  const jsDate = new Date((excelDate - 25569) * 86400 * 1000);
  return jsDate.toLocaleDateString('pt-BR');
}

async function readEquipmentsFromExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function (e) {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });

      // Usa aba Equip_VBA como padrão
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