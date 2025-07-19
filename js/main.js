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
    tr.innerHTML = `
      <td>${row[0] || ''}</td>  <!-- TAG -->
      <td>${row[1] || ''}</td>  <!-- Equipamento -->
      <td>${row[2] || ''}</td>  <!-- Modelo -->
      <td>${row[3] || ''}</td>  <!-- Fabricante -->
      <td>${row[4] || ''}</td>  <!-- Setor -->
      <td>${row[5] || ''}</td>  <!-- Nº Série -->
      <td>${row[6] || ''}</td>  <!-- Patrimônio -->
      <td>${statusCalibracao}</td>  <!-- Status Calibração = nome da empresa -->
      <td>${dataCalibExibida}</td>  <!-- Data Calibração -->
    `;

    tableBody.appendChild(tr);
  }

  document.getElementById('equipmentCount').innerText = `Total: ${data.length - 1} equipamentos`;
}

function formatDateExcelStyle(excelDate) {
  // Excel serial date to JS Date
  const jsDate = new Date((excelDate - 25569) * 86400 * 1000);
  return jsDate.toLocaleDateString('pt-BR');
}



function renderOSTable(data) {