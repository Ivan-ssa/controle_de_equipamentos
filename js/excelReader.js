// js/excelReader.js

// A sua função original `readExcelFile` é mantida para não quebrar a outra parte do projeto.
export function readExcelFile(file, sheetName) {
    // ... (cole aqui o seu código da função readExcelFile original e funcional)
}

/**
 * Lê abas específicas de um ficheiro Excel, processando apenas as colunas desejadas para otimização.
 * @param {File} file - O ficheiro a ser lido.
 * @param {Object} sheetConfig - Um objeto que define quais colunas ler para cada aba.
 * Ex: { 'Equip_VBA': ['TAG', 'Setor'], 'Ronda': ['SN', 'Status'] }
 * @returns {Promise<Map<string, Array<Object>>>} - Um Mapa com os dados otimizados de cada aba.
 */
export function readOptimizedExcelWorkbook(file, sheetConfig) {
    return new Promise((resolve, reject) => {
        if (!file) return reject(new Error('Nenhum arquivo selecionado.'));
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const allSheetsData = new Map();

                // Itera sobre as abas definidas na configuração
                for (const sheetName in sheetConfig) {
                    if (workbook.SheetNames.includes(sheetName)) {
                        const worksheet = workbook.Sheets[sheetName];
                        const columnsToKeep = sheetConfig[sheetName];

                        // Converte a planilha para um array de arrays (mais leve)
                        const dataAsArray = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
                        if (dataAsArray.length < 2) {
                            allSheetsData.set(sheetName, []);
                            continue; // Pula para a próxima aba se esta estiver vazia
                        }

                        const headers = dataAsArray[0];
                        const dataRows = dataAsArray.slice(1);
                        
                        // Mapeia os índices dos cabeçalhos que queremos manter para acesso rápido
                        const headerIndexMap = new Map();
                        columnsToKeep.forEach(colName => {
                            const index = headers.findIndex(h => String(h).trim() === colName);
                            if (index !== -1) {
                                headerIndexMap.set(colName, index);
                            }
                        });

                        // Constrói os objetos JSON apenas com as colunas necessárias
                        const jsonData = dataRows.map(row => {
                            const leanObject = {};
                            for (const [colName, index] of headerIndexMap.entries()) {
                                leanObject[colName] = row[index];
                            }
                            return leanObject;
                        });

                        allSheetsData.set(sheetName, jsonData);
                    } else {
                        // Se a aba configurada não for encontrada, define como vazia
                        allSheetsData.set(sheetName, []);
                    }
                }
                
                console.log("Abas otimizadas lidas do ficheiro:", Array.from(allSheetsData.keys()));
                resolve(allSheetsData);

            } catch (error) {
                reject(new Error(`Erro ao ler o arquivo: ${error.message}`));
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
}