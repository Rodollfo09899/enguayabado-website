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
      ${it.image ? `<img src="${escapeHtml(it.image)}" alt="${escapeHtml(it.name)}" class="item__img" loading="lazy">` : ''}

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
