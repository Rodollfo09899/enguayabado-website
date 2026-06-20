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
  categoryChips: document.getElementById('categoryChips'),
  skeletonGrid: document.getElementById('skeletonGrid'),

  cartEmpty: document.getElementById('cartEmpty'),
  cartList: document.getElementById('cartList'),
  subtotal: document.getElementById('subtotal'),
  stickyCart: document.getElementById('stickyCart'),
  stickyCartCount: document.getElementById('stickyCartCount'),
  stickyCartTotal: document.getElementById('stickyCartTotal'),

  custName: document.getElementById('custName'),
  custPhone: document.getElementById('custPhone'),
  custDate: document.getElementById('custDate'),
  custTime: document.getElementById('custTime'),
  custType: document.getElementById('custType'),
  custAddr: document.getElementById('deliveryAddress'),
  custNotes: document.getElementById('custNotes'),

  sendSms: document.getElementById('sendSms'),
  sendWa: document.getElementById('sendWa'),

  googleReviewLink: document.getElementById('googleReviewLink'),
  yelpLink: document.getElementById('yelpLink'),
  phoneLink: document.getElementById('phoneLink'),
  igLink: document.getElementById('igLink'),

  galleryModal: document.getElementById('galleryModal'),
  closeGallery: document.getElementById('closeGallery'),
  modalImage: document.getElementById('modalImage'),
  modalTitle: document.getElementById('modalTitle'),

  year: document.getElementById('year')
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
  wireStaticUi();
  showSkeleton();
  await loadMenuData();
  hydrateBusinessLinks();
  renderCategories();
  applyFilters();
  renderCart();
  setMinDate();
  setYear();
}

function wireStaticUi() {
  els.search?.addEventListener('input', applyFilters);
  els.category?.addEventListener('change', () => {
    syncActiveChip(els.category.value || 'all');
    applyFilters();
  });
  els.sendSms?.addEventListener('click', sendOrderBySms);
  els.sendWa?.addEventListener('click', sendOrderByWhatsApp);
  els.stickyCart?.addEventListener('click', () => {
    document.getElementById('order')?.scrollIntoView({ behavior: 'smooth' });
  });

  document.querySelectorAll('.photo-trigger').forEach((btn) => {
    btn.addEventListener('click', () => openGallery(btn.dataset.img, btn.dataset.title));
  });

  els.closeGallery?.addEventListener('click', closeGallery);
  els.galleryModal?.addEventListener('click', (event) => {
    if (event.target === els.galleryModal) closeGallery();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeGallery();
  });
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
  } finally {
    hideSkeleton();
  }
}

function showSkeleton() {
  if (!els.skeletonGrid) return;
  els.skeletonGrid.innerHTML = Array.from({ length: 6 }).map(() => `
    <div class="item skeleton-card">
      <div class="item-body">
        <div class="skeleton-line"></div>
        <div class="skeleton-line short"></div>
        <div class="skeleton-line"></div>
      </div>
    </div>
  `).join('');
}

function hideSkeleton() {
  if (els.skeletonGrid) els.skeletonGrid.innerHTML = '';
}

function hydrateBusinessLinks() {
  const phoneE164 = safeStr(state.business.phoneE164);
  const waPhone = safeStr(state.business.whatsAppPhoneE164);
  const instagramUrl = safeStr(state.business.instagramUrl);
  const googleReviewUrl = safeStr(state.business.googleReviewUrl);
  const yelpUrl = safeStr(state.business.yelpUrl);

  setLink(els.igLink, instagramUrl);
  setLink(els.googleReviewLink, googleReviewUrl);
  setLink(els.yelpLink, yelpUrl);

  if (phoneE164) setLink(els.phoneLink, `tel:${phoneE164}`);

  state.business._smsPhone = phoneE164.replace(/[^\d+]/g, '');
  state.business._waPhone = waPhone.replace(/[^\d]/g, '');
}

function setLink(el, href) {
  if (!el) return;
  el.href = href && !href.startsWith('PASTE_') ? href : '#';
}

function renderCategories() {
  if (els.category) {
    const currentValue = els.category.value || 'all';
    els.category.innerHTML = '<option value="all">All Categories</option>';

    for (const cat of state.categories) {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      els.category.appendChild(opt);
    }

    els.category.value = state.categories.includes(currentValue) ? currentValue : 'all';
  }

  if (els.categoryChips) {
    const chips = ['all', ...state.categories];
    els.categoryChips.innerHTML = chips.map((cat) => `
      <button class="chip${cat === 'all' ? ' is-active' : ''}" type="button" data-category-chip="${escapeHtml(cat)}">
        ${cat === 'all' ? 'All' : escapeHtml(cat)}
      </button>
    `).join('');

    els.categoryChips.querySelectorAll('[data-category-chip]').forEach((chip) => {
      chip.addEventListener('click', () => {
        const value = chip.dataset.categoryChip || 'all';
        if (els.category) els.category.value = value;
        syncActiveChip(value);
        applyFilters();
      });
    });
  }
}

