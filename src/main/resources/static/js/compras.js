document.addEventListener('DOMContentLoaded', function() {

    // --- Selectores del Multi-Select ---
    const multiSelectContainer = document.getElementById('productos-multi-select-container');
    const tagsContainer = document.getElementById('tags-container');
    const optionsContainer = document.getElementById('productos-options-container');
    const hiddenSelect = document.getElementById('compraProductosSelect');
    const selectInput = document.getElementById('productos-select-input');


        // ===============================================
    // LÓGICA PARA EL MULTI-SELECT DE PRODUCTOS
    // ===============================================

    async function cargarProductosSelect() {
        try {
            const response = await fetch(API_PRODUCTOS_URL);
            if (!response.ok) throw new Error('No se pudieron cargar los productos');

            const productos = await response.json();
            optionsContainer.innerHTML = '';
            hiddenSelect.innerHTML = '';

            productos.forEach(producto => {
                const realOption = document.createElement('option');
                realOption.value = producto.id;
                realOption.textContent = producto.nombre;
                hiddenSelect.appendChild(realOption);

                const visualOption = document.createElement('div');
                visualOption.classList.add('option');
                visualOption.textContent = producto.nombre;
                visualOption.dataset.value = producto.id;
                
                visualOption.addEventListener('click', () => seleccionarProducto(visualOption, realOption));
                optionsContainer.appendChild(visualOption);
            });
        } catch (error) {
            console.error(error);
            optionsContainer.innerHTML = `<div class="option">Error al cargar productos</div>`;
        }
    }

    function seleccionarProducto(visualOption, realOption) {
        realOption.selected = true;
        crearTag(visualOption.textContent, visualOption.dataset.value, visualOption, realOption);
        visualOption.style.display = 'none';
        optionsContainer.style.display = 'none';
        selectInput.value = '';
    }

    function crearTag(texto, valor, visualOption, realOption) {
        const tag = document.createElement('div');
        tag.classList.add('tag');
        tag.textContent = texto;

        const closeBtn = document.createElement('span');
        closeBtn.classList.add('tag-close');
        closeBtn.innerHTML = '&times;';
        
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            realOption.selected = false;
            tagsContainer.removeChild(tag);
            visualOption.style.display = 'block';
        });

        tag.appendChild(closeBtn);
        tagsContainer.appendChild(tag);
    }




    cargarProductosSelect();

});