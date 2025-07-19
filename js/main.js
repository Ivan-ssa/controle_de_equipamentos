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

  status.innerText = `Arquivo processado! Total de equipamentos: ${data.length}`;
});

function renderEquipmentTable(data) {
  const tableBody = document.querySelector('#equipmentTable tbody');
  tableBody.innerHTML = '';

  data.forEach(row => {
    const tr = document.createElement('tr');

    // pega o fornecedor (nome da empresa que calibrou)
    const fornecedorRaw = row['Fornecedor'];
    const fornecedor = fornecedorRaw ? fornecedorRaw.trim() : '';

    // data calibração, se não existir, será vazio
    const dataCalibracaoRaw = row['data calibração'];
    const dataCalibracao = dataCalibracaoRaw ? formatDate(dataCalibracaoRaw) : '';

    // Se não tem fornecedor, mostra 'none' no status e 'none' na data
    const statusCalibracao = fornecedor || 'none';
    const dataCalibExibida = fornecedor ? dataCalibracao : 'none';

    // linha verde se tem fornecedor (calibrado)
    if (fornecedor) {
      tr.style.backgroundColor = '#d4edda'; // verde claro
    } else {
      tr.style.backgroundColor = ''; // sem cor
    }

    // verifica se está em manutenção externa para estilo (vermelho itálico)
    const isManutencao = row['manu_externa'];
    if (isManutencao) {
      tr.classList.add('em-manutencao');
    }

    tr.innerHTML = `
      <td>${row['TAG'] || ''}</td>
      <td>${row['Equipamento'] || ''}</td>
      <td>${row['Modelo'] || ''}</td>
      <td>${row['Fabricante'] || ''}</td>
      <td>${row['Setor'] || ''}</td>
      <td>${row['Nº Série'] || ''}</td>
      <td>${row['Patrimônio'] || ''}</td>
      <td>${statusCalibracao}</td>
      <td>${dataCalibExibida}</td>
    `;

    tableBody.appendChild(tr);
  });

  document.getElementById('equipmentCount').innerText = `Total: ${data.length} equipamentos`;
}



function renderOSTable(data) {
  const tableBody = document.querySelector('#osTable tbody');
  tableBody.innerHTML = '';

  // Considera as OS abertas (se houver campo OS aberta calibração preenchido)
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