function syncActiveChip(value) {
  if (!els.categoryChips) return;
  els.categoryChips.querySelectorAll('[data-category-chip]').forEach((chip) => {
    chip.classList.toggle('is-active', chip.dataset.categoryChip === value);
  });
}

function applyFilters() {
  const searchTerm = safeStr(els.search?.value).toLowerCase();
  const selectedCategory = safeStr(els.category?.value) || 'all';

  state.filteredItems = state.items.filter((it) => {
    const matchesCategory = selectedCategory === 'all' || safeStr(it.category) === selectedCategory;
    const haystack = [it.name, it.category, it.description].map(safeStr).join(' ').toLowerCase();
    return matchesCategory && (!searchTerm || haystack.includes(searchTerm));
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
        ${renderChoices(it)}
        ${renderAddOns(it)}
        <label class="label" for="qty-${escapeHtml(it.id)}">Quantity</label>
        <input id="qty-${escapeHtml(it.id)}" class="input" type="number" min="1" value="1" />
        <label class="label" for="note-${escapeHtml(it.id)}">Notes</label>
        <textarea id="note-${escapeHtml(it.id)}" class="input" rows="2" placeholder="No onion, extra sauce, allergies..."></textarea>
        <div class="item-actions">
          <button class="btn btn--primary" type="button" data-add="${escapeHtml(it.id)}">Add to order</button>
        </div>
      </div>
    `;

    card.querySelector('[data-add]')?.addEventListener('click', () => addConfiguredItemToCart(it.id));
    els.menuGrid.appendChild(card);
  }
}

function renderChoices(item) {
  if (!Array.isArray(item.choices) || !item.choices.length) return '';

  return item.choices.map((choiceGroup, groupIndex) => {
    const groupName = `choice-${item.id}-${groupIndex}`;
    const options = Array.isArray(choiceGroup.options) ? choiceGroup.options : [];

    return `
      <div class="choice-box">
        <div class="label">${escapeHtml(choiceGroup.name || 'Choose an option')}${choiceGroup.required ? ' *' : ''}</div>
        <div class="choices-list">
          ${options.map((opt, optIndex) => `
            <label class="addon-option">
              <input
                type="radio"
                name="${escapeHtml(groupName)}"
                data-choice-item="${escapeHtml(item.id)}"
                data-choice-group="${groupIndex}"
                data-choice-index="${optIndex}"
                ${choiceGroup.required && optIndex === 0 ? 'checked' : ''}
              />
              <span>${escapeHtml(opt.name)}${Number(opt.price || 0) > 0 ? ` (+${money(opt.price)})` : ''}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function renderAddOns(item) {
  if (!Array.isArray(item.addOns) || !item.addOns.length) return '';

  return `
    <details class="addons-box">
      <summary class="addons-summary">Make it loaded</summary>
      <div class="addons-list">
        ${item.addOns.map((addOn, index) => `
          <label class="addon-option">
            <input type="checkbox" data-addon-item="${escapeHtml(item.id)}" data-addon-index="${index}" />
            <span>${escapeHtml(addOn.name)} (+${money(addOn.price)})</span>
          </label>
        `).join('')}
      </div>
    </details>
  `;
}

function addConfiguredItemToCart(itemId) {
  const item = state.items.find((x) => x.id === itemId);
  if (!item) return;

  const qtyInput = document.getElementById(`qty-${itemId}`);
  const noteInput = document.getElementById(`note-${itemId}`);
  const qty = Math.max(1, parseInt(qtyInput?.value, 10) || 1);
  const note = safeStr(noteInput?.value);

  const selectedChoices = getSelectedChoices(item);
  if (selectedChoices === null) return;

  const selectedAddOns = Array.from(document.querySelectorAll(`input[data-addon-item="${cssEscape(itemId)}"]:checked`))
    .map((input) => item.addOns?.[Number(input.dataset.addonIndex)])
    .filter(Boolean);

  const choicesTotal = selectedChoices.reduce((sum, choice) => sum + Number(choice.price || 0), 0);
  const addOnsTotal = selectedAddOns.reduce((sum, addOn) => sum + Number(addOn.price || 0), 0);
  const unitPrice = Number(item.price || 0) + choicesTotal + addOnsTotal;

  state.cart.push({
    cartId: `${item.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    id: item.id,
    name: item.name,
    basePrice: Number(item.price || 0),
    unitPrice,
    qty,
    note,
    choices: selectedChoices,
    addOns: selectedAddOns
  });

  if (qtyInput) qtyInput.value = '1';
  if (noteInput) noteInput.value = '';
  document.querySelectorAll(`input[data-addon-item="${cssEscape(itemId)}"]:checked`).forEach((input) => input.checked = false);
  resetRequiredChoices(item);
  renderCart();
}

function getSelectedChoices(item) {
  const selectedChoices = [];
  const choiceGroups = Array.isArray(item.choices) ? item.choices : [];

  for (let groupIndex = 0; groupIndex < choiceGroups.length; groupIndex++) {
    const group = choiceGroups[groupIndex];
    const selectedInput = document.querySelector(`input[data-choice-item="${cssEscape(item.id)}"][data-choice-group="${groupIndex}"]:checked`);

    if (!selectedInput) {
      if (group.required) {
        alert(`Selecciona una opción para: ${group.name}`);
        return null;
      }
      continue;
    }

    const selectedOption = group.options?.[Number(selectedInput.dataset.choiceIndex)];
    if (selectedOption) {
      selectedChoices.push({
        groupName: group.name,
        name: selectedOption.name,
        price: Number(selectedOption.price || 0)
      });
    }
  }

  return selectedChoices;
}

function resetRequiredChoices(item) {
  document.querySelectorAll(`input[data-choice-item="${cssEscape(item.id)}"]`).forEach((input) => {
    const group = item.choices?.[Number(input.dataset.choiceGroup)];
    const optIndex = Number(input.dataset.choiceIndex);
    input.checked = !!(group?.required && optIndex === 0);
  });
}

function changeQty(cartId, delta) {
  const row = state.cart.find((x) => x.cartId === cartId);
  if (!row) return;
  row.qty += delta;
  if (row.qty <= 0) state.cart = state.cart.filter((x) => x.cartId !== cartId);
  renderCart();
}

function removeFromCart(cartId) {
  state.cart = state.cart.filter((x) => x.cartId !== cartId);
  renderCart();
}

function renderCart() {
  if (!els.cartList || !els.cartEmpty || !els.subtotal) return;

  els.cartList.innerHTML = '';

  if (!state.cart.length) {
    els.cartEmpty.style.display = '';
  } else {
    els.cartEmpty.style.display = 'none';
    for (const row of state.cart) {
      const line = document.createElement('div');
      line.className = 'cart__item';
      const lineTotal = row.unitPrice * row.qty;
      const choicesText = row.choices?.length
        ? row.choices.map((c) => `${c.groupName}: ${c.name}${c.price > 0 ? ` (+${money(c.price)})` : ''}`).join(', ')
        : '';
      const addOnsText = row.addOns?.length
        ? row.addOns.map((a) => `${a.name} (+${money(a.price)})`).join(', ')
        : '';

      line.innerHTML = `
        <div class="cart__info">
          <div><strong>${escapeHtml(row.name)}</strong></div>
          <div class="muted small">${money(row.unitPrice)} each</div>
          ${choicesText ? `<div class="muted small">Selection: ${escapeHtml(choicesText)}</div>` : ''}
          ${addOnsText ? `<div class="muted small">Extras: ${escapeHtml(addOnsText)}</div>` : ''}
          ${row.note ? `<div class="muted small">Note: ${escapeHtml(row.note)}</div>` : ''}
        </div>
        <div class="cart__controls">
          <button class="btn btn--ghost btn--mini" type="button" data-minus="${escapeHtml(row.cartId)}">-</button>
          <span class="cart__qty">${row.qty}</span>
          <button class="btn btn--ghost btn--mini" type="button" data-plus="${escapeHtml(row.cartId)}">+</button>
          <strong>${money(lineTotal)}</strong>
          <button class="btn btn--ghost btn--mini" type="button" data-remove="${escapeHtml(row.cartId)}">x</button>
        </div>
      `;

      line.querySelector('[data-minus]')?.addEventListener('click', () => changeQty(row.cartId, -1));
      line.querySelector('[data-plus]')?.addEventListener('click', () => changeQty(row.cartId, 1));
      line.querySelector('[data-remove]')?.addEventListener('click', () => removeFromCart(row.cartId));
      els.cartList.appendChild(line);
    }
  }

  const subtotal = getSubtotal();
  const count = state.cart.reduce((sum, row) => sum + row.qty, 0);
  els.subtotal.textContent = money(subtotal);
  if (els.stickyCartCount) els.stickyCartCount.textContent = String(count);
  if (els.stickyCartTotal) els.stickyCartTotal.textContent = money(subtotal);
  if (els.stickyCart) els.stickyCart.classList.toggle('has-items', count > 0);
}

function getSubtotal() {
  return state.cart.reduce((sum, row) => sum + row.unitPrice * row.qty, 0);
}

function buildOrderMessage() {
  const name = safeStr(els.custName?.value);
  const phone = safeStr(els.custPhone?.value);
  const date = safeStr(els.custDate?.value);
  const time = safeStr(els.custTime?.value);
  const type = safeStr(els.custType?.value);
  const addr = safeStr(els.custAddr?.value);
  const notes = safeStr(els.custNotes?.value);

  const orderLines = state.cart.length
    ? state.cart.map((row) => {
      const choices = row.choices?.length
        ? ` | Selection: ${row.choices.map((c) => `${c.groupName}: ${c.name}${c.price > 0 ? ` (+${money(c.price)})` : ''}`).join(', ')}`
        : '';
      const extras = row.addOns?.length
        ? ` | Extras: ${row.addOns.map((a) => `${a.name} (+${money(a.price)})`).join(', ')}`
        : '';
      const note = row.note ? ` | Note: ${row.note}` : '';
      return `- ${row.qty}x ${row.name}${choices}${extras}${note} (${money(row.unitPrice * row.qty)})`;
    }).join('\n')
    : '- No items yet';

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
    `Fecha: ${date || 'N/A'}`,
    `Hora: ${time || 'N/A'}`,
    `Tipo: ${type || 'N/A'}`,
    `Dirección: ${addr || 'N/A'}`,
    `Notas generales: ${notes || 'N/A'}`
  ].join('\n');
}

function sendOrderBySms() {
  if (!state.cart.length) {
    alert('Primero agrega items al pedido.');
    return;
  }

  const msg = buildOrderMessage();
  const smsPhone = state.business._smsPhone || '';
  window.location.href = smsPhone
    ? `sms:${smsPhone}?body=${encodeURIComponent(msg)}`
    : `sms:?body=${encodeURIComponent(msg)}`;
}

function sendOrderByWhatsApp() {
  if (!state.cart.length) {
    alert('Primero agrega items al pedido.');
    return;
  }

  const msg = buildOrderMessage();
  const waPhone = state.business._waPhone || '';
  const href = waPhone
    ? `https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`
    : `https://wa.me/?text=${encodeURIComponent(msg)}`;
  window.open(href, '_blank', 'noopener,noreferrer');
}

function getAddressValue() {
  return safeStr(els.custAddr?.value);
}

function verifyGoogleMaps() {
  const address = getAddressValue();
  if (!address) {
    alert('Escribe tu dirección completa primero.');
    return;
  }
  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank', 'noopener,noreferrer');
}

function checkDistance() {
  const address = getAddressValue();
  if (!address) {
    alert('Escribe tu dirección completa primero.');
    return;
  }
  const origin = encodeURIComponent(state.business.trailerAddress || '815 South B Street, San Mateo, CA');
  window.open(`https://www.google.com/maps/dir/${origin}/${encodeURIComponent(address)}`, '_blank', 'noopener,noreferrer');
}

function openGallery(src, title) {
  if (!els.galleryModal || !els.modalImage) return;
  els.modalImage.src = src || '';
  els.modalImage.alt = title || 'Enguayabado photo';
  if (els.modalTitle) els.modalTitle.textContent = title || '';
  els.galleryModal.classList.add('active');
  els.galleryModal.setAttribute('aria-hidden', 'false');
}

function closeGallery() {
  if (!els.galleryModal) return;
  els.galleryModal.classList.remove('active');
  els.galleryModal.setAttribute('aria-hidden', 'true');
  if (els.modalImage) els.modalImage.src = '';
}

function setMinDate() {
  if (!els.custDate) return;
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  els.custDate.min = `${yyyy}-${mm}-${dd}`;
}

function setYear() {
  if (els.year) els.year.textContent = String(new Date().getFullYear());
}

function safeStr(value) {
  return String(value ?? '').trim();
}

function money(n) {
  return `$${Number(n || 0).toFixed(2)}`;
}

function escapeHtml(str) {
  return safeStr(str).replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[m]));
}

function cssEscape(value) {
  if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(value);
  return String(value).replace(/"/g, '\\"');
}

window.verifyGoogleMaps = verifyGoogleMaps;
window.checkDistance = checkDistance;
