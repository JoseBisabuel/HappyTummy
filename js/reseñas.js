document.addEventListener('DOMContentLoaded', function() {
    // Datos de las reseñas (podrían venir de una API en un proyecto real)
    const reviews = [
        {
            name: "José Bisabuel",
            image: "assets/reseñas/josebisabuel.avif",
            rating: 5,
            comment: "Los productos de Happy Tummy cambiaron mi alimentación. ¡La salchicha veggie es increíble!"
        },
        {
            name: "María Gómez",
            image: "assets/reseñas/mariagomez.jpg",
            rating: 4,
            comment: "La granola es mi desayuno favorito. Calidad premium y delicioso sabor."
        },
        {
            name: "Carlos Rodríguez",
            image: "assets/reseñas/carlosrodriguez.avif",
            rating: 5,
            comment: "Excelente servicio y productos frescos. Siempre compro sus harinas."
        },
        {
            name: "Ana Martínez",
            image: "assets/reseñas/anamartinez.avif",
            rating: 5,
            comment: "Los frutos secos son los mejores que he probado. ¡Recomendados 100%!"
        }
    ];

    // Generar las reseñas dinámicamente
    const reviewsGrid = document.querySelector('.reviews-grid');
    
    if (reviewsGrid) {
        reviewsGrid.innerHTML = reviews.map(review => `
            <div class="review-card">
                <img src="${review.image}" alt="${review.name}">
                <h3>${review.name}</h3>
                <div class="stars">
                    ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}
                </div>
                <p>${review.comment}</p>
            </div>
        `).join('');
    }

    // Efecto de hover para las reseñas
    const reviewCards = document.querySelectorAll('.review-card');
    reviewCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
            this.style.boxShadow = '0 10px 20px rgba(0,0,0,0.2)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = 'var(--card-shadow)';
        });
    });
});