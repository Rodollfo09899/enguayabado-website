for (const it of items){
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
        <button class="btn btn--primary" data-add="${it.id}">Agregar</button>
        <button class="btn btn--ghost" data-add2="${it.id}">+2</button>
      </div>
    </div>
  `;

  grid.appendChild(card);
}
