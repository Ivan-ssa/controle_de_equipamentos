
import { readExcelFiles } from './excelReader.js';
import { applyFilters } from './filterLogic.js';

document.getElementById("excelFileInput").addEventListener("change", async (event) => {
    const files = Array.from(event.target.files);
    const status = document.getElementById("status");
    const tabelaContainer = document.getElementById("tabela-container");
    tabelaContainer.innerHTML = "";

    if (files.length === 0) {
        status.innerText = "Nenhum arquivo selecionado.";
        return;
    }

    status.innerText = "Lendo arquivos...";

    for (let i = 0; i < files.length; i++) {
        status.innerText = `Lendo arquivo ${i+1} de ${files.length}: ${files[i].name}`;

        // Ler e exibir apenas as primeiras 100 linhas da primeira aba
        await readExcelFiles(files[i], tabelaContainer, 100);

        await new Promise(resolve => setTimeout(resolve, 100));
    }

    status.innerText = "Arquivos processados!";
});
