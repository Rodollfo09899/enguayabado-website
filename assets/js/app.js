const state = {
  business: {},
  categories: [],
  items: [],
  filteredItems: [],
  cart: []
};

const els = {
  menuGrid: document.getElementById('menuGrid'),
  search: document.getElementById('search'),
  category: document.getElementById('category'),

  cartEmpty: document.getElementById('cartEmpty'),
  cartList: document.getElementById('cartList'),
  subtotal: document.getElementById('subtotal'),

  custName: document.getElementById('custName'),
  custPhone: document.getElementById('custPhone'),
  custDate: document.getElementById('custDate'),
  custType: document.getElementById('custType'),
  custAddr: document.getElementById('custAddr'),
  custNotes: document.getElementById('custNotes'),

  sendSms: document.getElementById('sendSms'),
  sendWa: document.getElementById('sendWa'),

  igLinkTop: document.getElementById('igLinkTop'),
  phoneTop: document.getElementById('phoneTop'),
  googleReviewLink: document.getElementById('googleReviewLink'),
  yelpLink: document.getElementById('yelpLink'),
  phoneLink: document.getElementById('phoneLink'),
  igLink: document.getElementById('igLink'),

  navBtn: document.getElementById('navBtn'),
  nav: document.getElementById('nav'),
  year: document.getElementById('year')
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
  wireStaticUi();
  await loadMenuData();
  hydrateBusinessLinks();
  renderCategories();
  applyFilters();
  renderCart();
  setYear();
}

function wireStaticUi() {
  if (els.search) {
    els.search.addEventListener('input', applyFilters);
  }

  if (els.category) {
    els.category.addEventListener('change', applyFilters);
  }

  if (els.sendSms) {
    els.sendSms.addEventListener('click', sendOrderBySms);
  }

  if (els.sendWa) {
    els.sendWa.addEventListener('click', sendOrderByWhatsApp);
  }

  if (els.navBtn && els.nav) {
    els.navBtn.addEventListener('click', () => {
      els.nav.classList.toggle('is-open');
    });
  }
}

