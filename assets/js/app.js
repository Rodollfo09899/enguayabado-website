card.innerHTML = `
  <div class="item-body">
    <h3>${escapeHtml(it.name)}</h3>
    <div class="item-meta">
      <span class="pill">${escapeHtml(it.category)}</span>
      <strong>${money(it.price)}</strong>
    </div>
    <p>${escapeHtml(it.description || '')}</p>
    <div class="item-actions">
      <button data-add="${it.id}">Agregar</button>
      <button data-add2="${it.id}">+2</button>
    </div>
  </div>
`;

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
