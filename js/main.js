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

    const headers = data[0];
    const rows = data.slice(1);

    const table = document.createElement('table');
    table.border = '1';
    table.style.borderCollapse = 'collapse';
    table.style.width = '100%';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    const headerTitles = ['TAG', 'Equipamento', 'Modelo', 'Fabricante', 'Setor', 'Nº Série', 'Patrimônio', 'Inativo', 'Fornecedor (Status)', 'Data', 'Calibração', 'Manutenção Externa', 'OS Calibração'];
    headerTitles.forEach(title => {
        const th = document.createElement('th');
        th.innerText = title;
        th.style.backgroundColor = '#ddd';
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    rows.forEach((row, index) => {
        const tr = document.createElement('tr');

        // Verifica se o equipamento está calibrado (coluna "Calibração" = J)
        const calibrado = row[10] && row[10].toString().trim() !== '';
        if (calibrado) {
            tr.style.backgroundColor = '#d4edda'; // verde claro
        }

        row.forEach((cell, colIndex) => {
            const td = document.createElement('td');

            if (colIndex === 8) {
                // Coluna "Fornecedor" vira o status
                td.innerText = cell || 'Não encontrado';
            } else if (colIndex === 11) {
                // Manutenção externa destacada
                td.innerText = cell || '';
                td.style.color = 'red';
                td.style.fontStyle = 'italic';
            } else {
                td.innerText = cell || '';
            }

            td.style.padding = '5px';
            tr.appendChild(td);
        });

        // Se faltarem colunas, completa com células vazias
        for (let i = row.length; i < headerTitles.length; i++) {
            const td = document.createElement('td');
            td.innerText = '';
            td.style.padding = '5px';
            tr.appendChild(td);
        }

        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    output.appendChild(table);
}