async function loadMenuData() {
  try {
    const res = await fetch('assets/data/menu.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`No se pudo cargar menu.json (${res.status})`);

    const data = await res.json();

    state.business = data.business || {};
    state.categories = Array.isArray(data.categories) ? data.categories : [];
    state.items = Array.isArray(data.items) ? data.items : [];
    state.filteredItems = [...state.items];
  } catch (err) {
    console.error(err);
    if (els.menuGrid) {
      els.menuGrid.innerHTML = `
        <div class="item">
          <div class="item-body">
            <h3>Error cargando el menú</h3>
            <p>Revisa <code>assets/data/menu.json</code> y que el archivo exista.</p>
          </div>
        </div>
      `;
    }
  }
}

function hydrateBusinessLinks() {
  const phoneE164 = safeStr(state.business.phoneE164);
  const waPhone = safeStr(state.business.whatsAppPhoneE164);
  const instagramUrl = safeStr(state.business.instagramUrl);
  const googleReviewUrl = safeStr(state.business.googleReviewUrl);
  const yelpUrl = safeStr(state.business.yelpUrl);

  setLink(els.igLinkTop, instagramUrl);
  setLink(els.igLink, instagramUrl);

  if (phoneE164) {
    setLink(els.phoneTop, `tel:${phoneE164}`);
    setLink(els.phoneLink, `tel:${phoneE164}`);
  }

  setLink(els.googleReviewLink, googleReviewUrl);
  setLink(els.yelpLink, yelpUrl);

  state.business._smsPhone = phoneE164.replace(/[^\d+]/g, '');
  state.business._waPhone = waPhone.replace(/[^\d]/g, '');
}

function setLink(el, href) {
  if (!el) return;
  if (href && !href.startsWith('PASTE_')) {
    el.href = href;
  } else {
    el.href = '#';
  }
}

function renderCategories() {
  if (!els.category) return;

  const currentValue = els.category.value || 'all';
  els.category.innerHTML = `<option value="all">Todas las categorías</option>`;

  for (const cat of state.categories) {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    els.category.appendChild(opt);
  }

  els.category.value = state.categories.includes(currentValue) ? currentValue : 'all';
}

function applyFilters() {
  const searchTerm = safeStr(els.search?.value).toLowerCase().trim();
  const selectedCategory = safeStr(els.category?.value) || 'all';

  state.filteredItems = state.items.filter((it) => {
    const matchesCategory =
      selectedCategory === 'all' || safeStr(it.category) === selectedCategory;

    const haystack = [
      safeStr(it.name),
      safeStr(it.category),
      safeStr(it.description)
    ]
      .join(' ')
      .toLowerCase();

    const matchesSearch = !searchTerm || haystack.includes(searchTerm);

    return matchesCategory && matchesSearch;
  });

  renderMenu(state.filteredItems);
}

function renderMenu(items) {
  if (!els.menuGrid) return;

  els.menuGrid.innerHTML = '';

  if (!items.length) {
    els.menuGrid.innerHTML = `
      <div class="item">
        <div class="item-body">
          <h3>No encontré resultados</h3>
          <p>Prueba otra búsqueda o cambia la categoría.</p>
        </div>
      </div>
    `;
    return;
  }

  for (const it of items) {
    const card = document.createElement('div');
    card.className = 'item';

    card.innerHTML = `
      <div class="item-body">
        <h3>${escapeHtml(it.name)}</h3>

        <div class="item-meta">
          <span class="pill">${escapeHtml(it.category)}</span>
          <strong>${money(it.price)}</strong>
        </div>

        <p>${escapeHtml(it.description || '')}</p>

        <div class="item-actions">
          <button class="btn btn--primary" data-add="${escapeHtml(it.id)}">Agregar</button>
          <button class="btn btn--ghost" data-add2="${escapeHtml(it.id)}">+2</button>
        </div>
      </div>
    `;

    const addBtn = card.querySelector('[data-add]');
    const add2Btn = card.querySelector('[data-add2]');

    if (addBtn) {
      addBtn.addEventListener('click', () => addToCart(it.id, 1));
    }

    if (add2Btn) {
      add2Btn.addEventListener('click', () => addToCart(it.id, 2));
    }

    els.menuGrid.appendChild(card);
  }
}

function addToCart(itemId, qty = 1) {
  const item = state.items.find((x) => x.id === itemId);
  if (!item) return;

  const existing = state.cart.find((x) => x.id === itemId);

  if (existing) {
    existing.qty += qty;
  } else {
    state.cart.push({
      id: item.id,
      name: item.name,
      price: Number(item.price) || 0,
      qty
    });
  }

  renderCart();
}

function changeQty(itemId, delta) {
  const row = state.cart.find((x) => x.id === itemId);
  if (!row) return;

  row.qty += delta;

  if (row.qty <= 0) {
    state.cart = state.cart.filter((x) => x.id !== itemId);
  }

  renderCart();
}

function removeFromCart(itemId) {
  state.cart = state.cart.filter((x) => x.id !== itemId);
  renderCart();
}

function renderCart() {
  if (!els.cartList || !els.cartEmpty || !els.subtotal) return;

  els.cartList.innerHTML = '';

  if (!state.cart.length) {
    els.cartEmpty.style.display = '';
    els.subtotal.textContent = money(0);
    return;
  }

  els.cartEmpty.style.display = 'none';

  for (const row of state.cart) {
    const line = document.createElement('div');
    line.className = 'cart__item';

    const lineTotal = row.price * row.qty;

    line.innerHTML = `
      <div class="cart__info">
        <div><strong>${escapeHtml(row.name)}</strong></div>
        <div class="muted small">${money(row.price)} c/u</div>
      </div>

      <div class="cart__controls">
        <button class="btn btn--ghost btn--mini" data-minus="${escapeHtml(row.id)}">-</button>
        <span class="cart__qty">${row.qty}</span>
        <button class="btn btn--ghost btn--mini" data-plus="${escapeHtml(row.id)}">+</button>
        <strong>${money(lineTotal)}</strong>
        <button class="btn btn--ghost btn--mini" data-remove="${escapeHtml(row.id)}">x</button>
      </div>
    `;

    line.querySelector('[data-minus]')?.addEventListener('click', () => changeQty(row.id, -1));
    line.querySelector('[data-plus]')?.addEventListener('click', () => changeQty(row.id, 1));
    line.querySelector('[data-remove]')?.addEventListener('click', () => removeFromCart(row.id));

    els.cartList.appendChild(line);
  }

  els.subtotal.textContent = money(getSubtotal());
}

function getSubtotal() {
  return state.cart.reduce((sum, row) => sum + row.price * row.qty, 0);
}

function buildOrderMessage() {
  const name = safeStr(els.custName?.value);
  const phone = safeStr(els.custPhone?.value);
  const date = safeStr(els.custDate?.value);
  const type = safeStr(els.custType?.value);
  const addr = safeStr(els.custAddr?.value);
  const notes = safeStr(els.custNotes?.value);

  const orderLines = state.cart.length
    ? state.cart.map((row) => `- ${row.qty}x ${row.name} (${money(row.price * row.qty)})`).join('\n')
    : '- Sin items todavía';

  return [
    'Hola, quiero hacer un pedido en Enguayabado.',
    '',
    'Mi pedido:',
    orderLines,
    '',
    `Subtotal estimado: ${money(getSubtotal())}`,
    '',
    `Nombre: ${name || 'N/A'}`,
    `Teléfono: ${phone || 'N/A'}`,
    `Fecha y hora: ${date || 'N/A'}`,
    `Tipo: ${type || 'N/A'}`,
    `Dirección: ${addr || 'N/A'}`,
    `Notas: ${notes || 'N/A'}`
  ].join('\n');
}

function sendOrderBySms() {
  const msg = buildOrderMessage();
  const smsPhone = state.business._smsPhone || '';

  if (!state.cart.length) {
    alert('Primero agrega items al pedido.');
    return;
  }

  const href = smsPhone
    ? `sms:${smsPhone}?body=${encodeURIComponent(msg)}`
    : `sms:?body=${encodeURIComponent(msg)}`;

  window.location.href = href;
}

function sendOrderByWhatsApp() {
  const msg = buildOrderMessage();
  const waPhone = state.business._waPhone || '';

  if (!state.cart.length) {
    alert('Primero agrega items al pedido.');
    return;
  }

  const href = waPhone
    ? `https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`
    : `https://wa.me/?text=${encodeURIComponent(msg)}`;

  window.open(href, '_blank', 'noopener,noreferrer');
}

function setYear() {
  if (els.year) {
    els.year.textContent = String(new Date().getFullYear());
  }
}

function safeStr(value) {
  return String(value ?? '').trim();
}

function money(n) {
  return `$${Number(n || 0).toFixed(2)}`;
}

function escapeHtml(str) {
  return safeStr(str).replace(/[&<>"']/g, (m) => {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m];
  });
}
