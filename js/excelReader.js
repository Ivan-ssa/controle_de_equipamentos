// js/excelReader.js

/**
 * Lê o conteúdo de um arquivo Excel/CSV e retorna os dados de uma aba específica.
 * @param {File} file - O arquivo a ser lido.
 * @param {string} [sheetName] - Opcional. O nome da aba a ser lida. Se não for fornecido, a primeira aba será usada.
 * @returns {Promise<Array<Object>>} - Uma Promise que resolve com os dados da planilha.
 */
export function readExcelFile(file, sheetName) {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error('Nenhum arquivo selecionado.'));
            return;
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
                    resolve([]);
                    return;
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