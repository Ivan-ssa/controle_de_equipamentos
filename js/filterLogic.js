//filterlogic.js

export function applyFilters(data, filters) {
    return data.filter(row => {
        // Aqui você pode aplicar múltiplos filtros por setor, calibração, manutenção, etc.
        return true; // simples, sem filtros por enquanto
    });
}
