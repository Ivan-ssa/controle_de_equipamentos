// js/divergenceRenderer.js

/**
 * Converte um número de data do Excel para uma string de data formatada (DD/MM/AAAA).
 * @param {number} excelDate - O número de data do Excel.
 * @returns {string} - A string de data formatada.
 */
function formatExcelDate(excelDate) {
    if (typeof excelDate !== 'number' || excelDate <= 0) {
        return '';
    }
    const date = new Date(Date.UTC(0, 0, excelDate - 1));
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

/**
 * Renderiza a tabela de equipamentos com divergência.
 * @param {Array<Object>} divergenceData - O array de objetos de dados de divergência.
 * @param {HTMLElement} tableBodyElement - O elemento <tbody> da tabela de divergência.
 */
export function renderDivergenceTable(divergenceData, tableBodyElement) {
    tableBodyElement.innerHTML = '';

    const divergenceCountSpan = document.getElementById('divergenceCount');
    if (divergenceData.length === 0) {
        const row = tableBodyElement.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 3;
        cell.textContent = 'Nenhum equipamento com divergência encontrado.';
        cell.style.textAlign = 'center';
        divergenceCountSpan.textContent = `Total: 0 divergências`;
        return;
    }

    divergenceData.forEach(item => {
        const row = tableBodyElement.insertRow();
        row.classList.add('divergence-dhme');
        
        row.insertCell().textContent = item['Número de Série'] ?? '';
        row.insertCell().textContent = item['Fornecedor'] ?? '';
        row.insertCell().textContent = formatExcelDate(item['Data de Calibração']) ?? '';
    });

    divergenceCountSpan.textContent = `Total: ${divergenceData.length} divergências`;
}