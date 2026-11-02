(() => {
	const root = document.documentElement;
	const workspace = document.querySelector('.workspace');
	const sidebar = document.getElementById('sidebar');
	const menuToggle = document.getElementById('menuToggle');
	const themeToggle = document.getElementById('themeToggle');
	const toastRegion = document.getElementById('toastRegion');
	const savedTheme = window.localStorage.getItem('norris-theme');

	const setTheme = (theme) => {
		root.setAttribute('data-bs-theme', theme);
		if (themeToggle) {
			const dark = theme === 'dark';
			themeToggle.setAttribute('aria-pressed', String(dark));
			themeToggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
		}
	};

	setTheme(savedTheme === 'dark' ? 'dark' : 'light');

	themeToggle?.addEventListener('click', () => {
		const theme = root.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
		window.localStorage.setItem('norris-theme', theme);
		setTheme(theme);
	});

	const closeNavigation = () => {
		sidebar?.classList.remove('open');
		workspace?.classList.remove('nav-open');
		menuToggle?.setAttribute('aria-expanded', 'false');
		menuToggle?.setAttribute('aria-label', 'Open navigation');
	};

	menuToggle?.addEventListener('click', () => {
		const open = !sidebar?.classList.contains('open');
		sidebar?.classList.toggle('open', open);
		workspace?.classList.toggle('nav-open', open);
		menuToggle.setAttribute('aria-expanded', String(open));
		menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
	});

	document.querySelector('[data-close-navigation]')?.addEventListener('click', closeNavigation);
	sidebar?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeNavigation));

	const showToast = (message) => {
		if (!toastRegion) return;
		const toast = document.createElement('div');
		toast.className = 'app-toast';
		toast.setAttribute('role', 'status');
		toast.textContent = message;
		toastRegion.append(toast);
		window.setTimeout(() => toast.remove(), 3400);
	};

	document.querySelectorAll('[data-toast]').forEach((button) => {
		button.addEventListener('click', () => showToast(button.dataset.toast));
	});

	document.querySelectorAll('[data-demo-action]').forEach((button) => {
		button.addEventListener('click', (event) => {
			event.preventDefault();
			showToast('Preview only. This action does not change business data.');
		});
	});

	const productDialog = document.querySelector('[data-product-dialog]');
	const stockDialog = document.querySelector('[data-stock-dialog]');
	document.querySelector('[data-open-product-form]')?.addEventListener('click', () => productDialog?.showModal());
	document.querySelector('[data-open-stock-form]')?.addEventListener('click', async () => {
		if (!stockDialog) return;
		stockDialog.showModal();
		try {
			const [catalogResponse, locationResponse] = await Promise.all([
				fetch('/api/v1/catalog/products/'),
				fetch('/api/v1/inventory/locations/'),
			]);
			if (!catalogResponse.ok || !locationResponse.ok) throw new Error('Could not load catalog and locations.');
			const catalog = await catalogResponse.json();
			const locations = await locationResponse.json();
			const variants = catalog.results.flatMap((product) => product.variants.map((variant) => ({ ...variant, productName: product.name })));
			const variantSelect = stockDialog.querySelector('[data-stock-variants]');
			variantSelect.replaceChildren(new Option(variants.length ? 'Choose a variant' : 'Create a product first', ''));
			variants.forEach((variant) => variantSelect.add(new Option(`${variant.productName} · ${variant.sku}`, variant.id)));
			const locationSelect = stockDialog.querySelector('[data-stock-locations]');
			locationSelect.replaceChildren(new Option('Choose a location', ''));
			locations.results.forEach((location) => locationSelect.add(new Option(location.name, location.id)));
		} catch (error) {
			showToast(error.message || 'Could not load stock form options.');
		}
	});
	document.querySelectorAll('[data-close-dialog]').forEach((button) => button.addEventListener('click', () => button.closest('dialog')?.close()));

	const apiPost = async (path, payload, csrfToken) => {
		const response = await fetch(path, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
			body: JSON.stringify(payload),
		});
		const body = response.status === 204 ? null : await response.json();
		if (!response.ok) throw new Error(body?.error?.message || body?.detail || JSON.stringify(body));
		return body;
	};

	document.querySelector('[data-product-form]')?.addEventListener('submit', async (event) => {
		event.preventDefault();
		const form = event.currentTarget;
		const fields = new FormData(form);
		const error = form.querySelector('[data-form-error]');
		error.hidden = true;
		try {
			let categoryId = null;
			const categoryName = fields.get('category_name').trim();
			if (categoryName) {
				const categories = await fetch('/api/v1/catalog/categories/').then((response) => response.json());
				const existing = categories.results.find((category) => category.name.toLowerCase() === categoryName.toLowerCase());
				categoryId = existing?.id ?? (await apiPost('/api/v1/catalog/categories/', { name: categoryName }, fields.get('csrfmiddlewaretoken'))).id;
			}
			const product = await apiPost('/api/v1/catalog/products/', {
				name: fields.get('name').trim(),
				category: categoryId,
				variants: [{
					name: fields.get('variant_name').trim() || 'Standard',
					sku: fields.get('sku').trim(),
					price: fields.get('price'),
					unit_cost: fields.get('unit_cost') || null,
					reorder_point: Number(fields.get('reorder_point')),
				}],
			}, fields.get('csrfmiddlewaretoken'));
			const imageFile = fields.get('image_file');
			if (imageFile instanceof File && imageFile.size) {
				const upload = new FormData();
				upload.append('image', imageFile);
				upload.append('alt_text', fields.get('alt_text').trim() || fields.get('name').trim());
				upload.append('is_primary', 'true');
				const response = await fetch(`/api/v1/catalog/products/${product.id}/images/`, {
					method: 'POST',
					headers: { 'X-CSRFToken': fields.get('csrfmiddlewaretoken') },
					body: upload,
				});
				const body = await response.json();
				if (!response.ok) {
					await fetch(`/api/v1/catalog/products/${product.id}/`, { method: 'DELETE', headers: { 'X-CSRFToken': fields.get('csrfmiddlewaretoken') } });
					throw new Error(body?.error?.message || body?.detail || JSON.stringify(body));
				}
			}
			window.location.reload();
		} catch (requestError) {
			error.textContent = requestError.message;
			error.hidden = false;
		}
	});

	document.querySelector('[data-stock-form]')?.addEventListener('submit', async (event) => {
		event.preventDefault();
		const form = event.currentTarget;
		const fields = new FormData(form);
		const error = form.querySelector('[data-form-error]');
		error.hidden = true;
		try {
			let locationId = fields.get('location_id');
			const newLocation = fields.get('location_name').trim();
			if (newLocation) locationId = (await apiPost('/api/v1/inventory/locations/', { name: newLocation }, fields.get('csrfmiddlewaretoken'))).id;
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
			await apiPost('/api/v1/inventory/movements/', payload, fields.get('csrfmiddlewaretoken'));
			window.location.reload();
		} catch (requestError) {
			error.textContent = requestError.message;
			error.hidden = false;
		}
	});

	document.querySelectorAll('.segment').forEach((button) => {
		button.addEventListener('click', () => {
			button.parentElement.querySelectorAll('.segment').forEach((segment) => {
				const active = segment === button;
				segment.classList.toggle('active', active);
				segment.setAttribute('aria-pressed', String(active));
			});
			const period = button.dataset.chartPeriod;
			const chart = button.closest('.chart-surface')?.querySelector('.bar-chart');
			chart?.querySelectorAll('.chart-bar').forEach((bar) => {
				const height = bar.dataset[period];
				bar.style.setProperty('--bar-height', `${height}%`);
			});
			chart?.querySelectorAll('.chart-value').forEach((label) => {
				label.textContent = `${label.dataset[period]}%`;
			});
			const total = button.closest('.chart-surface')?.querySelector('[data-chart-total]');
			if (total) total.textContent = ({ week: '₦2,840,500', month: '₦8,215,000', year: '₦86,430,000' })[period];
			showToast(`${button.textContent.trim()} demo sales period selected.`);
		});
	});

	document.querySelectorAll('[data-table-search]').forEach((input) => {
		input.addEventListener('input', () => {
			const body = input.closest('.surface')?.querySelector('[data-table-body]');
			const rows = body?.querySelectorAll('tr:not(.empty-table-row)') || input.closest('.surface')?.querySelectorAll('.pos-product');
			rows?.forEach((row) => {
				row.hidden = !row.textContent.toLowerCase().includes(input.value.toLowerCase());
			});
		});
	});

	const globalSearch = document.getElementById('workspaceSearch');
	globalSearch?.addEventListener('input', () => {
		const value = globalSearch.value.trim();
		if (!value) return;
		const rows = document.querySelectorAll('[data-table-body] tr:not(.empty-table-row)');
		rows.forEach((row) => {
			row.hidden = !row.textContent.toLowerCase().includes(value.toLowerCase());
		});
	});

	document.addEventListener('keydown', (event) => {
		if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
			event.preventDefault();
			globalSearch?.focus();
		}
	});

	const cartItems = document.querySelector('[data-cart-items]');
	const cartCount = document.querySelector('[data-cart-count]');
	const cartTotal = document.querySelector('[data-cart-total]');
	const checkoutButton = document.querySelector('[data-demo-checkout]');
	const cart = new Map();
	const formatNaira = (amount) => `₦${amount.toLocaleString('en-NG')}`;

	document.querySelectorAll('[data-add-cart]').forEach((button) => {
		button.addEventListener('click', () => {
			const name = button.dataset.name;
			const price = Number(button.dataset.price);
			const existing = cart.get(name) || { price, quantity: 0 };
			existing.quantity += 1;
			cart.set(name, existing);
			if (!cartItems) return;
			cartItems.replaceChildren();
			cart.forEach((item, itemName) => {
				const line = document.createElement('div');
				line.className = 'cart-line';
				const label = document.createElement('strong');
				label.textContent = `${itemName} × ${item.quantity}`;
				const amount = document.createElement('span');
				amount.textContent = formatNaira(item.price * item.quantity);
				line.append(label, amount);
				cartItems.append(line);
			});
			const count = [...cart.values()].reduce((sum, item) => sum + item.quantity, 0);
			const total = [...cart.values()].reduce((sum, item) => sum + item.price * item.quantity, 0);
			cartCount.textContent = String(count);
			cartTotal.textContent = formatNaira(total);
			checkoutButton.disabled = false;
			showToast(`${name} added to this demo basket.`);
		});
	});

	checkoutButton?.addEventListener('click', () => {
		showToast('Demo only. No payment, sale or inventory change was submitted.');
	});
})();
