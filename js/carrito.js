document.addEventListener('DOMContentLoaded', function () {
    console.log("Carrito cargado");

    let cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
    console.log("Carrito cargado desde localStorage:", cartItems);

    const cartContainer = document.querySelector('.cart-items');
    const totalElement = document.getElementById('total');
    const checkoutButton = document.getElementById('checkout');

    function updateCart() {
        if (cartContainer && totalElement) {
            console.log("Actualizando carrito...");
            cartContainer.innerHTML = '';
            let total = 0;

            cartItems.forEach((item, index) => {
                const cartItem = document.createElement('div');
                cartItem.classList.add('cart-item');
                cartItem.innerHTML = `
                    <div class="item-info">
                        <span class="item-name">${item.name} (${item.quantity})</span>
                        <span class="item-price">$${(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                    <button class="remove-item" data-index="${index}">Eliminar</button>
                `;
                cartContainer.appendChild(cartItem);
                total += item.price * item.quantity;
            });

            totalElement.textContent = total.toLocaleString();
            localStorage.setItem('cartItems', JSON.stringify(cartItems));
            console.log("Carrito guardado en localStorage:", cartItems);

            addRemoveItemEvents();
        }
    }

    function addRemoveItemEvents() {
        document.querySelectorAll('.remove-item').forEach((button) => {
            button.addEventListener('click', function () {
                const index = this.getAttribute('data-index');
                cartItems.splice(index, 1);
                updateCart();
            });
        });
    }

    document.querySelectorAll('.add-to-cart').forEach((button) => {
        button.addEventListener('click', function() {
            const name = this.getAttribute('data-name');
            const price = parseInt(this.getAttribute('data-price'));
            
            this.classList.add('added');

            const existingItem = cartItems.find(item => item.name === name);
            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                cartItems.push({ name, price, quantity: 1 });
            }

            localStorage.setItem('cartItems', JSON.stringify(cartItems));
            updateCart();

            setTimeout(() => {
                this.classList.remove('added');
            }, 1000);
            
            const originalText = this.textContent;
            this.textContent = "✓ Añadido";
            setTimeout(() => {
                this.textContent = originalText;
            }, 1000);
        });
    });

    if (checkoutButton) {
        checkoutButton.addEventListener('click', function () {
            if (cartItems.length === 0) {
                alert('Tu carrito está vacío. Añade productos antes de continuar.');
                return;
            }

            const message = cartItems
                .map((item) => `${item.name} (${item.quantity}) - $${(item.price * item.quantity).toLocaleString()}`)
                .join('%0A');
            const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
            const whatsappUrl = `https://wa.me/3144030783?text=Hola, quiero hacer este pedido:%0A${message}%0ATotal: $${total.toLocaleString()}`;

            window.open(whatsappUrl, '_blank');
        });
    }

    if (cartContainer && totalElement) {
        updateCart();
    }
});