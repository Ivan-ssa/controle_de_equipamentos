// main.js
import { applyFilters } from './filterLogic.js';

let allData = [];

document.getElementById("excelFileInput").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    const status = document.getElementById("status");
    const tableBody = document.querySelector("#equipmentTable tbody");
    const sectorFilter = document.getElementById("sectorFilter");

    if (!file) {
        status.innerText = "Nenhum arquivo selecionado.";
        return;
    }

    status.innerText = "Lendo arquivo...";

    const data = await readEquipmentsFromExcel(file);
    allData = data; // salvar dados globais para reuso

    renderTable(data);
    preencherFiltros(data);

    status.innerText = `Arquivo processado! Total de equipamentos: ${data.length}`;
    updateCount(data.length);
});

function renderTable(data) {
    const tableBody = document.querySelector("#equipmentTable tbody");
    tableBody.innerHTML = "";

    data.forEach(row => {
        const tr = document.createElement("tr");

        const vencimento = row["data calibração"] ? formatDate(row["data calibração"]) : "";
        const statusCalibracao = row["OS aberta calibração"] ? "Não Calibrado" : "Calibrado (Total)";
        
        tr.innerHTML = `
            <td>${row["TAG"] || ""}</td>
            <td>${row["Equipamento"] || ""}</td>
            <td>${row["Modelo"] || ""}</td>
            <td>${row["Fabricante"] || ""}</td>
            <td>${row["Setor"] || ""}</td>
            <td>${row["Nº Série"] || ""}</td>
            <td>${row["Patrimônio"] || ""}</td>
            <td>${statusCalibracao}</td>
            <td>${vencimento}</td>
        `;

        tableBody.appendChild(tr);
    });

    updateCount(data.length);
}

function preencherFiltros(data) {
    const setorSelect = document.getElementById("sectorFilter");
    const manutSelect = document.getElementById("maintenanceFilter");
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

function updateCount(count) {
    document.getElementById("equipmentCount").innerText = `Total: ${count} equipamentos`;
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

// Filtros
document.getElementById("sectorFilter").addEventListener("change", aplicarTodosFiltros);
document.getElementById("calibrationStatusFilter").addEventListener("change", aplicarTodosFiltros);
document.getElementById("maintenanceFilter").addEventListener("change", aplicarTodosFiltros);
document.getElementById("searchInput").addEventListener("input", aplicarTodosFiltros);

function aplicarTodosFiltros() {
    const setor = document.getElementById("sectorFilter").value;
    const status = document.getElementById("calibrationStatusFilter").value;
    const manut = document.getElementById("maintenanceFilter").value;
    const busca = document.getElementById("searchInput").value.toLowerCase();

    const filtrado = allData.filter(row => {
        const setorOk = !setor || row["Setor"] === setor;
        const statusCalibracao = row["OS aberta calibração"] ? "Não Calibrado" : "Calibrado (Total)";
        const statusOk = !status || statusCalibracao === status;
        const manutencao = row["manu_externa"] ? "Em Manutenção Externa" : "";
        const manutOk = !manut || manutencao === manut;
        const buscaOk =
            row["Nº Série"]?.toLowerCase().includes(busca) ||
            row["Patrimônio"]?.toLowerCase().includes(busca) ||
            row["TAG"]?.toLowerCase().includes(busca);

        return setorOk && statusOk && manutOk && (!busca || buscaOk);
    });

    renderTable(filtrado);
}
