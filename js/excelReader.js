// js/excelReader.js

/**
 * Lê o conteúdo do primeiro arquivo Excel/CSV e retorna os dados da primeira aba
 * como um array de objetos.
 * @param {File} file - O arquivo a ser lido.
 * @returns {Promise<Array<Object>>} - Uma Promise que resolve com os dados da planilha.
 */
export function readExcelFile(file) {
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

                // Assume que a planilha principal é a primeira aba
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // Converte a planilha para um array de objetos JSON (o que já funcionava)
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