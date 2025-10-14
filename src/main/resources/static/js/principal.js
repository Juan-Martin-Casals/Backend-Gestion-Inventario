/**
 * Este archivo maneja la carga de datos para la sección "Principal" (el dashboard).
 * Define una función global para que admin.js pueda llamarla.
 */
document.addEventListener('DOMContentLoaded', function() {

    // Hacemos la función global para que admin.js pueda llamarla
    window.loadPrincipalData = function() {
        console.log("Cargando datos de la sección principal...");

        // Selectores de las tarjetas de estadísticas
        const ventasMesCount = document.getElementById('ventas-mes-count');
        const ventasHistoricasCount = document.getElementById('ventas-historicas-count');
        const productosMesCount = document.getElementById('productos-mes-count');
        const recaudacionMesAmount = document.getElementById('recaudacion-mes-amount');

        // Aquí iría la lógica para hacer fetch a los endpoints de estadísticas
        // Por ahora, simulamos los datos para que veas que funciona.
        if(ventasMesCount) ventasMesCount.textContent = '15';
        if(ventasHistoricasCount) ventasHistoricasCount.textContent = '123';
        if(productosMesCount) productosMesCount.textContent = '42';
        if(recaudacionMesAmount) recaudacionMesAmount.textContent = '$1,234.56';
    };

});

