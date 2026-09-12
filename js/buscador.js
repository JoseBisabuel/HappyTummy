document.addEventListener('DOMContentLoaded', function () {
    const input = document.getElementById('buscador-productos');
    const resultsBox = document.getElementById('resultados-busqueda');
    const clearBtn = document.querySelector('.search-clear');

    if (!input || !resultsBox || typeof PRODUCTOS === 'undefined') return;

    const MAX_RESULTS = 8;
    const DEBOUNCE_MS = 150;
    const DIACRITICOS = new RegExp(String.fromCharCode(91) + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + String.fromCharCode(93), 'g');

    function normalizar(texto) {
        return texto
            .normalize('NFD')
            .replace(DIACRITICOS, '')
            .toLowerCase()
            .trim();
    }

    function mostrarResultados() {
        resultsBox.hidden = false;
        // Avisa al resto de la UI (ej. el menú ☰) para que se cierre y no se solapen
        document.dispatchEvent(new CustomEvent('ui-dropdown-open', { detail: 'buscador' }));
    }

    function renderResultados(lista, query) {
        if (!query) {
            resultsBox.hidden = true;
            resultsBox.innerHTML = '';
            return;
        }

        if (lista.length === 0) {
            resultsBox.innerHTML = '<p class="search-empty">No se encontraron productos.</p>';
            mostrarResultados();
            return;
        }

        // Solo texto (sin imágenes): más liviano y rápido de renderizar
        resultsBox.innerHTML = lista.slice(0, MAX_RESULTS).map(function (producto) {
            const nombre = producto.available ? producto.name : producto.name + ' (Agotado)';
            return '<a class="search-result-item" href="' + producto.page + '#prod-' + producto.id + '">' + nombre + '</a>';
        }).join('');
        mostrarResultados();
    }

    let debounceTimer = null;
    function buscar() {
        const query = normalizar(input.value);
        if (!query) {
            renderResultados([], '');
            return;
        }
        const coincidencias = PRODUCTOS.filter(function (producto) {
            return normalizar(producto.name).includes(query) || normalizar(producto.category).includes(query);
        });
        renderResultados(coincidencias, query);
    }

    input.addEventListener('input', function () {
        if (clearBtn) clearBtn.hidden = input.value.trim() === '';
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(buscar, DEBOUNCE_MS);
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', function () {
            input.value = '';
            clearBtn.hidden = true;
            resultsBox.hidden = true;
            resultsBox.innerHTML = '';
            input.focus();
        });
    }

    resultsBox.addEventListener('click', function (e) {
        const link = e.target.closest('.search-result-item');
        if (!link) return;

        const [targetPage, targetHash] = link.getAttribute('href').split('#');
        const currentPage = location.pathname.split('/').pop() || 'index.html';

        if (targetPage === currentPage) {
            e.preventDefault();
            history.pushState(null, '', '#' + targetHash);
            resultsBox.hidden = true;
            input.value = '';
            if (clearBtn) clearBtn.hidden = true;
            if (window.resaltarProductoPorHash) window.resaltarProductoPorHash('#' + targetHash);
        }
    });

    // Un clic afuera oculta el resultado; solo vuelve a aparecer si se hace clic de nuevo en la barra
    document.addEventListener('click', function (e) {
        if (!e.target.closest('.nav-search')) {
            resultsBox.hidden = true;
        }
    });

    input.addEventListener('focus', function () {
        if (input.value.trim() !== '' && resultsBox.innerHTML !== '') {
            mostrarResultados();
        }
    });

    input.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            resultsBox.hidden = true;
            input.blur();
        }
    });

    // Si se abre otro desplegable de la página (ej. el menú ☰), este se cierra
    document.addEventListener('ui-dropdown-open', function (e) {
        if (e.detail !== 'buscador') resultsBox.hidden = true;
    });
});
