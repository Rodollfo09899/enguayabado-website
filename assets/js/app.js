let MENU = null;
let CART = new Map(); // id -> {item, qty}

const $ = (id) => document.getElementById(id);

function money(n){
  return new Intl.NumberFormat('en-US', { style:'currency', currency:'USD' }).format(n);
}

function cartSubtotal(){
  let s = 0;
  for (const v of CART.values()) s += v.item.price * v.qty;
  return s;
}

function renderCart(){
  const list = $('cartList');
  const empty = $('cartEmpty');
  list.innerHTML = '';

  if (CART.size === 0){
    empty.style.display = 'block';
    $('subtotal').textContent = money(0);
    return;
  }
  empty.style.display = 'none';

  for (const [id, v] of CART.entries()){
    const el = document.createElement('div');
    el.className = 'cart-item';
    el.innerHTML = `
      <div>
        <div class="cart-item__name">${escapeHtml(v.item.name)}</div>
        <div class="cart-item__meta">${escapeHtml(v.item.category)} • ${money(v.item.price)} ea</div>
      </div>
      <div class="cart-item__right">
        <input class="input qty" type="number" min="1" value="${v.qty}" data-id="${id}" />
        <button class="btn btn--ghost" data-remove="${id}">Quitar</button>
      </div>
    `;
    list.appendChild(el);
  }

  $('subtotal').textContent = money(cartSubtotal());

  list.querySelectorAll('input[data-id]').forEach(inp => {
    inp.addEventListener('change', (e) => {
      const id = e.target.dataset.id;
      const qty = Math.max(1, parseInt(e.target.value || '1', 10));
      const v = CART.get(id);
      if (!v) return;
      v.qty = qty;
      CART.set(id, v);
      renderCart();
    });
  });

  list.querySelectorAll('button[data-remove]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.dataset.remove;
      CART.delete(id);
      renderCart();
    });
  });
}

function renderMenu(){
  const grid = $('menuGrid');
  grid.innerHTML = '';

  const search = ($('search').value || '').toLowerCase().trim();
  const cat = $('category').value;

  const items = MENU.items.filter(it => {
    const matchesSearch =
      !search ||
      it.name.toLowerCase().includes(search) ||
      (it.description || '').toLowerCase().includes(search) ||
      it.category.toLowerCase().includes(search);

    const matchesCat = (cat === 'all') || (it.category === cat);
    return matchesSearch && matchesCat;
  });

  for (const it of items){
    const card = document.createElement('div');
    card.className = 'item';
    card.innerHTML = `
      <div class="item__top">
        <div>
          <div class="item__name">${escapeHtml(it.name)}</div>
          <div class="item__cat">${escapeHtml(it.category)}</div>
        </div>
        <div class="item__price">${money(it.price)}</div>
      </div>
      <div class="item__desc">${escapeHtml(it.description || '')}</div>
      <div class="item__actions">
        <button class="btn btn--primary" data-add="${it.id}">Agregar</button>
        <button class="btn btn--ghost" data-add2="${it.id}">+2</button>
      </div>
    `;
    grid.appendChild(card);
  }

  grid.querySelectorAll('button[data-add]').forEach(btn => {
    btn.addEventListener('click', () => addToCart(btn.dataset.add, 1));
  });
  grid.querySelectorAll('button[data-add2]').forEach(btn => {
    btn.addEventListener('click', () => addToCart(btn.dataset.add2, 2));
  });
}

function addToCart(id, qty){
  const it = MENU.items.find(x => x.id === id);
  if (!it) return;

  const current = CART.get(id);
  const newQty = (current ? current.qty : 0) + qty;
  CART.set(id, { item: it, qty: newQty });

  renderCart();
  document.getElementById('order').scrollIntoView({ behavior:'smooth', block:'start' });
}

function buildOrderText(){
  const name = ($('custName').value || '').trim();
  const phone = ($('custPhone').value || '').trim();
  const when = ($('custDate').value || '').trim();
  const type = $('custType').value;
  const addr = ($('custAddr').value || '').trim();
  const notes = ($('custNotes').value || '').trim();

  const lines = [];
  lines.push(`ENGUAYABADO ORDER`);
  lines.push(`Name: ${name || 'N/A'}`);
  lines.push(`Customer phone: ${phone || 'N/A'}`);
  lines.push(`When: ${when || 'N/A'}`);
  lines.push(`Type: ${type}`);
  if (type !== 'pickup') lines.push(`Address: ${addr || 'N/A'}`);
  if (notes) lines.push(`Notes: ${notes}`);
  lines.push(`--- Items ---`);
  for (const v of CART.values()){
    lines.push(`${v.qty}x ${v.item.name} (${money(v.item.price)})`);
  }
  lines.push(`Subtotal est.: ${money(cartSubtotal())}`);
  lines.push(`Confirm total + payment (Zelle/Venmo).`);
  return lines.join('\n');
}

function sendSMS(){
  if (CART.size === 0) return alert('Agrega items primero.');
  const txt = buildOrderText();
  const phone = MENU.business.phoneE164 || '';
  window.location.href = `sms:${encodeURIComponent(phone)}?&body=${encodeURIComponent(txt)}`;
}

function sendWhatsApp(){
  if (CART.size === 0) return alert('Agrega items primero.');
  const txt = buildOrderText();
  const wa = MENU.business.whatsAppPhoneE164 || '';
  window.open(`https://wa.me/${encodeURIComponent(wa)}?text=${encodeURIComponent(txt)}`, '_blank', 'noreferrer');
}

function escapeHtml(str){
  return String(str)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'","&#039;");
}

async function init(){
  $('year').textContent = new Date().getFullYear();

  // nav mobile
  const navBtn = $('navBtn');
  const nav = document.getElementById('nav');
  navBtn.addEventListener('click', () => nav.classList.toggle('open'));

  // load menu
  const res = await fetch('assets/data/menu.json', { cache: 'no-store' });
  MENU = await res.json();

  // fill links
  $('igLinkTop').href = MENU.business.instagramUrl || '#';
  $('igLink').href = MENU.business.instagramUrl || '#';
  $('googleReviewLink').href = MENU.business.googleReviewUrl || '#';
  $('yelpLink').href = MENU.business.yelpUrl || '#';
  $('phoneLink').href = `tel:${MENU.business.phoneE164 || ''}`;
  $('phoneTop').href = `tel:${MENU.business.phoneE164 || ''}`;

  // categories
  const catSel = $('category');
  for (const c of MENU.categories){
    const opt = document.createElement('option');
    opt.value = c; opt.textContent = c;
    catSel.appendChild(opt);
  }

  $('search').addEventListener('input', renderMenu);
  $('category').addEventListener('change', renderMenu);
  $('sendSms').addEventListener('click', sendSMS);
  $('sendWa').addEventListener('click', sendWhatsApp);

  renderMenu();
  renderCart();
}

init().catch(err => {
  console.error(err);
  alert('Error cargando el menú. Revisa el menu.json.');
});