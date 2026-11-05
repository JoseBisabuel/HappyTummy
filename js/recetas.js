// Recetas de Vitalis. Para agregar una receta nueva, añade un objeto a RECETAS:
// se mostrará sola en el carrusel del inicio y en la página de recetas.
const RECETAS = [
  {
    id: 'ensalada-quinua-roja',
    titulo: 'Ensalada fresca de quinua roja',
    resumen: 'Una ensalada ligera, nutritiva y lista en 25 minutos, con quinua roja y vegetales frescos.',
    imagen: 'assets/productos/semillas/quinuaRoja250.jpg',
    alt: 'Bolsa de quinua roja Happy Tummy',
    tiempo: '25 minutos',
    porciones: '4 porciones',
    producto: { nombre: 'Quinua Roja x 250 grs', enlace: 'semillas.html#prod-quinua-roja-x-250-grs' },
    ingredientes: [
      '1 taza (170 g) de quinua roja',
      '2 tazas de agua',
      '1/2 cucharadita de sal',
      '1 tomate maduro en cubos pequeños',
      '1 pepino cohombro en cubos pequeños',
      '1/2 cebolla roja finamente picada',
      '1 zanahoria rallada',
      '1/4 de taza de cilantro picado',
      'Jugo de 2 limones',
      '3 cucharadas de aceite de oliva',
      '1 aguacate en cubos (opcional)'
    ],
    pasos: [
      'Lava la quinua roja con abundante agua en un colador fino, frotándola con las manos, hasta que el agua salga clara.',
      'Pon en una olla las 2 tazas de agua con la sal y llévalas a hervir. Añade la quinua, baja el fuego y cocina tapada durante 15 minutos.',
      'Apaga el fuego y deja reposar la quinua tapada 5 minutos. Luego esponja con un tenedor y deja enfriar.',
      'Mientras tanto, pica el tomate, el pepino y la cebolla, y ralla la zanahoria.',
      'En un recipiente grande mezcla la quinua fría con las verduras y el cilantro.',
      'Prepara el aderezo mezclando el jugo de limón, el aceite de oliva y una pizca de sal. Báñalo sobre la ensalada y revuelve suavemente.',
      'Sirve fría o a temperatura ambiente, y si quieres, agrega el aguacate justo antes de comer.'
    ]
  }
];

document.addEventListener('DOMContentLoaded', function () {
  const esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  // ---------- Carrusel en el inicio ----------
  const track = document.getElementById('recetas-track');
  if (track) {
    const dotsBox = document.getElementById('recetas-dots');
    const prev = document.querySelector('.recetas-prev');
    const next = document.querySelector('.recetas-next');
    track.innerHTML = RECETAS.map(function (r) {
      return '<a class="receta-slide" href="recetas.html">' +
        '<img src="' + esc(r.imagen) + '" alt="' + esc(r.alt) + '" loading="lazy" decoding="async">' +
        '<div class="receta-slide-texto"><h3>' + esc(r.titulo) + '</h3><p>' + esc(r.resumen) + '</p>' +
        '<span class="receta-ver">Ver receta</span></div></a>';
    }).join('');

    let actual = 0, timer = null;
    const total = RECETAS.length;
    function ir(i) {
      actual = (i + total) % total;
      track.style.transform = 'translateX(-' + (actual * 100) + '%)';
      if (dotsBox) Array.prototype.forEach.call(dotsBox.children, function (d, n) { d.classList.toggle('activo', n === actual); });
    }
    function auto() { clearInterval(timer); if (total > 1) timer = setInterval(function () { ir(actual + 1); }, 6000); }

    if (total > 1) {
      if (dotsBox) dotsBox.innerHTML = RECETAS.map(function (r, n) { return '<button type="button" aria-label="Receta ' + (n + 1) + '"></button>'; }).join('');
      if (dotsBox) Array.prototype.forEach.call(dotsBox.children, function (d, n) { d.addEventListener('click', function () { ir(n); auto(); }); });
      if (prev) prev.addEventListener('click', function () { ir(actual - 1); auto(); });
      if (next) next.addEventListener('click', function () { ir(actual + 1); auto(); });
      ir(0); auto();
    } else {
      if (prev) prev.hidden = true;
      if (next) next.hidden = true;
    }
  }

  // ---------- Página de recetas ----------
  const lista = document.getElementById('recetas-lista');
  const detalle = document.getElementById('receta-detalle');
  if (!lista || !detalle) return;

  const volver = document.getElementById('recetas-volver');
  let abiertaDesdeLista = false;
  let scrollLista = 0;

  lista.innerHTML = RECETAS.map(function (r) {
    return '<a class="receta-card" href="#' + r.id + '" data-id="' + r.id + '">' +
      '<img src="' + esc(r.imagen) + '" alt="' + esc(r.alt) + '" loading="lazy" decoding="async">' +
      '<div class="receta-card-texto"><h3>' + esc(r.titulo) + '</h3><p>' + esc(r.resumen) + '</p>' +
      '<span class="receta-meta">' + esc(r.tiempo) + ' · ' + esc(r.porciones) + '</span></div></a>';
  }).join('');

  function mostrar() {
    const id = decodeURIComponent(location.hash.replace('#', ''));
    const r = RECETAS.filter(function (x) { return x.id === id; })[0];
    if (!r) {
      detalle.hidden = true; lista.hidden = false;
      document.title = 'Recetas - Tienda Vegetariana Vitalis';
      window.scrollTo(0, scrollLista);
      return;
    }
    detalle.innerHTML =
      '<div class="receta-detalle-img"><img src="' + esc(r.imagen) + '" alt="' + esc(r.alt) + '">' +
      '<a class="receta-comprar" href="' + esc(r.producto.enlace) + '">Comprar ' + esc(r.producto.nombre) + '</a></div>' +
      '<div class="receta-detalle-cuerpo"><h2>' + esc(r.titulo) + '</h2>' +
      '<p class="receta-meta">' + esc(r.tiempo) + ' · ' + esc(r.porciones) + '</p>' +
      '<h3>Ingredientes</h3><ul>' + r.ingredientes.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>' +
      '<h3>Preparación</h3><ol>' + r.pasos.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ol></div>';
    lista.hidden = true; detalle.hidden = false;
    document.title = r.titulo + ' - Vitalis';
    window.scrollTo(0, 0);
  }

  lista.addEventListener('click', function (e) {
    if (e.target.closest('.receta-card')) { abiertaDesdeLista = true; scrollLista = window.scrollY; }
  });
  window.addEventListener('hashchange', mostrar);

  volver.addEventListener('click', function () {
    if (!detalle.hidden) {
      // Detalle -> inicio de las recetas
      if (abiertaDesdeLista) { abiertaDesdeLista = false; history.back(); }
      else { history.replaceState(null, '', location.pathname); mostrar(); }
    } else if (document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1) {
      // Inicio de recetas -> exactamente donde estaba
      history.back();
    } else {
      location.href = 'index.html#recetas';
    }
  });

  mostrar();
});
