(() => {
  const root = document.documentElement;
  const workspace = document.querySelector('.workspace');
  if (!workspace) return;

  const page = workspace.dataset.page;
  const isOwner = workspace.dataset.role === 'owner';
  const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';
  const errors = document.querySelector('[data-page-error]');
  const loading = document.querySelector('[data-page-loading]');
  const toastRegion = document.getElementById('toastRegion');
  const money = (value) => `₦${Number(value || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const dateTime = (value) => value ? new Date(value).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
  const dateOnly = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-NG', { dateStyle: 'medium' }) : '—';
  const escapeValue = (value) => String(value ?? '');
  const showError = (message) => {
    if (errors) {
      errors.textContent = message;
      errors.hidden = false;
    }
  };
  const clearError = () => {
    if (errors) {
      errors.textContent = '';
      errors.hidden = true;
    }
  };
  const notify = (message) => {
    if (!toastRegion) return;
    const toast = document.createElement('div');
    toast.className = 'app-toast';
    toast.setAttribute('role', 'status');
    toast.textContent = message;
    toastRegion.append(toast);
    window.setTimeout(() => toast.remove(), 3400);
  };
  const api = async (path, { method = 'GET', body, formData = false } = {}) => {
    const headers = { Accept: 'application/json' };
    if (method !== 'GET') {
      headers['X-CSRFToken'] = csrfToken;
      if (!formData) headers['Content-Type'] = 'application/json';
    }
    const response = await fetch(`/api/v1${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : formData ? body : JSON.stringify(body),
    });

    const text = response.status === 204 ? '' : await response.text();
    let payload = null;
    if (text) {
      try { payload = JSON.parse(text); } catch { payload = { detail: text }; }
    }
    if (!response.ok) {
      const detail = payload?.detail || payload?.error?.message || payload;
      const fields = payload?.error?.fields;
      if (fields && typeof fields === 'object') {
        const messages = Object.entries(fields).flatMap(([field, values]) => (
          Array.isArray(values) ? values.map((value) => `${field}: ${value}`) : [`${field}: ${values}`]
        ));
        if (messages.length) throw new Error(messages.join(' '));
      }
      throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
    }
    return payload;
  };
  const initCategoryForm = () => formSubmit('[data-category-form]', async (fields, form) => {
    const categoryId = fields.get('category_id');
    const category = await api(categoryId ? `/catalog/categories/${categoryId}/` : '/catalog/categories/', {
      method: categoryId ? 'PATCH' : 'POST',
      body: { name: fields.get('name').trim() },
    });
    form.closest('dialog').close();
    form.reset();
    form.elements.category_id.value = '';
    document.getElementById('category-dialog-title').textContent = 'Add category';
    const categorySelect = document.querySelector('[data-product-category]');
    if (categorySelect) categorySelect.dataset.pendingValue = category.id;
    notify('Category saved to the business catalog.');
    await loadProducts();
    if (categorySelect && [...categorySelect.options].some((option) => option.value === String(category.id))) {
      categorySelect.value = String(category.id);
      delete categorySelect.dataset.pendingValue;
    }
  });

  const initProductEditForm = () => formSubmit('[data-product-edit-form]', async (fields, form) => {
    await api(`/catalog/products/${fields.get('product_id')}/`, { method: 'PATCH', body: {
      name: fields.get('name').trim(),
      description: fields.get('description').trim(),
    } });
    form.closest('dialog').close();
    notify('Product details updated.');
    await loadProducts();
  });

  const setBusy = (button, busy, label) => {
    if (!button) return;
    if (busy) {
      button.dataset.originalLabel = button.textContent;
      button.textContent = label;
      button.disabled = true;
    } else {
      button.textContent = button.dataset.originalLabel || button.textContent;
      button.disabled = false;
    }
  };
  const element = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = escapeValue(text);
    if (className) node.className = className;
    return node;
  };
  const tableBody = document.querySelector('[data-table-body]');
  const setTableMessage = (message, colspan = 6) => {
    if (!tableBody) return;
    tableBody.replaceChildren();
    const row = document.createElement('tr');
    row.className = 'empty-table-row';
    const cell = document.createElement('td');
    cell.colSpan = colspan;
    const empty = element('div', undefined, 'empty-state');
    empty.append(element('strong', message));
    cell.append(empty);
    row.append(cell);
    tableBody.append(row);
  };
  const appendRow = (values, { statusIndex = -1, action } = {}) => {
    const row = document.createElement('tr');
    values.forEach((value, index) => {
      const cell = document.createElement('td');
      if (index === 0) cell.append(element('strong', value));
      else if (index === statusIndex) {
        const status = element('span', value, 'status-pill status-neutral');
        if (['Paid', 'Healthy', 'Active', 'Received'].includes(value)) status.classList.add('status-paid');
        if (['Partial', 'Awaiting', 'Ordered', 'Draft', 'Reorder', 'In transit'].includes(value)) status.classList.add('status-pending');
        cell.append(status);
        if (statusFilter && value && ![...statusFilter.options].some((option) => option.value === value)) {
          statusFilter.add(new Option(value, value));
        }
      } else cell.textContent = escapeValue(value);
      row.append(cell);
    });
    if (action) {
      const cell = document.createElement('td');
      cell.append(action);
      row.append(cell);
    }
    tableBody.append(row);
  };
  const statusFilter = document.querySelector('[data-status-filter]');
  const updateCount = (count) => {
    const target = document.querySelector('[data-table-count]');
    if (target) target.textContent = `${count} ${count === 1 ? 'record' : 'records'}`;
  };
  const applyTableSearch = () => {
    const query = document.querySelector('[data-table-search]')?.value.trim().toLowerCase() || '';
    const selectedStatus = statusFilter?.value || '';
    tableBody?.querySelectorAll('tr:not(.empty-table-row)').forEach((row) => {
      row.hidden = !row.textContent.toLowerCase().includes(query)
        || Boolean(selectedStatus && !row.textContent.toLowerCase().includes(selectedStatus.toLowerCase()));
    });
  };

  const setTheme = (theme) => {
    root.setAttribute('data-bs-theme', theme);
    const button = document.getElementById('themeToggle');
    if (button) {
      const dark = theme === 'dark';
      button.setAttribute('aria-pressed', String(dark));
      button.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    }
  };
  setTheme(localStorage.getItem('norris-theme') === 'dark' ? 'dark' : 'light');
  document.getElementById('themeToggle')?.addEventListener('click', () => {
    const theme = root.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
    localStorage.setItem('norris-theme', theme);
    setTheme(theme);
  });

  const sidebar = document.getElementById('sidebar');
  const menuToggle = document.getElementById('menuToggle');
  const closeNavigation = () => {
    sidebar?.classList.remove('open');
    workspace.classList.remove('nav-open');
    menuToggle?.setAttribute('aria-expanded', 'false');
    menuToggle?.setAttribute('aria-label', 'Open navigation');
  };
  menuToggle?.addEventListener('click', () => {
    const open = !sidebar?.classList.contains('open');
    sidebar?.classList.toggle('open', open);
    workspace.classList.toggle('nav-open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  });
  document.querySelector('[data-close-navigation]')?.addEventListener('click', closeNavigation);
  sidebar?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeNavigation));

  document.addEventListener('click', (event) => {
    const close = event.target.closest('[data-close-dialog]');
    if (close) close.closest('dialog')?.close();
    const open = event.target.closest('[data-open-dialog]');
    if (open) document.querySelector(`[data-dialog="${open.dataset.openDialog}"]`)?.showModal();
  });

  const search = document.getElementById('workspaceSearch');
  search?.addEventListener('input', () => {
    const localSearch = document.querySelector('[data-table-search]');
    if (localSearch) {
      localSearch.value = search.value;
      applyTableSearch();
      return;
    }
    document.querySelectorAll('.pos-product').forEach((row) => {
      row.hidden = !row.textContent.toLowerCase().includes(search.value.toLowerCase());
    });
  });
  document.querySelector('[data-table-search]')?.addEventListener('input', applyTableSearch);
  statusFilter?.addEventListener('change', applyTableSearch);
  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      search?.focus();
    }
  });

  const initNotifications = async () => {
    const toggle = document.getElementById('notificationsToggle');
    const panel = document.querySelector('[data-notifications-panel]');
    const list = document.querySelector('[data-notifications-list]');
    const indicator = document.querySelector('[data-unread-indicator]');
    if (!toggle || !panel || !list) return;
    const refresh = async () => {
      const data = await api('/notifications/');
      list.replaceChildren();
      const unread = data.results.filter((item) => !item.is_read).length;
      indicator.hidden = unread === 0;
      if (!data.results.length) {
        list.append(element('p', 'No notifications.', 'muted'));
      } else {
        data.results.forEach((item) => {
          const row = element(item.link ? 'a' : 'div', undefined, 'notification-row');
          if (item.link) row.href = item.link;
          row.append(element('strong', item.title), element('span', item.message), element('small', dateTime(item.created_at)));
          if (!item.is_read) row.classList.add('unread');
          list.append(row);
        });
      }
      return data;
    };
    try { await refresh(); } catch (error) { notify(error.message); }
    toggle.addEventListener('click', async () => {
      const open = panel.hidden;
      panel.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      if (open) {
        try { await refresh(); } catch (error) { showError(error.message); }
      }
    });
    document.querySelector('[data-mark-notifications-read]')?.addEventListener('click', async () => {
      try {
        await api('/notifications/', { method: 'PATCH', body: {} });
        await refresh();
        notify('Notifications marked as read.');
      } catch (error) { showError(error.message); }
    });
  };

  const selectOptions = (select, items, label, value = (item) => item.id) => {
    select.replaceChildren(new Option(label, ''));
    items.forEach((item) => select.add(new Option(item.name, value(item))));
  };
  const activeItems = (items) => items.filter((item) => item.is_active);
  const openDialog = (name) => document.querySelector(`[data-dialog="${name}"]`)?.showModal();
  const formSubmit = (selector, handler) => {
    document.querySelector(selector)?.addEventListener('submit', async (event) => {
      event.preventDefault();
      clearError();
      const form = event.currentTarget;
      const button = form.querySelector('[type=submit]');
      const error = form.querySelector('[data-form-error]');
      if (error) error.hidden = true;
      setBusy(button, true, 'Saving…');
      try {
        await handler(new FormData(form), form);
      } catch (requestError) {
        if (error) {
          error.textContent = requestError.message;
          error.hidden = false;
        } else showError(requestError.message);
      } finally { setBusy(button, false); }
    });
  };
  const refreshPage = () => window.location.reload();

  const loadProducts = async () => {
    const query = document.querySelector('[data-table-search]')?.value.trim() || '';
    const [data, categoryData] = await Promise.all([
      api(`/catalog/products/?limit=100${query ? `&search=${encodeURIComponent(query)}` : ''}`),
      api('/catalog/categories/'),
    ]);
    const metrics = document.querySelector('[data-page-metrics]');
    if (metrics) {
      const variants = data.results.reduce((count, item) => count + item.variants.length, 0);
      renderMetrics(metrics, [['Active products', data.count, 'Live catalog'], ['Categories', categoryData.results.filter((item) => item.is_active).length, 'Business catalog'], ['Variants', variants, 'Active product variants']]);
    }
    const categoryList = document.querySelector('[data-category-list]');
    const categorySelect = document.querySelector('[data-product-category]');
    if (categorySelect) {
      const selectedCategory = categorySelect.dataset.pendingValue || categorySelect.value;
      selectOptions(categorySelect, activeItems(categoryData.results), 'Choose a category');
      if (selectedCategory && [...categorySelect.options].some((option) => option.value === selectedCategory)) {
        categorySelect.value = selectedCategory;
      }
    }
    if (categoryList) {
      categoryList.replaceChildren();
      categoryData.results.forEach((category) => {
        const row = element('div', undefined, 'category-row');
        row.append(element('strong', category.name), element('span', category.is_active ? 'Active' : 'Inactive', 'status-pill'));
        if (isOwner) {
          const actions = document.createElement('div');
          actions.className = 'heading-actions';
          const edit = makeAction('Edit', () => {
            const form = document.querySelector('[data-category-form]');
            form.elements.category_id.value = category.id;
            form.elements.name.value = category.name;
            document.getElementById('category-dialog-title').textContent = 'Edit category';
            openDialog('category');
          });
          const deactivate = makeAction(category.is_active ? 'Deactivate' : 'Activate', async () => {
            await api(`/catalog/categories/${category.id}/`, { method: category.is_active ? 'DELETE' : 'PATCH', ...(category.is_active ? {} : { body: { is_active: true } }) });
            await loadProducts();
          });
          actions.append(edit, deactivate);
          row.append(actions);
        }
        categoryList.append(row);
      });
      if (!categoryData.results.length) setInlineEmpty(categoryList, 'No categories have been created.');
    }
    if (!tableBody) return;
    tableBody.replaceChildren();
    data.results.forEach((product) => {
      const variantText = product.variants.map((variant) => variant.sku).join(', ') || 'No variants';
      const priceText = product.variants.map((variant) => money(variant.price)).join(', ') || '—';
      let action;
      if (isOwner) {
        const edit = makeAction('Edit', () => {
          const form = document.querySelector('[data-product-edit-form]');
          form.elements.product_id.value = product.id;
          form.elements.name.value = product.name;
          form.elements.description.value = product.description || '';
          openDialog('product-edit');
        });
        const deactivate = makeAction('Deactivate', async () => {
          if (!window.confirm(`Deactivate ${product.name}?`)) return;
          await api(`/catalog/products/${product.id}/`, { method: 'DELETE' });
          await loadProducts();
        });
        action = document.createElement('div');
        action.className = 'heading-actions';
        action.append(edit, deactivate);
      }
      appendRow([product.name, product.category_name || 'Uncategorized', variantText, priceText, product.is_active ? 'Active' : 'Inactive'], { statusIndex: 4, action });
    });
    if (!data.results.length) setTableMessage('No products match this search.', 6);
    updateCount(data.count);
    applyTableSearch();
  };

  function renderMetrics(container, items) {
    container.replaceChildren();
    items.forEach(([label, value, note]) => {
      const card = element('article', undefined, 'metric-card');
      card.append(element('div', label, 'metric-top'));
      card.append(element('strong', value, 'metric-card-value'));
      card.append(element('div', note, 'metric-foot'));
      container.append(card);
    });
  }

  const loadInventory = async () => {
    const query = document.querySelector('[data-table-search]')?.value.trim() || '';
    const data = await api(`/inventory/stock/?limit=100${query ? `&search=${encodeURIComponent(query)}` : ''}`);
    const total = data.results.reduce((sum, item) => sum + item.quantity, 0);
    const low = data.results.filter((item) => item.reorder_point > 0 && item.quantity <= item.reorder_point).length;
    const valuation = data.results.reduce((sum, item) => sum + Number(item.valuation), 0);
    renderMetrics(document.querySelector('[data-page-metrics]'), [['Units on hand', total, 'Live batch balances'], ['Low stock', low, 'At or below reorder point'], ['Stock value', money(valuation), 'Weighted-average valuation']]);
    tableBody?.replaceChildren();
    data.results.forEach((item) => appendRow([
      `${item.product_name} · ${item.sku}`,
      item.location_name,
      `${item.quantity} units`,
      `${item.reorder_point} units`,
      item.quantity <= item.reorder_point && item.reorder_point ? 'Reorder' : item.quantity ? 'Healthy' : 'Out of stock',
    ], { statusIndex: 4 }));
    if (tableBody && !data.results.length) setTableMessage('No stock has been recorded yet.');
    updateCount(data.results.length);
    await loadInventoryLedger();
  };

  const loadInventoryLedger = async () => {
    const body = document.querySelector('[data-inventory-ledger]');
    if (!body) return;
    const data = await api('/inventory/movements/');
    body.replaceChildren();
    data.results.forEach((movement) => {
      const row = document.createElement('tr');
      [
        `${movement.product_name} · ${movement.sku}`,
        movement.location,
        movement.batch_number,
        `${movement.quantity_delta > 0 ? '+' : ''}${movement.quantity_delta}`,
        movement.reason,
        dateTime(movement.created_at),
      ].forEach((value) => row.append(element('td', value)));
      body.append(row);
    });
    if (!data.results.length) {
      const row = document.createElement('tr');
      const cell = element('td', 'No stock movements have been recorded.');
      cell.colSpan = 6;
      row.append(cell);
      body.append(row);
    }
  };

  const loadSales = async () => {
    const data = await api('/sales/');
    renderMetrics(document.querySelector('[data-page-metrics]'), [
      ['Transactions', data.results.length, 'Business sales'],
      ['Sales total', money(data.results.reduce((sum, item) => sum + Number(item.total), 0)), 'Recorded invoices'],
      ['Awaiting payment', data.results.filter((item) => ['pending', 'partial'].includes(item.status)).length, 'Pending or partially paid'],
    ]);
    tableBody?.replaceChildren();
    data.results.forEach((sale) => {
      const status = sale.status[0].toUpperCase() + sale.status.slice(1);
      const action = document.createElement('button');
      action.type = 'button';
      action.className = 'button-secondary';
      action.textContent = 'Refund';
      action.disabled = sale.status === 'refunded' || sale.paid_amount === '0.00';
      action.addEventListener('click', () => {
        const form = document.querySelector('[data-refund-form]');
        form.elements.sale_id.value = sale.id;
        form.elements.amount.max = sale.paid_amount;
        form.elements.amount.value = sale.paid_amount;
        openDialog('refund');
      });
      appendRow([sale.invoice_number, sale.customer_name || 'Walk-in', dateTime(sale.created_at), money(sale.total), money(sale.paid_amount), status], { statusIndex: 5, action });
    });
    if (tableBody && !data.results.length) setTableMessage('No sales have been recorded yet.', 7);
    updateCount(data.results.length);
  };

  const loadCustomers = async () => {
    const query = document.querySelector('[data-table-search]')?.value.trim() || '';
    const data = await api(`/customers/?limit=100${query ? `&search=${encodeURIComponent(query)}` : ''}`);
    renderMetrics(document.querySelector('[data-page-metrics]'), [['Customer records', data.count, 'Active business contacts'], ['Search results', data.results.length, 'Current page'], ['Contact details', 'Protected', 'Business-scoped access']]);
    tableBody?.replaceChildren();
    data.results.forEach((customer) => appendRow([customer.name, customer.email || '—', customer.phone || '—', dateTime(customer.created_at)]));
    if (tableBody && !data.results.length) setTableMessage('No customers match this search.', 5);
    updateCount(data.count);
    applyTableSearch();
  };

  const loadPurchases = async () => {
    const [orderData, supplierData] = await Promise.all([api('/purchasing/orders/'), api('/purchasing/suppliers/')]);
    const open = orderData.results.filter((order) => !['received', 'cancelled'].includes(order.status)).length;
    renderMetrics(document.querySelector('[data-page-metrics]'), [['Open orders', open, 'Draft, ordered, or partial'], ['Suppliers', supplierData.results.length, 'Active suppliers'], ['Received orders', orderData.results.filter((order) => order.status === 'received').length, 'Completed orders']]);
    tableBody?.replaceChildren();
    orderData.results.forEach((order) => {
      const actions = document.createElement('div');
      actions.className = 'heading-actions';
      if (order.status === 'draft') {
        actions.append(makeAction('Place order', async () => { await api(`/purchasing/orders/${order.id}/place/`, { method: 'POST', body: {} }); await loadPurchases(); }));
      }
      if (['ordered', 'partially_received'].includes(order.status)) {
        actions.append(makeAction('Receive', () => {
          const form = document.querySelector('[data-purchase-receive-form]');
          form.elements.order_id.value = order.id;
          const line = order.lines.find((item) => item.quantity_received < item.quantity_ordered);
          if (!line) return notify('No outstanding order line is available to receive.');
          form.elements.line_id.value = line.id;
          form.elements.quantity.max = line.quantity_ordered - line.quantity_received;
          form.elements.quantity.value = line.quantity_ordered - line.quantity_received;
          openDialog('purchase-receive');
        }));
        actions.append(makeAction('Cancel', () => {
          document.querySelector('[data-purchase-cancel-form]').elements.order_id.value = order.id;
          openDialog('purchase-cancel');
        }));
      }
      const status = order.status.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
      appendRow([order.order_number, order.supplier_name, dateOnly(order.expected_date), String(order.lines.length), status], { statusIndex: 4, action: actions });
    });
    if (tableBody && !orderData.results.length) setTableMessage('No purchase orders have been created yet.', 6);
    updateCount(orderData.results.length);
  };

  const makeAction = (label, handler) => {
    const button = element('button', label, 'button-secondary');
    button.type = 'button';
    button.addEventListener('click', async () => {
      clearError();
      button.disabled = true;
      try { await handler(); } catch (error) { showError(error.message); } finally { button.disabled = false; }
    });
    return button;
  };

  const loadReports = async (period = 'month') => {
    const [summary, expenseData] = await Promise.all([
      api(`/reports/summary/?period=${period}`),
      api('/expenses/'),
    ]);
    renderMetrics(document.querySelector('[data-page-metrics]'), [
      ['Sales total', money(summary.sales_total), 'Recorded sales less refunds'],
      ['Orders', summary.order_count, 'Recorded sales'],
      ['Average order', money(summary.average_order), 'Period average'],
      ['Units sold', summary.units_sold, 'Recorded sale lines'],
      ['Purchase total', money(summary.purchase_total), 'Received inventory'],
      ['Expenses', money(summary.expense_total), 'Dated expenses'],
      ['Net', money(summary.net), 'Sales less purchases and expenses'],
      ['Low-stock lines', summary.low_stock, 'Current inventory'],
    ]);
    document.querySelector('[data-report-sales-total]').textContent = money(summary.sales_total);
    document.querySelector('[data-report-dates]').textContent = `${dateOnly(summary.start_date)} – ${dateOnly(summary.end_date)}`;
    drawChart(document.querySelector('[data-report-chart]'), summary.chart);
    tableBody?.replaceChildren();
    expenseData.results.forEach((expense) => appendRow([dateOnly(expense.expense_date), expense.title, expense.category || '—', expense.vendor || '—', money(expense.amount)]));
    if (tableBody && !expenseData.results.length) setTableMessage('No expenses have been recorded.', 5);
    updateCount(expenseData.count);
  };

  const drawChart = (chart, data) => {
    if (!chart) return;
    chart.replaceChildren();
    const columnCount = Math.max(data.labels.length, 1);
    chart.style.setProperty('--chart-columns', columnCount);
    chart.dataset.chartDensity = columnCount > 14 ? 'dense' : columnCount > 7 ? 'compact' : 'regular';
    const values = data.values.map(Number);
    const max = Math.max(...values, 0);
    data.labels.forEach((label, index) => {
      const column = element('div', undefined, 'chart-column');
      const amount = values[index] || 0;
      column.append(element('span', money(amount), 'chart-value'));
      const bar = element('div', undefined, `chart-bar${amount && amount === max ? ' bar-highlight' : ''}`);
      bar.style.setProperty('--bar-height', `${max ? Math.max(3, amount / max * 100) : 0}%`);
      column.append(bar, element('span', label, 'chart-label'));
      chart.append(column);
    });
  };

  const loadStaff = async () => {
    const data = await api('/staff/members/');
    renderMetrics(document.querySelector('[data-page-metrics]'), [['Team members', data.count, 'Active business memberships'], ['Owners', data.results.filter((item) => item.role === 'owner').length, 'Business owners'], ['Staff', data.results.filter((item) => item.role === 'staff').length, 'Operational members']]);
    tableBody?.replaceChildren();
    data.results.forEach((member) => appendRow([member.display_name, member.username, member.role[0].toUpperCase() + member.role.slice(1)]));
    if (tableBody && !data.results.length) setTableMessage('No members are linked to this business yet.', 4);
    updateCount(data.count);
  };

  const loadSettings = async () => {
    const profile = await api('/business/profile/');
    document.querySelector('[data-settings-form]').elements.name.value = profile.name;
    document.querySelector('.workspace-switcher strong').textContent = profile.name;
  };

  const initProductForm = () => formSubmit('[data-product-form]', async (fields, form) => {
    const product = await api('/catalog/products/', { method: 'POST', body: {
      name: fields.get('name').trim(),
      description: fields.get('description').trim(),
      category: Number(fields.get('category')),
      variants: [{
        name: fields.get('variant_name').trim() || 'Standard',
        sku: fields.get('sku').trim(),
        barcode: fields.get('barcode').trim(),
        price: fields.get('price'),
        unit_cost: fields.get('unit_cost') || null,
        reorder_point: Number(fields.get('reorder_point')),
      }],
    } });
    const imageFile = fields.get('image_file');
    if (imageFile instanceof File && imageFile.size) {
      const upload = new FormData();
      upload.append('image', imageFile);
      upload.append('alt_text', fields.get('alt_text').trim() || fields.get('name').trim());
      upload.append('is_primary', 'true');
      try {
        await api(`/catalog/products/${product.id}/images/`, { method: 'POST', body: upload, formData: true });
      } catch (error) {
        try { await api(`/catalog/products/${product.id}/`, { method: 'DELETE' }); }
        catch (rollbackError) { throw new Error(`${error.message} Product cleanup failed: ${rollbackError.message}`); }
        throw error;
      }
    }
    form.closest('dialog').close();
    notify('Product saved to the business catalog.');
    await loadProducts();
  });

  const initLocationForm = () => {
    const dialog = document.querySelector('[data-dialog="locations"]');
    const form = document.querySelector('[data-location-form]');
    const list = document.querySelector('[data-location-list]');
    if (!dialog || !form || !list) return;
    const renderLocations = (locations) => {
      list.replaceChildren();
      locations.forEach((location) => {
        const row = element('div', undefined, 'category-row');
        row.append(element('strong', location.name), element('span', location.is_active ? 'Active' : 'Inactive', 'status-pill'));
        const actions = document.createElement('div');
        actions.className = 'heading-actions';
        const edit = makeAction('Edit', () => {
          form.elements.location_id.value = location.id;
          form.elements.name.value = location.name;
          document.getElementById('locations-dialog-title').textContent = 'Edit location';
          form.elements.name.focus();
        });
        const toggle = makeAction(location.is_active ? 'Deactivate' : 'Activate', async () => {
          try {
            await api(`/inventory/locations/${location.id}/`, {
              method: location.is_active ? 'DELETE' : 'PATCH',
              ...(location.is_active ? {} : { body: { is_active: true } }),
            });
            notify(`Location ${location.is_active ? 'deactivated' : 'activated'}.`);
            await loadLocations();
          } catch (error) { showError(error.message); }
        });
        actions.append(edit, toggle);
        row.append(actions);
        list.append(row);
      });
      if (!locations.length) setInlineEmpty(list, 'No stock locations have been created.');
    };
    const loadLocations = async () => {
      const data = await api('/inventory/locations/');
      renderLocations(data.results);
      const stockSelect = document.querySelector('[data-stock-locations]');
      if (stockSelect) selectOptions(stockSelect, activeItems(data.results), 'Choose a location');
    };
    document.querySelector('[data-open-dialog="locations"]')?.addEventListener('click', () => {
      void loadLocations().catch((error) => showError(error.message));
    });
    formSubmit('[data-location-form]', async (fields, locationForm) => {
      const locationId = fields.get('location_id');
      await api(locationId ? `/inventory/locations/${locationId}/` : '/inventory/locations/', {
        method: locationId ? 'PATCH' : 'POST',
        body: { name: fields.get('name').trim() },
      });
      notify(locationId ? 'Stock location updated.' : 'Stock location created.');
      locationForm.reset();
      locationForm.elements.location_id.value = '';
      document.getElementById('locations-dialog-title').textContent = 'Manage locations';
      await loadLocations();
    });
  };

  const initStockForm = () => {
    document.querySelector('[data-open-dialog="stock"]')?.addEventListener('click', async () => {
      try {
        const [catalog, locations] = await Promise.all([api('/catalog/products/?limit=100'), api('/inventory/locations/')]);
        const variants = catalog.results.flatMap((product) => product.variants.map((variant) => ({ id: variant.id, name: `${product.name} · ${variant.sku}` })));
        selectOptions(document.querySelector('[data-stock-variants]'), variants, 'Choose a variant');
        selectOptions(document.querySelector('[data-stock-locations]'), activeItems(locations.results), 'Choose a location');
      } catch (error) { showError(error.message); }
    });
    formSubmit('[data-stock-form]', async (fields, form) => {
      let locationId = fields.get('location_id');
      const locationName = fields.get('location_name').trim();
      if (locationName) locationId = (await api('/inventory/locations/', { method: 'POST', body: { name: locationName } })).id;
      if (!locationId) throw new Error('Choose or create a stock location.');
      const payload = {
        kind: fields.get('kind'),
        variant_id: Number(fields.get('variant_id')),
        location_id: Number(locationId),
        batch_number: fields.get('batch_number').trim(),
        quantity_delta: Number(fields.get('quantity_delta')),
        reason: fields.get('reason').trim(),
        idempotency_key: crypto.randomUUID(),
      };
      if (payload.kind === 'receipt') {
        if (fields.get('expiry_date')) payload.expiry_date = fields.get('expiry_date');
        if (fields.get('unit_cost')) payload.unit_cost = fields.get('unit_cost');
      }
      await api('/inventory/movements/', { method: 'POST', body: payload });
      form.closest('dialog').close();
      notify('Inventory movement recorded.');
      await loadInventory();
    });
  };

  const initPos = async () => {
    const [catalog, locations, stockResponse] = await Promise.all([api('/catalog/products/?limit=100'), api('/inventory/locations/'), api('/inventory/stock/')]);
    const stock = stockResponse.results;
    const locationSelect = document.querySelector('[data-pos-location]');
    selectOptions(locationSelect, activeItems(locations.results), 'Choose location');
    const productHost = document.querySelector('[data-pos-products]');
    const cartHost = document.querySelector('[data-cart-items]');
    const count = document.querySelector('[data-cart-count]');
    const totalNode = document.querySelector('[data-cart-total]');
    const checkout = document.querySelector('[data-checkout]');
    const searchBox = document.querySelector('[data-pos-search]');
    const cart = new Map();
    let checkoutKey = crypto.randomUUID();
    const variants = catalog.results.flatMap((product) => product.variants.filter((variant) => variant.is_active).map((variant) => ({
      ...variant,
      product,
    })));
    const available = (variant) => stock.find((line) => line.variant_id === variant.id && line.location_id === Number(locationSelect.value))?.quantity || 0;
    const updateCart = () => {
      cartHost.replaceChildren();
      let itemCount = 0;
      let amount = 0;
      cart.forEach((quantity, id) => {
        const variant = variants.find((item) => item.id === id);
        if (!variant) return;
        itemCount += quantity;
        amount += Number(variant.price) * quantity;
        const line = element('div', undefined, 'cart-line');
        line.append(element('strong', `${variant.product.name} · ${variant.sku} × ${quantity}`), element('span', money(Number(variant.price) * quantity)));
        const remove = makeAction('−', () => {
          if (quantity <= 1) cart.delete(id); else cart.set(id, quantity - 1);
          checkoutKey = crypto.randomUUID();
          updateCart();
          renderProducts();
        });
        line.append(remove);
        cartHost.append(line);
      });
      if (!itemCount) {
        const empty = element('div', undefined, 'empty-state');
        empty.append(element('strong', 'Your basket is empty'), element('small', 'Add an in-stock product to begin.'));
        cartHost.append(empty);
      }
      count.textContent = itemCount;
      totalNode.textContent = money(amount);
      checkout.disabled = !itemCount || !locationSelect.value;
      checkoutKey = checkoutKey || crypto.randomUUID();
    };
    const renderProducts = () => {
      productHost.replaceChildren();
      const query = searchBox.value.trim().toLowerCase();
      const visible = variants.filter((variant) => `${variant.product.name} ${variant.sku} ${variant.barcode}`.toLowerCase().includes(query));
      visible.forEach((variant) => {
        const row = element('div', undefined, 'pos-product');
        const title = element('span', undefined);
        title.append(element('strong', variant.product.name), element('small', `${variant.sku} · ${available(variant)} available`));
        row.append(title, element('b', money(variant.price)));
        const add = makeAction('Add', () => {
          if ((cart.get(variant.id) || 0) >= available(variant)) return;
          cart.set(variant.id, (cart.get(variant.id) || 0) + 1);
          checkoutKey = crypto.randomUUID();
          updateCart();
          renderProducts();
        });
        add.disabled = !locationSelect.value || available(variant) <= (cart.get(variant.id) || 0);
        row.append(add);
        productHost.append(row);
      });
      if (!visible.length) setInlineEmpty(productHost, variants.length ? 'No matching products.' : 'No products are available in this business.');
    };
    searchBox.addEventListener('input', renderProducts);
    locationSelect.addEventListener('change', () => { updateCart(); renderProducts(); });
    checkout.addEventListener('click', async () => {
      const lines = [...cart].map(([id, quantity]) => {
        const variant = variants.find((item) => item.id === id);
        return { variant_id: id, quantity, unit_price: variant.price };
      });
      if (!lines.length) return;
      const total = lines.reduce((sum, line) => sum + Number(line.unit_price) * line.quantity, 0);
      const paid = document.querySelector('[data-amount-paid]').value;
      const button = checkout;
      setBusy(button, true, 'Recording sale…');
      try {
        const sale = await api('/pos/checkout/', { method: 'POST', body: {
          location_id: Number(locationSelect.value),
          items: lines,
          payment_method: document.querySelector('[data-payment-method]').value,
          amount_paid: paid ? Number(paid).toFixed(2) : total.toFixed(2),
          idempotency_key: checkoutKey,
        } });
        cart.clear();
        document.querySelector('[data-amount-paid]').value = '';
        checkoutKey = crypto.randomUUID();
        notify(`Sale ${sale.invoice_number} recorded for ${money(sale.total)}.`);
        updateCart();
        try {
          const nextStock = await api('/inventory/stock/');
          stock.splice(0, stock.length, ...nextStock.results);
          renderProducts();
        } catch (refreshError) {
          showError(`Sale recorded, but current stock could not be refreshed: ${refreshError.message}`);
        }
      } catch (error) { showError(error.message); }
      finally { setBusy(button, false); updateCart(); }
    });
    updateCart();
    renderProducts();
  };

  const setInlineEmpty = (host, text) => {
    const empty = element('div', undefined, 'empty-state');
    empty.append(element('strong', text));
    host.append(empty);
  };

  const initPurchases = async () => {
    const [suppliers, locations, catalog] = await Promise.all([api('/purchasing/suppliers/'), api('/inventory/locations/'), api('/catalog/products/?limit=100')]);
    selectOptions(document.querySelector('[data-purchase-suppliers]'), suppliers.results, 'Choose supplier', (item) => item.id);
    selectOptions(document.querySelector('[data-purchase-locations]'), locations.results, 'Choose stock location');
    const variants = catalog.results.flatMap((product) => product.variants.map((variant) => ({ id: variant.id, name: `${product.name} · ${variant.sku}` })));
    selectOptions(document.querySelector('[data-purchase-variants]'), variants, 'Choose a variant');
    formSubmit('[data-supplier-form]', async (fields, form) => {
      await api('/purchasing/suppliers/', { method: 'POST', body: {
        name: fields.get('name').trim(),
        contact_name: fields.get('contact_name').trim(),
        email: fields.get('email').trim(),
        phone: fields.get('phone').trim(),
        address: fields.get('address').trim(),
      } });
      form.closest('dialog').close();
      notify('Supplier saved.');
      refreshPage();
    });
    formSubmit('[data-purchase-form]', async (fields, form) => {
      const expectedDate = fields.get('expected_date');
      await api('/purchasing/orders/', { method: 'POST', body: {
        supplier_id: Number(fields.get('supplier_id')),
        location_id: Number(fields.get('location_id')),
        expected_date: expectedDate || null,
        idempotency_key: crypto.randomUUID(),
        lines: [{
          variant_id: Number(fields.get('variant_id')),
          quantity_ordered: Number(fields.get('quantity_ordered')),
          unit_cost: Number(fields.get('unit_cost')).toFixed(2),
        }],
      } });
      form.closest('dialog').close();
      notify('Draft purchase order created.');
      refreshPage();
    });
    formSubmit('[data-purchase-receive-form]', async (fields, form) => {
      await api(`/purchasing/orders/${fields.get('order_id')}/receive/`, { method: 'POST', body: {
        line_id: Number(fields.get('line_id')),
        quantity: Number(fields.get('quantity')),
        batch_number: fields.get('batch_number').trim(),
        expiry_date: fields.get('expiry_date') || null,
        idempotency_key: crypto.randomUUID(),
      } });
      form.closest('dialog').close();
      notify('Purchase order receipt recorded.');
      refreshPage();
    });
    formSubmit('[data-purchase-cancel-form]', async (fields, form) => {
      await api(`/purchasing/orders/${fields.get('order_id')}/cancel/`, { method: 'POST', body: { reason: fields.get('reason').trim() } });
      form.closest('dialog').close();
      notify('Purchase order cancelled.');
      refreshPage();
    });
    await loadPurchases();
  };

  const initCustomerForm = () => formSubmit('[data-customer-form]', async (fields, form) => {
    await api('/customers/', { method: 'POST', body: {
      name: fields.get('name').trim(),
      email: fields.get('email').trim(),
      phone: fields.get('phone').trim(),
      notes: fields.get('notes').trim(),
    } });
    form.closest('dialog').close();
    notify('Customer saved.');
    await loadCustomers();
  });

  const initStaffForm = () => formSubmit('[data-staff-form]', async (fields, form) => {
    await api('/staff/members/', { method: 'POST', body: { username: fields.get('username').trim() } });
    form.closest('dialog').close();
    notify('Existing user added as Staff.');
    await loadStaff();
  });

  const initSettingsForm = () => formSubmit('[data-settings-form]', async (fields) => {
    const profile = await api('/business/profile/', { method: 'PATCH', body: { name: fields.get('name').trim() } });
    document.querySelector('.workspace-switcher strong').textContent = profile.name;
    notify('Business name saved.');
  });

  const initExpenseForm = () => formSubmit('[data-expense-form]', async (fields, form) => {
    await api('/expenses/', { method: 'POST', body: {
      title: fields.get('title').trim(),
      category: fields.get('category').trim(),
      vendor: fields.get('vendor').trim(),
      amount: Number(fields.get('amount')).toFixed(2),
      expense_date: fields.get('expense_date'),
      note: fields.get('note').trim(),
    } });
    form.closest('dialog').close();
    notify('Expense recorded.');
    await loadReports(document.querySelector('[data-report-period].active')?.dataset.reportPeriod || 'month');
  });

  const initRefundForm = () => formSubmit('[data-refund-form]', async (fields, form) => {
    await api(`/sales/${fields.get('sale_id')}/refund/`, { method: 'POST', body: {
      amount: Number(fields.get('amount')).toFixed(2),
      reason: fields.get('reason').trim(),
      idempotency_key: crypto.randomUUID(),
    } });
    form.closest('dialog').close();
    notify('Refund recorded and inventory reconciled.');
    await loadSales();
  });

  const initDashboard = async () => {
    const period = document.querySelector('[data-dashboard-period].active')?.dataset.dashboardPeriod || 'month';
    const summary = await api(`/reports/summary/?period=${period}`);
    const format = (key, value) => key === 'sales_total' || key === 'average_order' ? money(value) : Number(value).toLocaleString('en-NG');
    document.querySelectorAll('[data-dashboard-value]').forEach((node) => {
      const key = node.dataset.dashboardValue;
      node.textContent = format(key, summary[key]);
    });
    document.querySelectorAll('[data-dashboard-note="sales_total"]').forEach((node) => { node.textContent = `${dateOnly(summary.start_date)} – ${dateOnly(summary.end_date)}`; });
    document.querySelector('[data-dashboard-chart-total]').textContent = money(summary.sales_total);
    document.querySelector('[data-dashboard-dates]').textContent = `${dateOnly(summary.start_date)} – ${dateOnly(summary.end_date)}`;
    drawChart(document.querySelector('[data-dashboard-chart]'), summary.chart);
    const [sales, stock] = await Promise.all([api('/sales/'), api('/inventory/stock/')]);
    let activeAlerts = [];
    let openOrders = [];
    let unreadCount = 0;
    if (workspace.dataset.role === 'owner') {
      const [alerts, orders, unread] = await Promise.all([
        api('/inventory/alerts/'),
        api('/purchasing/orders/'),
        api('/notifications/'),
      ]);
      activeAlerts = alerts.results.filter((alert) => !alert.is_resolved);
      openOrders = orders.results.filter((order) => ['ordered', 'partially_received'].includes(order.status));
      unreadCount = unread.results.filter((item) => !item.is_read).length;
    }
    const recent = document.querySelector('[data-dashboard-sales]');
    if (recent) {
      recent.replaceChildren();
      sales.results.slice(0, 5).forEach((sale) => appendDashboardSale(recent, sale));
      if (!sales.results.length) {
        const row = document.createElement('tr');
        row.className = 'empty-table-row';
        const cell = document.createElement('td');
        cell.colSpan = 5;
        cell.append(element('div', 'No sales have been recorded yet.', 'empty-state'));
        row.append(cell);
        recent.append(row);
      }
    }
    const alertHost = document.querySelector('[data-dashboard-alerts]');
    alertHost.replaceChildren();
    const attention = [];
    if (activeAlerts.length) attention.push(['!', 'Low stock items', `${activeAlerts.length} stock lines need replenishment`, '/inventory/']);
    if (openOrders.length) attention.push(['↗', 'Incoming purchase orders', `${openOrders.length} orders are awaiting receipt`, '/purchases/']);
    if (unreadCount) attention.push(['♧', 'Unread notifications', `${unreadCount} updates need review`, '#']);
    document.querySelector('[data-dashboard-alert-count]').textContent = attention.length;
    if (!attention.length) setInlineEmpty(alertHost, 'No current business alerts.');
    attention.forEach(([icon, title, detail, href]) => {
      const link = element('a', undefined, 'attention-row');
      link.href = href;
      link.append(element('span', icon, 'attention-icon'), element('span', undefined));
      link.children[1].append(element('strong', title), element('small', detail));
      link.append(element('span', '↗', 'row-arrow'));
      alertHost.append(link);
    });
    if (workspace.dataset.role !== 'owner') {
      document.querySelector('[data-dashboard-value="average_order"]').closest('.metric-card').hidden = true;
      const lowStock = stock.results.filter((item) => item.reorder_point > 0 && item.quantity <= item.reorder_point).length;
      document.querySelector('[data-dashboard-value="low_stock"]').textContent = lowStock.toLocaleString('en-NG');
      document.querySelector('[data-dashboard-value="low_stock"]').closest('.metric-card').hidden = false;
      const today = new Date();
      const todaySales = sales.results.filter((sale) => new Date(sale.created_at).toDateString() === today.toDateString());
      document.querySelector('[data-dashboard-value="sales_total"]').textContent = money(todaySales.reduce((sum, sale) => sum + Number(sale.total), 0));
      document.querySelector('[data-dashboard-value="order_count"]').textContent = todaySales.length.toLocaleString('en-NG');
      document.querySelector('[data-dashboard-note="sales_total"]').textContent = 'Recorded today';
      document.querySelector('[data-dashboard-note="order_count"]').textContent = 'Recorded today';
      document.querySelector('[data-dashboard-chart-total]').textContent = money(todaySales.reduce((sum, sale) => sum + Number(sale.total), 0));
      document.querySelector('[data-dashboard-dates]').textContent = today.toLocaleDateString('en-NG', { dateStyle: 'medium' });
      drawChart(document.querySelector('[data-dashboard-chart]'), {
        labels: ['Today'],
        values: [String(todaySales.reduce((sum, sale) => sum + Number(sale.total), 0))],
      });
    }
  };

  const appendDashboardSale = (body, sale) => {
    const row = document.createElement('tr');
    [sale.invoice_number, sale.customer_name || 'Walk-in customer', dateTime(sale.created_at), money(sale.total), sale.status].forEach((value, index) => {
      const cell = document.createElement('td');
      cell.textContent = escapeValue(value);
      if (index === 0) cell.append(element('strong', value));
      row.append(cell);
    });
    body.append(row);
  };

  document.querySelectorAll('[data-report-period]').forEach((button) => button.addEventListener('click', async () => {
    document.querySelectorAll('[data-report-period]').forEach((item) => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    try { await loadReports(button.dataset.reportPeriod); }
    catch (error) { showError(error.message); }
  }));
  document.querySelectorAll('[data-dashboard-period]').forEach((button) => button.addEventListener('click', async () => {
    document.querySelectorAll('[data-dashboard-period]').forEach((item) => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    try { await initDashboard(); } catch (error) { showError(error.message); }
  }));
  document.querySelector('[data-print-report]')?.addEventListener('click', () => window.print());

  if (page === 'products') { initProductForm(); initCategoryForm(); initProductEditForm(); }
  if (page === 'inventory') { initStockForm(); initLocationForm(); }
  if (page === 'purchases') initPurchases().catch((error) => showError(error.message));
  if (page === 'customers') initCustomerForm();
  if (page === 'staff') initStaffForm();
  if (page === 'settings') initSettingsForm();
  if (page === 'reports') initExpenseForm();
  if (page === 'sales') initRefundForm();
  if (page === 'pos') initPos().catch((error) => showError(error.message));

  const loaders = {
    products: loadProducts,
    inventory: loadInventory,
    sales: loadSales,
    customers: loadCustomers,
    staff: loadStaff,
    settings: loadSettings,
    reports: () => loadReports('month'),
  };
  const initialize = async () => {
    try {
      await initNotifications();
      if (!page || page === 'dashboard') await initDashboard();
      else if (loaders[page]) await loaders[page]();
    } catch (error) { showError(error.message); }
    finally { if (loading) loading.hidden = true; }
  };
  initialize();
})();
