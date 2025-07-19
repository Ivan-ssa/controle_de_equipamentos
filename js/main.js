import { applyFilters } from './filterLogic.js';

let allData = [];

document.getElementById("excelFileInput").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    const status = document.getElementById("status");
    const tableBody = document.querySelector("#equipmentTable tbody");

    if (!file) {
        status.innerText = "Nenhum arquivo selecionado.";
        return;
    }

    status.innerText = "Lendo arquivo...";

    const data = await readEquipmentsFromExcel(file);
    allData = data;

    renderEquipmentTable(data);
    renderOSTable(data);
    preencherFiltros(data);

    status.innerText = `Arquivo processado! Total de equipamentos: ${data.length}`;
});

function renderEquipmentTable(data) {
    const tableBody = document.querySelector("#equipmentTable tbody");
    tableBody.innerHTML = "";

    data.forEach(row => {
        const tr = document.createElement("tr");

        const fornecedor = row["Fornecedor"] || "";
        const dataCalibracao = row["data calibração"] ? formatDate(row["data calibração"]) : "";
        const statusCalibracao = row["OS aberta calibração"]
            ? "Não Calibrado"
            : (fornecedor && dataCalibracao ? `${fornecedor} – ${dataCalibracao}` : "Não Calibrado/Não Encontrado");

        const isManutencao = row["manu_externa"];

        tr.innerHTML = `
            <td>${row["TAG"] || ""}</td>
            <td>${row["Equipamento"] || ""}</td>
            <td>${row["Modelo"] || ""}</td>
            <td>${row["Fabricante"] || ""}</td>
            <td>${row["Setor"] || ""}</td>
            <td>${row["Nº Série"] || ""}</td>
            <td>${row["Patrimônio"] || ""}</td>
            <td>${statusCalibracao}</td>
            <td>${dataCalibracao}</td>
        `;

        if (isManutencao) {
            tr.querySelectorAll("td").forEach(td => {
                td.style.color = "red";
                td.style.fontStyle = "italic";
            });
        }

        tableBody.appendChild(tr);
    });

    document.getElementById("equipmentCount").innerText = `Total: ${data.length} equipamentos`;
}

function renderEquipmentTable(data) {
    const tableBody = document.querySelector("#equipmentTable tbody");
    tableBody.innerHTML = "";

    data.forEach(row => {
        const tr = document.createElement("tr");

        const fornecedor = row["Fornecedor"] || "";
        const dataCalibracao = row["data calibração"] ? formatDate(row["data calibração"]) : "";

        // Define status
        let statusCalibracao = "Não Calibrado/Não Encontrado";
        if (fornecedor && dataCalibracao) {
            statusCalibracao = fornecedor;
            tr.style.backgroundColor = "#d4edda"; // verde claro para calibrado
        } else {
            tr.style.backgroundColor = ""; // sem cor para não calibrado
        }

        const isManutencao = row["manu_externa"];

        tr.innerHTML = `
            <td>${row["TAG"] || ""}</td>
            <td>${row["Equipamento"] || ""}</td>
            <td>${row["Modelo"] || ""}</td>
            <td>${row["Fabricante"] || ""}</td>
            <td>${row["Setor"] || ""}</td>
            <td>${row["Nº Série"] || ""}</td>
            <td>${row["Patrimônio"] || ""}</td>
            <td>${statusCalibracao}</td>
            <td>${dataCalibracao}</td>
        `;

        if (isManutencao) {
            tr.classList.add("em-manutencao");
        }

        tableBody.appendChild(tr);
    });

    document.getElementById("equipmentCount").innerText = `Total: ${data.length} equipamentos`;
}


function preencherFiltros(data) {
    const setorSelect = document.getElementById("sectorFilter");
    const rondaSelect = document.getElementById("rondaSectorSelect");

    const setores = new Set();

    data.forEach(row => {
        if (row["Setor"]) setores.add(row["Setor"]);
    });

    setorSelect.innerHTML = `<option value="">Todos os Setores</option>`;
    rondaSelect.innerHTML = `<option value="">Selecione um Setor</option>`;

    setores.forEach(setor => {
        const option1 = document.createElement("option");
        option1.value = setor;
        option1.textContent = setor;
        setorSelect.appendChild(option1);

        const option2 = option1.cloneNode(true);
        rondaSelect.appendChild(option2);
    });
}

function formatDate(excelDate) {
    const jsDate = new Date((excelDate - 25569) * 86400 * 1000);
    return jsDate.toLocaleDateString("pt-BR");
}

async function readEquipmentsFromExcel(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function (e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets["Equip_VBA"];
            if (!worksheet) {
                reject("Aba 'Equip_VBA' não encontrada.");
                return;
            }
            const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
            resolve(json);
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}
