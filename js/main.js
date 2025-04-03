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
});