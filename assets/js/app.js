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
  custAddr: document.getElementById('deliveryAddress'),
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
  setMinDate();
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
  el.href = href && !href.startsWith('PASTE_') ? href : '#';
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
    ].join(' ').toLowerCase();

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
    const hasChoices = Array.isArray(it.choices) && it.choices.length > 0;
    const hasAddOns = Array.isArray(it.addOns) && it.addOns.length > 0;

    const choicesHtml = hasChoices
      ? it.choices.map((choiceGroup, groupIndex) => {
          const groupName = `choice-${it.id}-${groupIndex}`;
          const requiredMark = choiceGroup.required ? ' *' : '';

          return `
            <div class="choice-box">
              <div class="label">${escapeHtml(choiceGroup.name || 'Choose an option')}${requiredMark}</div>
              <div class="choices-list">
                ${(choiceGroup.options || []).map((opt, optIndex) => `
                  <label class="addon-option">
                    <input
                      type="radio"
                      name="${escapeHtml(groupName)}"
                      data-choice-item="${escapeHtml(it.id)}"
                      data-choice-group="${groupIndex}"
                      data-choice-index="${optIndex}"
                      ${choiceGroup.required && optIndex === 0 ? 'checked' : ''}
                    />
                    <span>
                      ${escapeHtml(opt.name)}
                      ${Number(opt.price || 0) > 0 ? ` (+${money(opt.price)})` : ''}
                    </span>
                  </label>
                `).join('')}
              </div>
            </div>
          `;
        }).join('')
      : '';

    const addOnsHtml = hasAddOns
      ? `
        <details class="addons-box">
          <summary class="addons-summary">Make it loaded</summary>
          <div class="addons-list">
            ${it.addOns.map((addOn, index) => `
              <label class="addon-option">
                <input
                  type="checkbox"
                  data-addon-item="${escapeHtml(it.id)}"
                  data-addon-index="${index}"
                />
                <span>${escapeHtml(addOn.name)} (+${money(addOn.price)})</span>
              </label>
            `).join('')}
          </div>
        </details>
      `
      : '';

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

        ${choicesHtml}
        ${addOnsHtml}

        <label class="label" for="qty-${escapeHtml(it.id)}">Cantidad</label>
        <input
          id="qty-${escapeHtml(it.id)}"
          class="input"
          type="number"
          min="1"
          value="1"
        />

        <label class="label" for="note-${escapeHtml(it.id)}">Notas</label>
        <textarea
          id="note-${escapeHtml(it.id)}"
          class="input"
          rows="2"
          placeholder="Ej: sin cebolla, extra salsa, bien tostado..."
        ></textarea>

        <div class="item-actions">
          <button class="btn btn--primary" data-add="${escapeHtml(it.id)}">
            Add to order
          </button>
        </div>
      </div>
    `;

    const addBtn = card.querySelector('[data-add]');
    if (addBtn) {
      addBtn.addEventListener('click', () => addConfiguredItemToCart(it.id));
    }

    els.menuGrid.appendChild(card);
  }
}

function addConfiguredItemToCart(itemId) {
  const item = state.items.find((x) => x.id === itemId);
  if (!item) return;

  const qtyInput = document.getElementById(`qty-${itemId}`);
  const noteInput = document.getElementById(`note-${itemId}`);

  const qty = Math.max(1, parseInt(qtyInput?.value, 10) || 1);
  const note = safeStr(noteInput?.value);

  const selectedChoices = [];
  const choiceGroups = Array.isArray(item.choices) ? item.choices : [];

  for (let groupIndex = 0; groupIndex < choiceGroups.length; groupIndex++) {
    const group = choiceGroups[groupIndex];

    const selectedInput = document.querySelector(
      `input[data-choice-item="${itemId}"][data-choice-group="${groupIndex}"]:checked`
    );

    if (!selectedInput) {
      if (group.required) {
        alert(`Selecciona una opción para: ${group.name}`);
        return;
      }
      continue;
    }

    const optIndex = Number(selectedInput.dataset.choiceIndex);
    const selectedOption = group.options?.[optIndex];

    if (selectedOption) {
      selectedChoices.push({
        groupName: group.name,
        name: selectedOption.name,
        price: Number(selectedOption.price || 0)
      });
    }
  }

  const selectedAddOns = Array.from(
    document.querySelectorAll(`input[data-addon-item="${itemId}"]:checked`)
  ).map((input) => {
    const idx = Number(input.dataset.addonIndex);
    return item.addOns?.[idx];
  }).filter(Boolean);

  const choicesTotal = selectedChoices.reduce((sum, choice) => {
    return sum + Number(choice.price || 0);
  }, 0);

  const addOnsTotal = selectedAddOns.reduce((sum, addOn) => {
    return sum + Number(addOn.price || 0);
  }, 0);

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

  document
    .querySelectorAll(`input[data-addon-item="${itemId}"]:checked`)
    .forEach((input) => {
      input.checked = false;
    });

  const radioInputs = document.querySelectorAll(`input[data-choice-item="${itemId}"]`);
  radioInputs.forEach((input) => {
    const groupIndex = Number(input.dataset.choiceGroup);
    const group = item.choices?.[groupIndex];
    const optIndex = Number(input.dataset.choiceIndex);

    input.checked = !!(group?.required && optIndex === 0);
  });

  renderCart();
}

function changeQty(cartId, delta) {
  const row = state.cart.find((x) => x.cartId === cartId);
  if (!row) return;

  row.qty += delta;

  if (row.qty <= 0) {
    state.cart = state.cart.filter((x) => x.cartId !== cartId);
  }

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
    els.subtotal.textContent = money(0);
    return;
  }

  els.cartEmpty.style.display = 'none';

  for (const row of state.cart) {
    const line = document.createElement('div');
    line.className = 'cart__item';

    const lineTotal = row.unitPrice * row.qty;

    const choicesText = Array.isArray(row.choices) && row.choices.length
      ? row.choices.map((c) => `${c.groupName}: ${c.name}${c.price > 0 ? ` (+${money(c.price)})` : ''}`).join(', ')
      : '';

    const addOnsText = Array.isArray(row.addOns) && row.addOns.length
      ? row.addOns.map((a) => `${a.name} (+${money(a.price)})`).join(', ')
      : '';

    line.innerHTML = `
      <div class="cart__info">
        <div><strong>${escapeHtml(row.name)}</strong></div>
        <div class="muted small">${money(row.unitPrice)} c/u</div>
        ${choicesText ? `<div class="muted small">Selección: ${escapeHtml(choicesText)}</div>` : ''}
        ${addOnsText ? `<div class="muted small">Extras: ${escapeHtml(addOnsText)}</div>` : ''}
        ${row.note ? `<div class="muted small">Nota: ${escapeHtml(row.note)}</div>` : ''}
      </div>

      <div class="cart__controls">
        <button class="btn btn--ghost btn--mini" data-minus="${escapeHtml(row.cartId)}">-</button>
        <span class="cart__qty">${row.qty}</span>
        <button class="btn btn--ghost btn--mini" data-plus="${escapeHtml(row.cartId)}">+</button>
        <strong>${money(lineTotal)}</strong>
        <button class="btn btn--ghost btn--mini" data-remove="${escapeHtml(row.cartId)}">x</button>
      </div>
    `;

    line.querySelector('[data-minus]')?.addEventListener('click', () => changeQty(row.cartId, -1));
    line.querySelector('[data-plus]')?.addEventListener('click', () => changeQty(row.cartId, 1));
    line.querySelector('[data-remove]')?.addEventListener('click', () => removeFromCart(row.cartId));

    els.cartList.appendChild(line);
  }

  els.subtotal.textContent = money(getSubtotal());
}

function getSubtotal() {
  return state.cart.reduce((sum, row) => sum + row.unitPrice * row.qty, 0);
}

function buildOrderMessage() {
  const name = safeStr(els.custName?.value);
  const phone = safeStr(els.custPhone?.value);
  const date = safeStr(els.custDate?.value);
  const time = safeStr(document.getElementById('custTime')?.value);
  const type = safeStr(els.custType?.value);

  const addrField = document.getElementById('deliveryAddress');
  const addr = safeStr(addrField?.value || els.custAddr?.value);

  const notes = safeStr(els.custNotes?.value);

  const orderLines = state.cart.length
    ? state.cart.map((row) => {
        const choices = row.choices?.length
          ? ` | Selección: ${row.choices.map((c) => `${c.groupName}: ${c.name}${c.price > 0 ? ` (+${money(c.price)})` : ''}`).join(', ')}`
          : '';

        const extras = row.addOns?.length
          ? ` | Extras: ${row.addOns.map((a) => `${a.name} (+${money(a.price)})`).join(', ')}`
          : '';

        const note = row.note ? ` | Nota: ${row.note}` : '';

        return `- ${row.qty}x ${row.name}${choices}${extras}${note} (${money(row.unitPrice * row.qty)})`;
      }).join('\n')
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
    `Fecha: ${date || 'N/A'}`,
    `Hora: ${time || 'N/A'}`,
    `Tipo: ${type || 'N/A'}`,
    `Dirección: ${addr || 'N/A'}`,
    `Notas generales: ${notes || 'N/A'}`
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

function setMinDate() {
  const dateInput = document.getElementById('custDate');
  if (!dateInput) return;

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  dateInput.min = `${yyyy}-${mm}-${dd}`;
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

/* ===== MAP ADDRESS VERIFY ===== */

function getAddressValue() {
  const addressInput = document.getElementById('deliveryAddress');
  return addressInput ? addressInput.value.trim() : '';
}

function verifyGoogleMaps() {
  const address = getAddressValue();

  if (!address) {
    alert('Escribe tu dirección completa primero.');
    return;
  }

  const encoded = encodeURIComponent(address);

  window.open(
    `https://www.google.com/maps/search/?api=1&query=${encoded}`,
    '_blank'
  );
}

function verifyAppleMaps() {
  const address = getAddressValue();

  if (!address) {
    alert('Escribe tu dirección completa primero.');
    return;
  }

  const encoded = encodeURIComponent(address);

  window.open(
    `https://maps.apple.com/?q=${encoded}`,
    '_blank'
  );
}

/* ===== DISTANCE CHECK ===== */

function checkDistance() {
  const addressInput = document.getElementById('deliveryAddress');
  const address = addressInput ? addressInput.value.trim() : '';

  if (!address) {
    alert('Escribe tu dirección completa primero.');
    return;
  }

  const origin = encodeURIComponent('San Bruno CA');
  const destination = encodeURIComponent(address);

  window.open(
    `https://www.google.com/maps/dir/${origin}/${destination}`,
    '_blank'
  );
}
