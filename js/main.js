document.addEventListener('DOMContentLoaded', function() {
    // Funcionalidades comunes que podrían necesitarse en todas las páginas
    console.log("Funcionalidades comunes cargadas");
    
    // 1. Smooth scroll para los enlaces del menú
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // 1b. Menú desplegable (☰) en móvil
    const navToggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');
    if (navToggle && navLinks) {
        const cerrarMenu = () => {
            navLinks.classList.remove('open');
            navToggle.setAttribute('aria-expanded', 'false');
        };

        navToggle.addEventListener('click', function (e) {
            e.stopPropagation();
            const abierto = navLinks.classList.toggle('open');
            navToggle.setAttribute('aria-expanded', abierto ? 'true' : 'false');
            // Avisa al resto de la UI (ej. el buscador) para que se cierre y no se solapen
            if (abierto) document.dispatchEvent(new CustomEvent('ui-dropdown-open', { detail: 'menu' }));
        });

        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', cerrarMenu);
        });

        document.addEventListener('click', function (e) {
            if (!e.target.closest('nav')) cerrarMenu();
        });

        // Si se abre otro desplegable de la página (ej. el buscador), este se cierra
        document.addEventListener('ui-dropdown-open', function (e) {
            if (e.detail !== 'menu') cerrarMenu();
        });
    }

    // 2. Cambio de estilo del header al hacer scroll
    window.addEventListener('scroll', function() {
        const header = document.querySelector('header');
        if (window.scrollY > 50) {
            header.style.backgroundColor = 'rgba(41, 39, 39, 0.9)';
        } else {
            header.style.backgroundColor = 'rgba(41, 39, 39, 0.5)';
        }
    });

    // 3. Funcionalidad del carrusel de imágenes (nueva)
    const galleryReel = document.querySelector('.gallery-reel');
    if (galleryReel) { // Solo se ejecuta si existe la galería en la página
        const reelTrack = document.querySelector('.reel-track');
        const prevBtn = document.querySelector('.prev-btn');
        const nextBtn = document.querySelector('.next-btn');
        const reelItems = document.querySelectorAll('.reel-item');
        let currentIndex = 0;
        let autoplayInterval;

        // Función para mover el carrusel
        function moveToIndex(index) {
            const totalItems = reelItems.length;
            
            // Lógica circular
            if (index < 0) {
                index = totalItems - 1;
            } else if (index >= totalItems) {
                index = 0;
            }
            
            reelTrack.style.transform = `translateX(-${index * 100}%)`;
            currentIndex = index;
        }

        // Configurar autoplay si hay más de una imagen
        function setupAutoplay() {
            if (reelItems.length > 1) {
                autoplayInterval = setInterval(() => {
                    moveToIndex(currentIndex + 1);
                }, 5000); // Cambia cada 5 segundos
                
                // Pausar autoplay al interactuar
                galleryReel.addEventListener('mouseenter', () => {
                    clearInterval(autoplayInterval);
                });
                
                galleryReel.addEventListener('mouseleave', () => {
                    autoplayInterval = setInterval(() => {
                        moveToIndex(currentIndex + 1);
                    }, 5000);
                });
            }
        }

        // Event listeners para los botones
        if (prevBtn && nextBtn) {
            prevBtn.addEventListener('click', () => {
                clearInterval(autoplayInterval);
                moveToIndex(currentIndex - 1);
                setupAutoplay();
            });

            nextBtn.addEventListener('click', () => {
                clearInterval(autoplayInterval);
                moveToIndex(currentIndex + 1);
                setupAutoplay();
            });
        }

        // Iniciar autoplay
        setupAutoplay();

        // Navegación por teclado (opcional)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                moveToIndex(currentIndex - 1);
            } else if (e.key === 'ArrowRight') {
                moveToIndex(currentIndex + 1);
            }
        });
    }

    // 4. Resaltar el producto enlazado desde el buscador (window.resaltarProductoPorHash)
    window.resaltarProductoPorHash = function (hash) {
        const targetProduct = document.querySelector(hash || location.hash);
        if (targetProduct && targetProduct.classList.contains('product-card')) {
            targetProduct.scrollIntoView({ behavior: 'smooth', block: 'center' });
            targetProduct.classList.add('product-highlight');
            setTimeout(() => targetProduct.classList.remove('product-highlight'), 2200);
        }
    };

    if (location.hash) {
        setTimeout(() => window.resaltarProductoPorHash(), 300);
    }
});