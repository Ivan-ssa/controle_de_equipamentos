//main.js
document.getElementById('fileInput').addEventListener('change', handleFile);

function handleFile(event) {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        renderEquipmentTable(jsonData);
    };

    reader.readAsArrayBuffer(file);
}

function renderEquipmentTable(data) {
    const output = document.getElementById('output');
    output.innerHTML = '';

    if (data.length < 2) {
        output.innerText = 'Sem dados suficientes na planilha.';
        return;
    }

    // Define os títulos das colunas esperadas (ajustado com base no seu cabeçalho real)
    const headerTitles = [
        'TAG', 'Equipamento', 'Modelo', 'Fabricante', 'Setor', 'Nº Série',
        'Patrimônio', 'Inativo', 'Fornecedor', 'Data', 'Calibração',
        'Manutenção Externa', 'OS aberta calibração'
    ];

    const table = document.createElement('table');
    table.border = '1';
    table.style.borderCollapse = 'collapse';
    table.style.width = '100%';

    // Cabeçalho da tabela
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerTitles.forEach(title => {
        const th = document.createElement('th');
        th.innerText = title;
        th.style.backgroundColor = '#f0f0f0';
        th.style.padding = '6px';
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Corpo da tabela
    const tbody = document.createElement('tbody');
    const rows = data.slice(1); // Ignora o cabeçalho da planilha

    rows.forEach(row => {
        const tr = document.createElement('tr');

        // Verifica se o equipamento está calibrado (coluna 10 = "Calibração")
        const calibrado = row[10] && row[10].toString().trim() !== '';
        if (calibrado) {
            tr.style.backgroundColor = '#d4edda'; // verde claro
        }

        for (let i = 0; i < headerTitles.length; i++) {
            const td = document.createElement('td');
            const cell = row[i] || '';

            // Estilizações específicas
            if (i === 8) {
                td.innerText = cell || 'Não encontrado'; // Fornecedor
            } else if (i === 11) {
                td.innerText = cell;
                td.style.color = 'red'; // Manutenção Externa
                td.style.fontStyle = 'italic';
            } else {
                td.innerText = cell;
            }

            td.style.padding = '5px';
            tr.appendChild(td);
        }

        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    output.appendChild(table);
}

