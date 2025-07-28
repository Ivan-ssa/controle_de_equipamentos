// js/excelReader.js

// =========================================================================
// FUNÇÃO ORIGINAL (Mantida para a parte principal do projeto)
// =========================================================================
/**
 * Lê o conteúdo de um arquivo Excel/CSV e retorna os dados de uma aba específica.
 * @param {File} file - O arquivo a ser lido.
 * @param {string} [sheetName] - Opcional. O nome da aba a ser lida. Se não for fornecido, a primeira aba será usada.
 * @returns {Promise<Array<Object>>} - Uma Promise que resolve com os dados da planilha.
 */
export function readExcelFile(file, sheetName) {
    return new Promise((resolve, reject) => {
        if (!file) {
            return reject(new Error('Nenhum arquivo selecionado.'));
        }
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const targetSheetName = sheetName || workbook.SheetNames[0];
                const worksheet = workbook.Sheets[targetSheetName];
                if (!worksheet) {
                    console.warn(`Aviso: A aba '${targetSheetName}' não foi encontrada.`);
                    return resolve([]);
                }
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: true, defval: '' });
                resolve(jsonData);
            } catch (error) {
                reject(new Error(`Erro ao ler o arquivo: ${error.message}`));
            }
        };
        reader.onerror = function(error) {
            reject(error);
        };
        reader.readAsArrayBuffer(file);
    });
}


// =========================================================================
// NOVA FUNÇÃO (Adicionada para a Ronda Mobile, para ler múltiplas abas)
// =========================================================================
/**
 * Lê todas as abas de um ficheiro Excel e retorna os dados num formato de Mapa.
 * @param {File} file - O ficheiro a ser lido.
 * @returns {Promise<Map<string, Array<Object>>>} - Uma Promise que resolve com um Mapa,
 * onde a chave é o nome da aba e o valor são os dados dessa aba.
 */
export function readExcelWorkbook(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            return reject(new Error('Nenhum arquivo selecionado.'));
        }
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const allSheetsData = new Map();

                workbook.SheetNames.forEach(sheetName => {
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: true, defval: '' });
                    allSheetsData.set(sheetName, jsonData);
                });
                
                console.log("Abas lidas do ficheiro:", Array.from(allSheetsData.keys()));
                resolve(allSheetsData);
            } catch (error) {
                reject(new Error(`Erro ao ler o arquivo: ${error.message}`));
            }
        };
        reader.onerror = function(error) {
            reject(error);
        };
        reader.readAsArrayBuffer(file);
    });
}