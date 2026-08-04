/**
 * Controle de Estoque Glipearte
 * Aplicação SPA em JavaScript puro para controle de acervo de aluguel de festas.
 * Autor: Pedro Correia Lopes Filho
 */

(function () {
  'use strict';

  const TABLES = {
    products: 'products',
    suppliers: 'suppliers',
    users: 'users',
    financial: 'financial_records',
  };

  const ROUTES = {
    dashboard: renderDashboard,
    products: renderProducts,
    suppliers: renderSuppliers,
    financial: renderFinancial,
    reports: renderReports,
    users: renderUsers,
  };

  let state = {
    route: 'dashboard',
    products: [],
    suppliers: [],
    users: [],
    financial: [],
    loading: false,
    search: '',
    charts: {},
  };

  const app = document.getElementById('app');
  const pageContent = document.getElementById('page-content');
  const toastContainer = document.getElementById('toast-container');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  const menuToggle = document.getElementById('menu-toggle');
  const menuClose = document.getElementById('menu-close');
  const globalSearch = document.getElementById('global-search');
  const confirmModal = document.getElementById('confirm-modal');
  const confirmTitle = document.getElementById('confirm-title');
  const confirmMessage = document.getElementById('confirm-message');
  const confirmCancel = document.getElementById('confirm-cancel');
  const confirmOk = document.getElementById('confirm-ok');

  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const dateTimeFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  function uuid() {
    return crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str).replace(/[&<>"']/g, function (m) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m];
    });
  }

  function formatCurrency(value) {
    return currency.format(Number(value) || 0);
  }

  function formatDate(value) {
    if (!value) return '-';
    return dateFmt.format(new Date(value));
  }

  function formatDateTime(value) {
    if (!value) return '-';
    return dateTimeFmt.format(new Date(value));
  }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.setAttribute('role', 'alert');
    const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'triangle-exclamation' : 'info-circle';
    toast.innerHTML = '<i class="fas fa-' + icon + '"></i><span>' + escapeHtml(message) + '</span>';
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.25s ease-in';
      setTimeout(() => toast.remove(), 250);
    }, 4000);
  }

  async function apiRequest(path, options = {}) {
    const url = 'tables/' + path;
    const opts = Object.assign({ headers: { 'Content-Type': 'application/json' } }, options);
    try {
      const response = await fetch(url, opts);
      if (!response.ok) throw new Error('HTTP ' + response.status);
      if (response.status === 204) return null;
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  async function loadTable(stateKey, tableName) {
    const data = await apiRequest(tableName + '?limit=1000');
    state[stateKey] = data && data.data ? data.data : [];
  }

  async function loadAll() {
    state.loading = true;
    try {
      await Promise.all([
        loadTable('products', TABLES.products),
        loadTable('suppliers', TABLES.suppliers),
        loadTable('users', TABLES.users),
        loadTable('financial', TABLES.financial),
      ]);
    } catch (e) {
      showToast('Erro ao carregar dados. Tente recarregar a página.', 'error');
    } finally {
      state.loading = false;
    }
  }

  async function createRecord(tableName, data) {
    return apiRequest(tableName, { method: 'POST', body: JSON.stringify(data) });
  }

  async function updateRecord(tableName, id, data) {
    return apiRequest(tableName + '/' + id, { method: 'PUT', body: JSON.stringify(data) });
  }

  async function deleteRecord(tableName, id) {
    return apiRequest(tableName + '/' + id, { method: 'DELETE' });
  }

  function confirmAction(title, message) {
    return new Promise((resolve) => {
      confirmTitle.textContent = title;
      confirmMessage.textContent = message;
      confirmModal.classList.remove('hidden');
      confirmOk.focus();
      const cleanup = () => {
        confirmModal.classList.add('hidden');
        confirmOk.removeEventListener('click', onOk);
        confirmCancel.removeEventListener('click', onCancel);
      };
      const onOk = () => { cleanup(); resolve(true); };
      const onCancel = () => { cleanup(); resolve(false); };
      confirmOk.addEventListener('click', onOk);
      confirmCancel.addEventListener('click', onCancel);
    });
  }

  function setRoute(route) {
    if (!ROUTES[route]) route = 'dashboard';
    state.route = route;
    document.querySelectorAll('.nav-item').forEach((el) => {
      el.classList.toggle('active', el.dataset.route === route);
      el.setAttribute('aria-current', el.dataset.route === route ? 'page' : 'false');
    });
    closeSidebar();
    render();
  }

  function toggleSidebar() {
    sidebar.classList.toggle('open');
    const open = sidebar.classList.contains('open');
    overlay.classList.toggle('hidden', !open);
    menuToggle.setAttribute('aria-expanded', String(open));
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.add('hidden');
    menuToggle.setAttribute('aria-expanded', 'false');
  }

  function render() {
    destroyCharts();
    pageContent.innerHTML = '';
    ROUTES[state.route]();
    if (state.search) applySearchHighlight();
  }

  function destroyCharts() {
    Object.values(state.charts).forEach((chart) => chart && chart.destroy && chart.destroy());
    state.charts = {};
  }

  function pageHeader(title, actions = '') {
    return '<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">' +
      '<div><h2 class="text-2xl font-bold text-slate-900">' + escapeHtml(title) + '</h2>' +
      '<p class="text-sm text-slate-500">Glipearte Pegue e Monte</p></div>' +
      '<div class="flex flex-wrap gap-2">' + actions + '</div></div>';
  }

  function card(title, content, icon = '') {
    return '<div class="card p-5">' +
      (title ? '<div class="flex items-center gap-2 mb-4 text-slate-700 font-semibold">' + (icon ? '<i class="fas ' + icon + ' text-rose-600"></i>' : '') + escapeHtml(title) + '</div>' : '') +
      '<div>' + content + '</div></div>';
  }

  function getSupplierName(id) {
    const s = state.suppliers.find((x) => x.id === id);
    return s ? s.name : '—';
  }

  function getProductName(id) {
    const p = state.products.find((x) => x.id === id);
    return p ? p.name : '—';
  }

  function summaryCards() {
    const totalProducts = state.products.reduce((sum, p) => sum + (parseFloat(p.quantity) || 0), 0);
    const invested = state.products.reduce((sum, p) => sum + (parseFloat(p.total_value) || 0), 0);
    const entries = state.financial.filter((f) => f.type === 'Entrada').reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0);
    const exits = state.financial.filter((f) => f.type === 'Saída').reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0);
    const balance = entries - exits;

    return '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">' +
      card('', '<div class="text-3xl font-bold text-slate-900">' + state.products.length + '</div><div class="text-sm text-slate-500">Produtos Cadastrados</div>', 'fa-box') +
      card('', '<div class="text-3xl font-bold text-slate-900">' + totalProducts + '</div><div class="text-sm text-slate-500">Itens em Estoque</div>', 'fa-cubes') +
      card('', '<div class="text-3xl font-bold text-slate-900">' + formatCurrency(invested) + '</div><div class="text-sm text-slate-500">Total Investido</div>', 'fa-money-bill-wave') +
      card('', '<div class="text-3xl font-bold ' + (balance >= 0 ? 'text-green-600' : 'text-red-600') + '">' + formatCurrency(balance) + '</div><div class="text-sm text-slate-500">Saldo Financeiro</div>', 'fa-scale-balanced') +
      '</div>';
  }

  function renderDashboard() {
    const invested = state.products.reduce((sum, p) => sum + (parseFloat(p.total_value) || 0), 0);
    const entries = state.financial.filter((f) => f.type === 'Entrada').reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0);
    const exits = state.financial.filter((f) => f.type === 'Saída').reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0);

    let html = pageHeader('Dashboard', '<button class="btn btn-primary" onclick="appActions.exportReport()"><i class="fas fa-download"></i> Exportar Resumo</button>');
    html += summaryCards();

    html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">';
    html += card('Investimento por Categoria', '<div class="chart-wrapper"><canvas id="chart-categories"></canvas></div>', 'fa-chart-pie');
    html += card('Movimentação Financeira', '<div class="chart-wrapper"><canvas id="chart-financial"></canvas></div>', 'fa-chart-column');
    html += '</div>';

    html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">';
    html += card('Últimos Produtos Cadastrados', recentProductsTable(), 'fa-clock-rotate-left');
    html += card('Últimas Movimentações', recentFinancialTable(), 'fa-money-bill-transfer');
    html += '</div>';

    pageContent.innerHTML = html;

    drawCategoriesChart(invested);
    drawFinancialChart(entries, exits);
  }

  function recentProductsTable() {
    const items = [...state.products].sort((a, b) => (b.created_at || 0) - (a.created_at || 0)).slice(0, 5);
    if (!items.length) return '<p class="text-slate-500 text-sm">Nenhum produto cadastrado.</p>';
    let rows = items.map((p) => '<tr><td>' + escapeHtml(p.name) + '</td><td>' + escapeHtml(p.category || '—') + '</td><td>' + (parseFloat(p.quantity) || 0) + '</td><td>' + formatCurrency(p.total_value) + '</td></tr>').join('');
    return '<div class="table-container"><table class="data-table"><thead><tr><th>Produto</th><th>Categoria</th><th>Qtd</th><th>Valor</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  function recentFinancialTable() {
    const items = [...state.financial].sort((a, b) => (b.created_at || 0) - (a.created_at || 0)).slice(0, 5);
    if (!items.length) return '<p class="text-slate-500 text-sm">Nenhuma movimentação registrada.</p>';
    let rows = items.map((f) => '<tr><td>' + escapeHtml(f.category) + '</td><td>' + escapeHtml(f.description || '').substring(0, 30) + '</td><td>' + formatCurrency(f.amount) + '</td><td>' + formatDate(f.date) + '</td></tr>').join('');
    return '<div class="table-container"><table class="data-table"><thead><tr><th>Tipo</th><th>Descrição</th><th>Valor</th><th>Data</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  function drawCategoriesChart(totalInvested) {
    const categories = {};
    state.products.forEach((p) => {
      categories[p.category || 'Outros'] = (categories[p.category || 'Outros'] || 0) + (parseFloat(p.total_value) || 0);
    });
    const ctx = document.getElementById('chart-categories');
    if (!ctx) return;
    state.charts.categories = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(categories),
        datasets: [{
          data: Object.values(categories),
          backgroundColor: ['#be123c', '#f43f5e', '#fb7185', '#fda4af', '#ffe4e6', '#881337', '#475569'],
          borderWidth: 1,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'right' }, title: { display: false } },
      },
    });
  }

  function drawFinancialChart(entries, exits) {
    const ctx = document.getElementById('chart-financial');
    if (!ctx) return;
    state.charts.financial = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Entradas', 'Saídas', 'Saldo'],
        datasets: [{
          label: 'Financeiro (R$)',
          data: [entries, exits, Math.max(0, entries - exits)],
          backgroundColor: ['#16a34a', '#dc2626', '#2563eb'],
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } },
      },
    });
  }

  function renderProducts() {
    let html = pageHeader('Estoque / Produtos',
      '<button class="btn btn-secondary" onclick="appActions.openProductModal()"><i class="fas fa-plus"></i> Novo Produto</button>' +
      '<button class="btn btn-secondary" onclick="appActions.openSupplierModal()"><i class="fas fa-truck-field"></i> Novo Fornecedor</button>'
    );

    html += summaryCards();

    html += '<div class="card p-4 mb-4">' +
      '<div class="flex flex-col md:flex-row gap-3">' +
      '<div class="relative flex-1">' +
      '<span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400"><i class="fas fa-search"></i></span>' +
      '<input id="product-search" type="search" placeholder="Filtrar produtos..." class="form-input pl-10" value="' + escapeHtml(state.search) + '" />' +
      '</div>' +
      '<select id="product-filter-category" class="form-select md:w-48"><option value="">Todas categorias</option>' + productCategoryOptions() + '</select>' +
      '<select id="product-filter-status" class="form-select md:w-44"><option value="">Todos status</option><option value="Disponível">Disponível</option><option value="Alugado">Alugado</option><option value="Em Manutenção">Em Manutenção</option><option value="Indisponível">Indisponível</option></select>' +
      '</div></div>';

    html += productsTable();
    pageContent.innerHTML = html;
    bindProductFilters();
  }

  function productCategoryOptions() {
    const cats = [...new Set(state.products.map((p) => p.category).filter(Boolean))];
    return cats.map((c) => '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + '</option>').join('');
  }

  function productsTable() {
    const search = state.search.toLowerCase();
    const catFilter = document.getElementById('product-filter-category') ? document.getElementById('product-filter-category').value : '';
    const statusFilter = document.getElementById('product-filter-status') ? document.getElementById('product-filter-status').value : '';

    let items = state.products.filter((p) => {
      const matchSearch = !search || (p.name || '').toLowerCase().includes(search) || (p.description || '').toLowerCase().includes(search);
      const matchCat = !catFilter || p.category === catFilter;
      const matchStatus = !statusFilter || p.status === statusFilter;
      return matchSearch && matchCat && matchStatus;
    });

    items.sort((a, b) => a.name.localeCompare(b.name));

    if (!items.length) return card('Lista de Produtos', '<p class="text-slate-500 text-center py-8">Nenhum produto encontrado.</p>');

    let rows = items.map((p) => {
      const statusClass = 'status-' + (p.status || 'disponível').toLowerCase().replace(/\s+/g, '-');
      return '<tr>' +
        '<td class="font-medium">' + escapeHtml(p.name) + '</td>' +
        '<td>' + escapeHtml(p.category || '—') + '</td>' +
        '<td>' + escapeHtml(getSupplierName(p.supplier_id)) + '</td>' +
        '<td>' + (parseFloat(p.quantity) || 0) + '</td>' +
        '<td>' + formatCurrency(p.unit_value) + '</td>' +
        '<td>' + formatCurrency(p.total_value) + '</td>' +
        '<td><span class="status-badge ' + statusClass + '">' + escapeHtml(p.status || 'Disponível') + '</span></td>' +
        '<td class="text-right">' +
        '<button class="btn btn-icon text-rose-600 hover:bg-rose-50" onclick="appActions.openProductModal(\'' + p.id + '\')" aria-label="Editar ' + escapeHtml(p.name) + '"><i class="fas fa-pen"></i></button>' +
        '<button class="btn btn-icon text-slate-500 hover:bg-slate-100" onclick="appActions.deleteProduct(\'' + p.id + '\')" aria-label="Excluir ' + escapeHtml(p.name) + '"><i class="fas fa-trash"></i></button>' +
        '</td></tr>';
    }).join('');

    return card('Lista de Produtos',
      '<div class="table-container"><table class="data-table"><thead><tr><th>Produto</th><th>Categoria</th><th>Fornecedor</th><th>Qtd</th><th>Valor Unit.</th><th>Valor Total</th><th>Status</th><th class="text-right">Ações</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
    );
  }

  function bindProductFilters() {
    const searchInput = document.getElementById('product-search');
    const catSelect = document.getElementById('product-filter-category');
    const statusSelect = document.getElementById('product-filter-status');
    if (!searchInput) return;

    const apply = () => {
      state.search = searchInput.value;
      document.querySelector('.card:nth-of-type(2)').outerHTML = productsTable();
    };

    searchInput.addEventListener('input', apply);
    catSelect.addEventListener('change', apply);
    statusSelect.addEventListener('change', apply);
  }

  function renderSuppliers() {
    let html = pageHeader('Fornecedores',
      '<button class="btn btn-primary" onclick="appActions.openSupplierModal()"><i class="fas fa-plus"></i> Novo Fornecedor</button>'
    );

    html += '<div class="card p-4 mb-4">' +
      '<div class="relative max-w-md">' +
      '<span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400"><i class="fas fa-search"></i></span>' +
      '<input id="supplier-search" type="search" placeholder="Buscar fornecedor..." class="form-input pl-10" />' +
      '</div></div>';

    html += suppliersTable();
    pageContent.innerHTML = html;

    const searchInput = document.getElementById('supplier-search');
    searchInput.addEventListener('input', () => {
      state.search = searchInput.value;
      document.querySelector('.card:nth-of-type(2)').outerHTML = suppliersTable();
    });
  }

  function suppliersTable() {
    const search = state.search.toLowerCase();
    let items = state.suppliers.filter((s) => !search || (s.name || '').toLowerCase().includes(search) || (s.cnpj || '').toLowerCase().includes(search) || (s.email || '').toLowerCase().includes(search));
    items.sort((a, b) => a.name.localeCompare(b.name));

    if (!items.length) return card('Lista de Fornecedores', '<p class="text-slate-500 text-center py-8">Nenhum fornecedor encontrado.</p>');

    let rows = items.map((s) => '<tr>' +
      '<td class="font-medium">' + escapeHtml(s.name) + '</td>' +
      '<td>' + escapeHtml(s.cnpj || '—') + '</td>' +
      '<td>' + escapeHtml(s.phone || '—') + '</td>' +
      '<td>' + escapeHtml(s.email || '—') + '</td>' +
      '<td>' + escapeHtml(s.category || '—') + '</td>' +
      '<td class="text-right">' +
      '<button class="btn btn-icon text-rose-600 hover:bg-rose-50" onclick="appActions.openSupplierModal(\'' + s.id + '\')" aria-label="Editar ' + escapeHtml(s.name) + '"><i class="fas fa-pen"></i></button>' +
      '<button class="btn btn-icon text-slate-500 hover:bg-slate-100" onclick="appActions.deleteSupplier(\'' + s.id + '\')" aria-label="Excluir ' + escapeHtml(s.name) + '"><i class="fas fa-trash"></i></button>' +
      '</td></tr>').join('');

    return card('Lista de Fornecedores',
      '<div class="table-container"><table class="data-table"><thead><tr><th>Nome</th><th>CNPJ</th><th>Telefone</th><th>E-mail</th><th>Categoria</th><th class="text-right">Ações</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
    );
  }

  function renderFinancial() {
    let html = pageHeader('Financeiro',
      '<button class="btn btn-primary" onclick="appActions.openFinancialModal()"><i class="fas fa-plus"></i> Nova Movimentação</button>'
    );

    const entries = state.financial.filter((f) => f.type === 'Entrada').reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0);
    const exits = state.financial.filter((f) => f.type === 'Saída').reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0);
    html += '<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">' +
      card('', '<div class="text-2xl font-bold text-green-600">' + formatCurrency(entries) + '</div><div class="text-sm text-slate-500">Total Entradas</div>', 'fa-arrow-trend-up') +
      card('', '<div class="text-2xl font-bold text-red-600">' + formatCurrency(exits) + '</div><div class="text-sm text-slate-500">Total Saídas</div>', 'fa-arrow-trend-down') +
      card('', '<div class="text-2xl font-bold ' + (entries - exits >= 0 ? 'text-blue-600' : 'text-red-600') + '">' + formatCurrency(entries - exits) + '</div><div class="text-sm text-slate-500">Saldo</div>', 'fa-scale-balanced') +
      '</div>';

    html += '<div class="card p-4 mb-4">' +
      '<div class="flex flex-col md:flex-row gap-3">' +
      '<div class="relative flex-1">' +
      '<span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400"><i class="fas fa-search"></i></span>' +
      '<input id="financial-search" type="search" placeholder="Buscar movimentação..." class="form-input pl-10" />' +
      '</div>' +
      '<select id="financial-filter-type" class="form-select md:w-40"><option value="">Todos tipos</option><option value="Entrada">Entrada</option><option value="Saída">Saída</option></select>' +
      '<input id="financial-filter-date" type="date" class="form-input md:w-44" />' +
      '</div></div>';

    html += financialTable();
    pageContent.innerHTML = html;

    const searchInput = document.getElementById('financial-search');
    const typeSelect = document.getElementById('financial-filter-type');
    const dateInput = document.getElementById('financial-filter-date');

    const apply = () => {
      state.search = searchInput.value;
      document.querySelector('.card:nth-of-type(3)').outerHTML = financialTable();
    };

    searchInput.addEventListener('input', apply);
    typeSelect.addEventListener('change', apply);
    dateInput.addEventListener('change', apply);
  }

  function financialTable() {
    const search = state.search.toLowerCase();
    const typeFilter = document.getElementById('financial-filter-type') ? document.getElementById('financial-filter-type').value : '';
    const dateFilter = document.getElementById('financial-filter-date') ? document.getElementById('financial-filter-date').value : '';

    let items = state.financial.filter((f) => {
      const matchSearch = !search || (f.description || '').toLowerCase().includes(search) || (f.category || '').toLowerCase().includes(search);
      const matchType = !typeFilter || f.type === typeFilter;
      const matchDate = !dateFilter || (f.date && f.date.startsWith(dateFilter));
      return matchSearch && matchType && matchDate;
    });
    items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    if (!items.length) return card('Movimentações Financeiras', '<p class="text-slate-500 text-center py-8">Nenhuma movimentação encontrada.</p>');

    let rows = items.map((f) => '<tr>' +
      '<td><span class="inline-flex items-center gap-1 font-medium ' + (f.type === 'Entrada' ? 'text-green-600' : 'text-red-600') + '"><i class="fas fa-circle text-xs"></i> ' + escapeHtml(f.type) + '</span></td>' +
      '<td>' + escapeHtml(f.category || '—') + '</td>' +
      '<td>' + escapeHtml(f.description || '—') + '</td>' +
      '<td>' + formatCurrency(f.amount) + '</td>' +
      '<td>' + formatDate(f.date) + '</td>' +
      '<td>' + escapeHtml(getProductName(f.product_id)) + '</td>' +
      '<td class="text-right">' +
      '<button class="btn btn-icon text-rose-600 hover:bg-rose-50" onclick="appActions.openFinancialModal(\'' + f.id + '\')" aria-label="Editar"><i class="fas fa-pen"></i></button>' +
      '<button class="btn btn-icon text-slate-500 hover:bg-slate-100" onclick="appActions.deleteFinancial(\'' + f.id + '\')" aria-label="Excluir"><i class="fas fa-trash"></i></button>' +
      '</td></tr>').join('');

    return card('Movimentações Financeiras',
      '<div class="table-container"><table class="data-table"><thead><tr><th>Tipo</th><th>Categoria</th><th>Descrição</th><th>Valor</th><th>Data</th><th>Produto</th><th class="text-right">Ações</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
    );
  }

  function renderReports() {
    let html = pageHeader('Relatórios', '<button class="btn btn-primary" onclick="appActions.exportReport()"><i class="fas fa-file-csv"></i> Exportar CSV</button>');

    const totalInvested = state.products.reduce((sum, p) => sum + (parseFloat(p.total_value) || 0), 0);
    const totalItems = state.products.reduce((sum, p) => sum + (parseFloat(p.quantity) || 0), 0);

    html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">';
    html += card('Estoque por Categoria', '<div class="chart-wrapper"><canvas id="chart-report-categories"></canvas></div>', 'fa-chart-pie');
    html += card('Status dos Produtos', '<div class="chart-wrapper"><canvas id="chart-report-status"></canvas></div>', 'fa-chart-simple');
    html += '</div>';

    html += card('Resumo Geral',
      '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">' +
      '<div class="p-4 bg-slate-50 rounded-lg"><div class="text-sm text-slate-500">Produtos</div><div class="text-xl font-bold">' + state.products.length + '</div></div>' +
      '<div class="p-4 bg-slate-50 rounded-lg"><div class="text-sm text-slate-500">Fornecedores</div><div class="text-xl font-bold">' + state.suppliers.length + '</div></div>' +
      '<div class="p-4 bg-slate-50 rounded-lg"><div class="text-sm text-slate-500">Itens</div><div class="text-xl font-bold">' + totalItems + '</div></div>' +
      '<div class="p-4 bg-slate-50 rounded-lg"><div class="text-sm text-slate-500">Investimento</div><div class="text-xl font-bold text-rose-600">' + formatCurrency(totalInvested) + '</div></div>' +
      '</div>', 'fa-file-contract');

    pageContent.innerHTML = html;

    drawReportCategoriesChart();
    drawReportStatusChart();
  }

  function drawReportCategoriesChart() {
    const categories = {};
    state.products.forEach((p) => {
      categories[p.category || 'Outros'] = (categories[p.category || 'Outros'] || 0) + (parseFloat(p.total_value) || 0);
    });
    const ctx = document.getElementById('chart-report-categories');
    if (!ctx) return;
    state.charts.reportCategories = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: Object.keys(categories),
        datasets: [{
          label: 'Investimento (R$)',
          data: Object.values(categories),
          backgroundColor: '#be123c',
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } },
      },
    });
  }

  function drawReportStatusChart() {
    const statuses = {};
    state.products.forEach((p) => {
      statuses[p.status || 'Disponível'] = (statuses[p.status || 'Disponível'] || 0) + 1;
    });
    const ctx = document.getElementById('chart-report-status');
    if (!ctx) return;
    state.charts.reportStatus = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: Object.keys(statuses),
        datasets: [{
          data: Object.values(statuses),
          backgroundColor: ['#16a34a', '#2563eb', '#d97706', '#dc2626'],
          borderWidth: 1,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
      },
    });
  }

  function renderUsers() {
    let html = pageHeader('Usuários', '<button class="btn btn-primary" onclick="appActions.openUserModal()"><i class="fas fa-plus"></i> Novo Usuário</button>');

    html += card('Gerenciamento de Usuários', usersTable(), 'fa-users-gear');
    pageContent.innerHTML = html;
  }

  function usersTable() {
    let items = [...state.users].sort((a, b) => a.name.localeCompare(b.name));
    if (!items.length) return '<p class="text-slate-500 text-center py-8">Nenhum usuário cadastrado.</p>';

    let rows = items.map((u) => '<tr>' +
      '<td class="font-medium">' + escapeHtml(u.name) + '</td>' +
      '<td>' + escapeHtml(u.email || '—') + '</td>' +
      '<td>' + escapeHtml(u.role || '—') + '</td>' +
      '<td><span class="status-badge ' + (u.active ? 'status-disponível' : 'status-indisponível') + '">' + (u.active ? 'Ativo' : 'Inativo') + '</span></td>' +
      '<td class="text-right">' +
      '<button class="btn btn-icon text-rose-600 hover:bg-rose-50" onclick="appActions.openUserModal(\'' + u.id + '\')" aria-label="Editar ' + escapeHtml(u.name) + '"><i class="fas fa-pen"></i></button>' +
      '<button class="btn btn-icon text-slate-500 hover:bg-slate-100" onclick="appActions.deleteUser(\'' + u.id + '\')" aria-label="Excluir ' + escapeHtml(u.name) + '"><i class="fas fa-trash"></i></button>' +
      '</td></tr>').join('');

    return '<div class="table-container"><table class="data-table"><thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Status</th><th class="text-right">Ações</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  function modalHtml(id, title, body) {
    return '<div id="' + id + '" class="fixed inset-0 z-50 hidden flex items-center justify-center modal-overlay" role="dialog" aria-modal="true" aria-labelledby="' + id + '-title">' +
      '<div class="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">' +
      '<div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">' +
      '<h3 id="' + id + '-title" class="text-lg font-semibold text-slate-900">' + escapeHtml(title) + '</h3>' +
      '<button onclick="appActions.closeModal(\'' + id + '\')" class="text-slate-400 hover:text-slate-600" aria-label="Fechar"><i class="fas fa-times"></i></button>' +
      '</div>' +
      '<div class="p-6">' + body + '</div>' +
      '<div class="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-xl">' +
      '<button type="button" onclick="appActions.closeModal(\'' + id + '\')" class="btn btn-secondary">Cancelar</button>' +
      '<button type="submit" form="' + id + '-form" class="btn btn-primary">Salvar</button>' +
      '</div></div></div>';
  }

  function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) {
      document.body.insertAdjacentHTML('beforeend', modalTemplates[id] || '');
      const created = document.getElementById(id);
      created.classList.remove('hidden');
      created.querySelector('input, select, textarea') && created.querySelector('input, select, textarea').focus();
      bindModalForms(id);
      return;
    }
    modal.classList.remove('hidden');
    modal.querySelector('input, select, textarea') && modal.querySelector('input, select, textarea').focus();
    bindModalForms(id);
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('hidden');
  }

  function removeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.remove();
  }

  const modalTemplates = {};

  function buildModalTemplates() {
    modalTemplates.productModal = modalHtml('productModal', 'Produto',
      '<form id="productModal-form" class="space-y-4">' +
      '<input type="hidden" id="product-id" />' +
      '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">' +
      '<div class="form-group"><label class="form-label" for="product-name">Nome *</label><input id="product-name" class="form-input" required maxlength="120" /></div>' +
      '<div class="form-group"><label class="form-label" for="product-category">Categoria</label><select id="product-category" class="form-select"><option value="">Selecione</option><option value="Decoração">Decoração</option><option value="Mesa">Mesa</option><option value="Cadeira">Cadeira</option><option value="Tenda">Tenda</option><option value="Iluminação">Iluminação</option><option value="Som">Som</option><option value="Outros">Outros</option></select></div>' +
      '</div>' +
      '<div class="form-group"><label class="form-label" for="product-description">Descrição</label><textarea id="product-description" class="form-textarea" maxlength="500"></textarea></div>' +
      '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">' +
      '<div class="form-group"><label class="form-label" for="product-supplier">Fornecedor</label><select id="product-supplier" class="form-select"><option value="">Selecione</option>' + state.suppliers.map((s) => '<option value="' + s.id + '">' + escapeHtml(s.name) + '</option>').join('') + '</select></div>' +
      '<div class="form-group"><label class="form-label" for="product-status">Status</label><select id="product-status" class="form-select"><option value="Disponível">Disponível</option><option value="Alugado">Alugado</option><option value="Em Manutenção">Em Manutenção</option><option value="Indisponível">Indisponível</option></select></div>' +
      '</div>' +
      '<div class="grid grid-cols-1 md:grid-cols-3 gap-4">' +
      '<div class="form-group"><label class="form-label" for="product-quantity">Quantidade *</label><input id="product-quantity" type="number" min="0" step="1" class="form-input" required /></div>' +
      '<div class="form-group"><label class="form-label" for="product-unit-value">Valor Unitário (R$) *</label><input id="product-unit-value" type="number" min="0" step="0.01" class="form-input" required /></div>' +
      '<div class="form-group"><label class="form-label" for="product-total-value">Valor Total (R$)</label><input id="product-total-value" type="number" min="0" step="0.01" class="form-input" readonly /></div>' +
      '</div>' +
      '</form>'
    );

    modalTemplates.supplierModal = modalHtml('supplierModal', 'Fornecedor',
      '<form id="supplierModal-form" class="space-y-4">' +
      '<input type="hidden" id="supplier-id" />' +
      '<div class="form-group"><label class="form-label" for="supplier-name">Nome / Razão Social *</label><input id="supplier-name" class="form-input" required maxlength="120" /></div>' +
      '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">' +
      '<div class="form-group"><label class="form-label" for="supplier-cnpj">CNPJ</label><input id="supplier-cnpj" class="form-input" maxlength="20" placeholder="00.000.000/0000-00" /></div>' +
      '<div class="form-group"><label class="form-label" for="supplier-phone">Telefone</label><input id="supplier-phone" type="tel" class="form-input" maxlength="20" /></div>' +
      '</div>' +
      '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">' +
      '<div class="form-group"><label class="form-label" for="supplier-email">E-mail</label><input id="supplier-email" type="email" class="form-input" maxlength="120" /></div>' +
      '<div class="form-group"><label class="form-label" for="supplier-category">Categoria de Fornecimento</label><input id="supplier-category" class="form-input" maxlength="60" /></div>' +
      '</div>' +
      '<div class="form-group"><label class="form-label" for="supplier-address">Endereço</label><textarea id="supplier-address" class="form-textarea" maxlength="500"></textarea></div>' +
      '</form>'
    );

    modalTemplates.financialModal = modalHtml('financialModal', 'Movimentação Financeira',
      '<form id="financialModal-form" class="space-y-4">' +
      '<input type="hidden" id="financial-id" />' +
      '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">' +
      '<div class="form-group"><label class="form-label" for="financial-type">Tipo *</label><select id="financial-type" class="form-select" required><option value="Entrada">Entrada</option><option value="Saída">Saída</option></select></div>' +
      '<div class="form-group"><label class="form-label" for="financial-category">Categoria *</label><select id="financial-category" class="form-select" required><option value="Venda">Venda</option><option value="Aluguel">Aluguel</option><option value="Compra">Compra</option><option value="Manutenção">Manutenção</option><option value="Outros">Outros</option></select></div>' +
      '</div>' +
      '<div class="form-group"><label class="form-label" for="financial-description">Descrição</label><textarea id="financial-description" class="form-textarea" maxlength="500"></textarea></div>' +
      '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">' +
      '<div class="form-group"><label class="form-label" for="financial-amount">Valor (R$) *</label><input id="financial-amount" type="number" min="0.01" step="0.01" class="form-input" required /></div>' +
      '<div class="form-group"><label class="form-label" for="financial-date">Data *</label><input id="financial-date" type="date" class="form-input" required /></div>' +
      '</div>' +
      '<div class="form-group"><label class="form-label" for="financial-product">Produto Relacionado</label><select id="financial-product" class="form-select"><option value="">Nenhum</option>' + state.products.map((p) => '<option value="' + p.id + '">' + escapeHtml(p.name) + '</option>').join('') + '</select></div>' +
      '</form>'
    );

    modalTemplates.userModal = modalHtml('userModal', 'Usuário',
      '<form id="userModal-form" class="space-y-4">' +
      '<input type="hidden" id="user-id" />' +
      '<div class="form-group"><label class="form-label" for="user-name">Nome Completo *</label><input id="user-name" class="form-input" required maxlength="120" /></div>' +
      '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">' +
      '<div class="form-group"><label class="form-label" for="user-email">E-mail *</label><input id="user-email" type="email" class="form-input" required maxlength="120" /></div>' +
      '<div class="form-group"><label class="form-label" for="user-role">Perfil *</label><select id="user-role" class="form-select" required><option value="">Selecione</option><option value="Administrador">Administrador</option><option value="Gerente">Gerente</option><option value="Operador">Operador</option><option value="Leitor">Leitor</option></select></div>' +
      '</div>' +
      '<div class="form-group flex items-center gap-2"><input id="user-active" type="checkbox" class="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500" checked /><label for="user-active" class="text-sm text-slate-700">Usuário ativo</label></div>' +
      '</form>'
    );
  }

  function bindModalForms(id) {
    const form = document.getElementById(id + '-form');
    if (!form || form.dataset.bound) return;
    form.dataset.bound = 'true';
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        if (id === 'productModal') await saveProduct();
        else if (id === 'supplierModal') await saveSupplier();
        else if (id === 'financialModal') await saveFinancial();
        else if (id === 'userModal') await saveUser();
        closeModal(id);
        await loadAll();
        render();
      } catch (err) {
        showToast('Erro ao salvar: ' + err.message, 'error');
      }
    });

    if (id === 'productModal') {
      const q = document.getElementById('product-quantity');
      const u = document.getElementById('product-unit-value');
      const t = document.getElementById('product-total-value');
      const calc = () => { t.value = ((Number(q.value) || 0) * (Number(u.value) || 0)).toFixed(2); };
      q && q.addEventListener('input', calc);
      u && u.addEventListener('input', calc);
    }
  }

  async function openProductModal(id) {
    buildModalTemplates();
    openModal('productModal');
    if (!id) {
      document.getElementById('product-id').value = '';
      document.getElementById('productModal-form').reset();
      document.getElementById('product-total-value').value = '0.00';
      return;
    }
    const p = state.products.find((x) => x.id === id);
    if (!p) return;
    document.getElementById('product-id').value = p.id;
    document.getElementById('product-name').value = p.name || '';
    document.getElementById('product-category').value = p.category || '';
    document.getElementById('product-description').value = p.description || '';
    document.getElementById('product-supplier').value = p.supplier_id || '';
    document.getElementById('product-status').value = p.status || 'Disponível';
    document.getElementById('product-quantity').value = p.quantity || 0;
    document.getElementById('product-unit-value').value = p.unit_value || 0;
    document.getElementById('product-total-value').value = p.total_value || 0;
  }

  async function saveProduct() {
    const id = document.getElementById('product-id').value;
    const data = {
      name: document.getElementById('product-name').value.trim(),
      category: document.getElementById('product-category').value,
      description: document.getElementById('product-description').value.trim(),
      supplier_id: document.getElementById('product-supplier').value,
      status: document.getElementById('product-status').value,
      quantity: Number(document.getElementById('product-quantity').value) || 0,
      unit_value: Number(document.getElementById('product-unit-value').value) || 0,
      total_value: Number(document.getElementById('product-total-value').value) || 0,
      created_at: Date.now(),
    };
    if (!data.name) throw new Error('Informe o nome do produto.');
    if (id) {
      await updateRecord(TABLES.products, id, data);
      showToast('Produto atualizado com sucesso.', 'success');
    } else {
      data.id = uuid();
      await createRecord(TABLES.products, data);
      showToast('Produto cadastrado com sucesso.', 'success');
    }
  }

  async function deleteProduct(id) {
    const p = state.products.find((x) => x.id === id);
    if (!p) return;
    const ok = await confirmAction('Excluir produto', 'Deseja excluir o produto "' + p.name + '"? Esta ação não pode ser desfeita.');
    if (!ok) return;
    await deleteRecord(TABLES.products, id);
    await loadAll();
    render();
    showToast('Produto excluído.', 'success');
  }

  async function openSupplierModal(id) {
    buildModalTemplates();
    openModal('supplierModal');
    if (!id) {
      document.getElementById('supplier-id').value = '';
      document.getElementById('supplierModal-form').reset();
      return;
    }
    const s = state.suppliers.find((x) => x.id === id);
    if (!s) return;
    document.getElementById('supplier-id').value = s.id;
    document.getElementById('supplier-name').value = s.name || '';
    document.getElementById('supplier-cnpj').value = s.cnpj || '';
    document.getElementById('supplier-phone').value = s.phone || '';
    document.getElementById('supplier-email').value = s.email || '';
    document.getElementById('supplier-category').value = s.category || '';
    document.getElementById('supplier-address').value = s.address || '';
  }

  async function saveSupplier() {
    const id = document.getElementById('supplier-id').value;
    const data = {
      name: document.getElementById('supplier-name').value.trim(),
      cnpj: document.getElementById('supplier-cnpj').value.trim(),
      phone: document.getElementById('supplier-phone').value.trim(),
      email: document.getElementById('supplier-email').value.trim(),
      category: document.getElementById('supplier-category').value.trim(),
      address: document.getElementById('supplier-address').value.trim(),
      created_at: Date.now(),
    };
    if (!data.name) throw new Error('Informe o nome do fornecedor.');
    if (id) {
      await updateRecord(TABLES.suppliers, id, data);
      showToast('Fornecedor atualizado com sucesso.', 'success');
    } else {
      data.id = uuid();
      await createRecord(TABLES.suppliers, data);
      showToast('Fornecedor cadastrado com sucesso.', 'success');
    }
  }

  async function deleteSupplier(id) {
    const s = state.suppliers.find((x) => x.id === id);
    if (!s) return;
    const productsLinked = state.products.some((p) => p.supplier_id === id);
    if (productsLinked) {
      showToast('Não é possível excluir fornecedor com produtos vinculados.', 'warning');
      return;
    }
    const ok = await confirmAction('Excluir fornecedor', 'Deseja excluir o fornecedor "' + s.name + '"?');
    if (!ok) return;
    await deleteRecord(TABLES.suppliers, id);
    await loadAll();
    render();
    showToast('Fornecedor excluído.', 'success');
  }

  async function openFinancialModal(id) {
    buildModalTemplates();
    openModal('financialModal');
    if (!id) {
      document.getElementById('financial-id').value = '';
      document.getElementById('financialModal-form').reset();
      document.getElementById('financial-date').value = new Date().toISOString().split('T')[0];
      return;
    }
    const f = state.financial.find((x) => x.id === id);
    if (!f) return;
    document.getElementById('financial-id').value = f.id;
    document.getElementById('financial-type').value = f.type || 'Entrada';
    document.getElementById('financial-category').value = f.category || 'Outros';
    document.getElementById('financial-description').value = f.description || '';
    document.getElementById('financial-amount').value = f.amount || 0;
    document.getElementById('financial-date').value = f.date ? f.date.substring(0, 10) : '';
    document.getElementById('financial-product').value = f.product_id || '';
  }

  async function saveFinancial() {
    const id = document.getElementById('financial-id').value;
    const data = {
      type: document.getElementById('financial-type').value,
      category: document.getElementById('financial-category').value,
      description: document.getElementById('financial-description').value.trim(),
      amount: Number(document.getElementById('financial-amount').value) || 0,
      date: document.getElementById('financial-date').value,
      product_id: document.getElementById('financial-product').value,
      created_at: Date.now(),
    };
    if (!data.amount || !data.date) throw new Error('Preencha valor e data.');
    if (id) {
      await updateRecord(TABLES.financial, id, data);
      showToast('Movimentação atualizada.', 'success');
    } else {
      data.id = uuid();
      await createRecord(TABLES.financial, data);
      showToast('Movimentação registrada.', 'success');
    }
  }

  async function deleteFinancial(id) {
    const f = state.financial.find((x) => x.id === id);
    if (!f) return;
    const ok = await confirmAction('Excluir movimentação', 'Deseja excluir a movimentação de ' + formatCurrency(f.amount) + '?');
    if (!ok) return;
    await deleteRecord(TABLES.financial, id);
    await loadAll();
    render();
    showToast('Movimentação excluída.', 'success');
  }

  async function openUserModal(id) {
    buildModalTemplates();
    openModal('userModal');
    if (!id) {
      document.getElementById('user-id').value = '';
      document.getElementById('userModal-form').reset();
      document.getElementById('user-active').checked = true;
      return;
    }
    const u = state.users.find((x) => x.id === id);
    if (!u) return;
    document.getElementById('user-id').value = u.id;
    document.getElementById('user-name').value = u.name || '';
    document.getElementById('user-email').value = u.email || '';
    document.getElementById('user-role').value = u.role || 'Operador';
    document.getElementById('user-active').checked = u.active !== false;
  }

  async function saveUser() {
    const id = document.getElementById('user-id').value;
    const data = {
      name: document.getElementById('user-name').value.trim(),
      email: document.getElementById('user-email').value.trim(),
      role: document.getElementById('user-role').value,
      active: document.getElementById('user-active').checked,
      created_at: Date.now(),
    };
    if (!data.name || !data.email || !data.role) throw new Error('Preencha todos os campos obrigatórios.');
    if (id) {
      await updateRecord(TABLES.users, id, data);
      showToast('Usuário atualizado.', 'success');
    } else {
      data.id = uuid();
      await createRecord(TABLES.users, data);
      showToast('Usuário cadastrado.', 'success');
    }
  }

  async function deleteUser(id) {
    const u = state.users.find((x) => x.id === id);
    if (!u) return;
    const ok = await confirmAction('Excluir usuário', 'Deseja excluir o usuário "' + u.name + '"?');
    if (!ok) return;
    await deleteRecord(TABLES.users, id);
    await loadAll();
    render();
    showToast('Usuário excluído.', 'success');
  }

  function exportReport() {
    const rows = [
      ['Relatório Glipearte - Estoque e Financeiro'],
      ['Gerado em', new Date().toLocaleString('pt-BR')],
      [],
      ['Produtos'],
      ['Nome', 'Categoria', 'Fornecedor', 'Quantidade', 'Valor Unitário', 'Valor Total', 'Status'],
      ...state.products.map((p) => [p.name, p.category, getSupplierName(p.supplier_id), p.quantity, p.unit_value, p.total_value, p.status]),
      [],
      ['Fornecedores'],
      ['Nome', 'CNPJ', 'Telefone', 'Email', 'Categoria'],
      ...state.suppliers.map((s) => [s.name, s.cnpj, s.phone, s.email, s.category]),
      [],
      ['Financeiro'],
      ['Tipo', 'Categoria', 'Descrição', 'Valor', 'Data', 'Produto'],
      ...state.financial.map((f) => [f.type, f.category, f.description, f.amount, f.date, getProductName(f.product_id)]),
    ];

    const csv = rows.map((r) => r.map((cell) => '"' + String(cell ?? '').replace(/"/g, '""') + '"').join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'relatorio_glipearte_' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast('Relatório exportado.', 'success');
  }

  function applySearchHighlight() {
    const term = state.search.toLowerCase();
    if (!term) return;
    const walker = document.createTreeWalker(pageContent, NodeFilter.SHOW_TEXT, null, false);
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) nodes.push(node);
    nodes.forEach((n) => {
      const text = n.textContent;
      const lower = text.toLowerCase();
      if (lower.includes(term)) {
        const span = document.createElement('span');
        let safe = escapeHtml(text);
        const regex = new RegExp('(' + escapeHtml(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
        span.innerHTML = safe.replace(regex, '<mark class="bg-yellow-200 rounded px-0.5">$1</mark>');
        n.parentNode.replaceChild(span, n);
      }
    });
  }

  function bindEvents() {
    document.querySelectorAll('.nav-item').forEach((el) => {
      el.addEventListener('click', () => setRoute(el.dataset.route));
    });
    menuToggle.addEventListener('click', toggleSidebar);
    menuClose.addEventListener('click', closeSidebar);
    overlay.addEventListener('click', closeSidebar);
    globalSearch.addEventListener('input', () => {
      state.search = globalSearch.value;
      if (state.route !== 'products' && state.route !== 'suppliers') setRoute('products');
      else render();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeSidebar();
        document.querySelectorAll('[id$="Modal"]').forEach((m) => m.classList.add('hidden'));
      }
    });
    document.getElementById('btn-help').addEventListener('click', () => {
      showToast('Use o menu lateral para navegar. Busca global encontra produtos e fornecedores. Atalho: Esc fecha modais.', 'info');
    });
  }

  window.appActions = {
    setRoute,
    openProductModal,
    deleteProduct,
    openSupplierModal,
    deleteSupplier,
    openFinancialModal,
    deleteFinancial,
    openUserModal,
    deleteUser,
    closeModal,
    exportReport,
  };

  async function init() {
    bindEvents();
    await loadAll();
    setRoute('dashboard');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
