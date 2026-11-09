(() => {
  const DATABASE = 'norrisbeauty-offline-vault';
  const STORE = 'snapshots';
  const SNAPSHOT_KEY = 'active';
  const SCHEMA_VERSION = 1;
  const PBKDF2_ITERATIONS = 600000;
  const MAX_SNAPSHOT_BYTES = 5 * 1024 * 1024;
  const SNAPSHOT_LIFETIME_MS = 24 * 60 * 60 * 1000;
  const AUTO_LOCK_MS = 5 * 60 * 1000;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let idleTimer = null;
  let unlockedPayload = null;
  let broadcast = null;

  function openDatabase() {
    if (!window.indexedDB) throw new Error('This browser does not support local offline storage.');
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) {
          request.result.createObjectStore(STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Offline storage could not be opened.'));
      request.onblocked = () => reject(new Error('Close other NorrisBeauty tabs before changing offline storage.'));
    });
  }

  async function readSnapshot() {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE, 'readonly');
      const request = transaction.objectStore(STORE).get(SNAPSHOT_KEY);
      request.onsuccess = () => {
        database.close();
        resolve(request.result || null);
      };
      request.onerror = () => {
        database.close();
        reject(new Error('The saved offline snapshot could not be read.'));
      };
    });
  }

  async function writeSnapshot(snapshot) {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE, 'readwrite');
      transaction.objectStore(STORE).put(snapshot, SNAPSHOT_KEY);
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onerror = () => {
        database.close();
        reject(new Error('The encrypted offline snapshot could not be saved.'));
      };
      transaction.onabort = () => {
        database.close();
        reject(new Error('Saving the offline snapshot was interrupted.'));
      };
    });
  }

  function bytesToBase64(bytes) {
    let binary = '';
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    return btoa(binary);
  }

  function base64ToBytes(value) {
    const binary = atob(value);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  }

  async function deriveEncryptionKey(passphrase, salt) {
    if (!window.crypto?.subtle || !window.isSecureContext) {
      throw new Error('Encrypted offline storage requires HTTPS or localhost and Web Crypto support.');
    }
    const passphraseBytes = encoder.encode(passphrase);
    try {
      const material = await crypto.subtle.importKey('raw', passphraseBytes, 'PBKDF2', false, ['deriveKey']);
      return await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
        material,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
      );
    } finally {
      passphraseBytes.fill(0);
    }
  }

  function requireStrongPassphrase(passphrase) {
    if (passphrase.length < 12) {
      throw new Error('Choose a separate offline passphrase with at least 12 characters. Do not reuse your website password.');
    }
  }

  async function encryptPayload(payload, passphrase) {
    requireStrongPassphrase(passphrase);
    const plaintext = encoder.encode(JSON.stringify(payload));
    if (plaintext.byteLength > MAX_SNAPSHOT_BYTES) {
      plaintext.fill(0);
      throw new Error('This catalog snapshot is too large to store safely on this device.');
    }
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    try {
      const key = await deriveEncryptionKey(passphrase, salt);
      const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
      return {
        schemaVersion: SCHEMA_VERSION,
        savedAt: new Date().toISOString(),
        expiresAt: payload.expiresAt,
        iterations: PBKDF2_ITERATIONS,
        salt: bytesToBase64(salt),
        iv: bytesToBase64(iv),
        ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
      };
    } finally {
      plaintext.fill(0);
    }
  }

  function getIdentity(area) {
    const userId = Number(area.dataset.userId);
    const businessId = Number(area.dataset.businessId);
    if (!Number.isSafeInteger(userId) || !Number.isSafeInteger(businessId) || userId < 1 || businessId < 1) {
      throw new Error('The current account has no active business membership.');
    }
    return { userId, businessId };
  }

  async function fetchJson(url) {
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Your live account cannot access this data. Sign in again or ask an owner to check your permissions.');
      }
      throw new Error(`Live data could not be refreshed (HTTP ${response.status}).`);
    }
    return response.json();
  }

  async function collectSnapshot(area) {
    const identity = getIdentity(area);
    const firstPage = await fetchJson('/api/v1/catalog/products/?limit=100&page=1');
    if (!Number.isSafeInteger(firstPage.pages) || firstPage.pages > 100) {
      throw new Error('The catalog is too large to prepare as an offline snapshot.');
    }
    const productPages = [firstPage];
    for (let page = 2; page <= firstPage.pages; page += 1) {
      productPages.push(await fetchJson(`/api/v1/catalog/products/?limit=100&page=${page}`));
    }
    const products = productPages.flatMap((page) => page.results).map((product) => ({
      name: product.name,
      category: product.category_name || 'Uncategorized',
      variants: product.variants
        .filter((variant) => variant.is_active)
        .map((variant) => ({ name: variant.name, sku: variant.sku, barcode: variant.barcode })),
    }));
    const stockResponse = await fetchJson('/api/v1/inventory/stock/');
    const stock = stockResponse.results.map((item) => ({
      productName: item.product_name,
      variantName: item.variant_name,
      sku: item.sku,
      locationName: item.location_name,
      quantity: item.quantity,
      reorderPoint: item.reorder_point,
    }));
    const username = document.querySelector('[data-offline-account-name]')?.textContent.trim() || '';
    const businessName = document.querySelector('[data-offline-business-name]')?.textContent.trim() || '';
    return {
      schemaVersion: SCHEMA_VERSION,
      identity: { ...identity, username, businessName },
      createdAt: new Date().toISOString(),
      products,
      stock,
    };
  }

  async function saveSnapshot(payload, passphrase) {
    const snapshotPayload = { ...payload, expiresAt: Date.now() + SNAPSHOT_LIFETIME_MS };
    const encrypted = await encryptPayload(snapshotPayload, passphrase);
    await writeSnapshot(encrypted);
    return { encrypted, payload: snapshotPayload };
  }

  async function unlockSnapshot(passphrase, expectedIdentity) {
    const encrypted = await readSnapshot();
    if (!encrypted) throw new Error('There is no offline snapshot on this device. Connect and save one first.');
    if (encrypted.schemaVersion !== SCHEMA_VERSION || !encrypted.expiresAt || !encrypted.ciphertext) {
      throw new Error('The saved offline snapshot has an unsupported format. Delete it and create a fresh snapshot.');
    }
    if (Date.now() >= encrypted.expiresAt) {
      await clearSnapshot();
      throw new Error('The offline snapshot expired after 24 hours. Connect and save a new one.');
    }
    let plaintext;
    try {
      const key = await deriveEncryptionKey(passphrase, base64ToBytes(encrypted.salt));
      plaintext = new Uint8Array(await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: base64ToBytes(encrypted.iv) },
        key,
        base64ToBytes(encrypted.ciphertext),
      ));
      const payload = JSON.parse(decoder.decode(plaintext));
      if (payload.schemaVersion !== SCHEMA_VERSION || !payload.identity || !Array.isArray(payload.products) || !Array.isArray(payload.stock)) {
        throw new Error('The decrypted snapshot has an invalid format. Delete it and create a fresh snapshot.');
      }
      if (payload.expiresAt !== encrypted.expiresAt || Date.now() >= payload.expiresAt) {
        await clearSnapshot();
        throw new Error('The offline snapshot expired after 24 hours. Connect and save a new one.');
      }
      if (expectedIdentity && (
        payload.identity.userId !== expectedIdentity.userId
        || payload.identity.businessId !== expectedIdentity.businessId
      )) {
        throw new Error('This offline snapshot belongs to a different account or business.');
      }
      return { encrypted, payload };
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('The offline snapshot could not be decoded. Delete it and create a fresh snapshot.');
      }
      if (error instanceof DOMException && error.name === 'OperationError') {
        throw new Error('That offline passphrase is incorrect, or the snapshot could not be decrypted.');
      }
      throw error;
    } finally {
      plaintext?.fill(0);
    }
  }

  async function clearSnapshot() {
    if (!window.indexedDB) return;
    const database = await openDatabase();
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE, 'readwrite');
      transaction.objectStore(STORE).delete(SNAPSHOT_KEY);
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onerror = () => {
        database.close();
        reject(new Error('Offline data could not be deleted from this device.'));
      };
      transaction.onabort = () => {
        database.close();
        reject(new Error('Deleting offline data was interrupted.'));
      };
    });
    broadcastChange('cleared');
  }

  function broadcastChange(type) {
    try {
      if (!broadcast && 'BroadcastChannel' in window) {
        broadcast = new BroadcastChannel('norrisbeauty-offline-vault');
      }
      broadcast?.postMessage({ type });
    } catch (error) {
      console.error('Could not notify other NorrisBeauty tabs about offline data.', error);
    }
  }

  function showMessage(area, message, isError = false) {
    const status = area.querySelector('[data-offline-status]');
    if (!status) return;
    status.textContent = message;
    status.dataset.state = isError ? 'error' : 'success';
    status.hidden = false;
  }

  function clearRenderedData(area) {
    const content = area.querySelector('[data-offline-content]');
    if (content) content.hidden = true;
    area.querySelector('[data-offline-products]')?.replaceChildren();
    area.querySelector('[data-offline-stock]')?.replaceChildren();
    unlockedPayload = null;
  }

  function lock(area, message = 'Offline data is locked.') {
    if (idleTimer) window.clearTimeout(idleTimer);
    idleTimer = null;
    clearRenderedData(area);
    const passphrase = area.querySelector('[data-offline-passphrase]');
    const confirmation = area.querySelector('[data-offline-confirm]');
    if (passphrase) passphrase.value = '';
    if (confirmation) confirmation.value = '';
    showMessage(area, message);
  }

  function displaySnapshot(area, payload, encrypted) {
    unlockedPayload = payload;
    const content = area.querySelector('[data-offline-content]');
    const productsList = area.querySelector('[data-offline-products]');
    const stockBody = area.querySelector('[data-offline-stock]');
    const query = area.querySelector('[data-offline-search]')?.value.trim().toLowerCase() || '';
    const products = payload.products.filter((product) => (
      `${product.name} ${product.category} ${product.variants.map((variant) => `${variant.name} ${variant.sku} ${variant.barcode}`).join(' ')}`
        .toLowerCase().includes(query)
    ));
    const stock = payload.stock.filter((item) => (
      `${item.productName} ${item.variantName} ${item.sku} ${item.locationName}`.toLowerCase().includes(query)
    ));
    const savedAt = new Date(encrypted.savedAt).toLocaleString();
    const expiresAt = new Date(encrypted.expiresAt).toLocaleString();
    const identity = payload.identity;
    const metadata = area.querySelector('[data-offline-metadata]');
    if (metadata) {
      metadata.textContent = `Snapshot for ${identity.businessName || 'this business'} · ${identity.username || 'account'} · saved ${savedAt} · expires ${expiresAt}. Information may be out of date.`;
    }
    productsList?.replaceChildren();
    products.forEach((product) => {
      const item = document.createElement('li');
      const title = document.createElement('strong');
      title.textContent = product.name;
      const details = document.createElement('span');
      details.textContent = `${product.category} · ${product.variants.map((variant) => `${variant.name} (${variant.sku})`).join(', ') || 'No active variants'}`;
      item.append(title, details);
      productsList?.append(item);
    });
    if (productsList && !products.length) {
      const empty = document.createElement('li');
      empty.textContent = query ? 'No saved products match this filter.' : 'No active products in the saved catalog.';
      productsList.append(empty);
    }
    stockBody?.replaceChildren();
    stock.forEach((item) => {
      const row = document.createElement('tr');
      [item.productName, item.sku, item.locationName, `${item.quantity} units`, `${item.reorderPoint} units`]
        .forEach((value) => {
          const cell = document.createElement('td');
          cell.textContent = String(value ?? '');
          row.append(cell);
        });
      stockBody?.append(row);
    });
    if (stockBody && !stock.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 5;
      cell.textContent = query ? 'No saved stock rows match this filter.' : 'No stock rows in the saved snapshot.';
      row.append(cell);
      stockBody.append(row);
    }
    if (content) content.hidden = false;
    showMessage(area, `Unlocked read-only snapshot for ${identity.businessName || 'this business'}.`);
    if (idleTimer) window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => lock(area, 'Offline data was locked after 5 minutes of inactivity.'), AUTO_LOCK_MS);
  }

  function setupArea(area) {
    const passphrase = area.querySelector('[data-offline-passphrase]');
    const confirmation = area.querySelector('[data-offline-confirm]');
    const saveButton = area.querySelector('[data-offline-save]');
    const unlockButton = area.querySelector('[data-offline-unlock]');
    const lockButton = area.querySelector('[data-offline-lock]');
    const deleteButton = area.querySelector('[data-offline-delete]');
    const identity = area.hasAttribute('data-user-id') ? getIdentity(area) : null;

    saveButton?.addEventListener('click', async () => {
      try {
        if (!navigator.onLine) throw new Error('Connect to the internet before refreshing the offline snapshot.');
        if (!passphrase || !confirmation || passphrase.value !== confirmation.value) {
          throw new Error('Enter and confirm the same separate offline passphrase.');
        }
        requireStrongPassphrase(passphrase.value);
        saveButton.disabled = true;
        showMessage(area, 'Checking permissions and preparing a read-only snapshot from the live catalog and stock.');
        const payload = await collectSnapshot(area);
        const saved = await saveSnapshot(payload, passphrase.value);
        passphrase.value = '';
        confirmation.value = '';
        displaySnapshot(area, saved.payload, saved.encrypted);
      } catch (error) {
        showMessage(area, error.message || 'The offline snapshot could not be prepared.', true);
      } finally {
        saveButton.disabled = false;
      }
    });

    unlockButton?.addEventListener('click', async () => {
      try {
        if (!passphrase?.value) throw new Error('Enter the offline passphrase for this snapshot.');
        unlockButton.disabled = true;
        const unlocked = await unlockSnapshot(passphrase.value, identity);
        passphrase.value = '';
        displaySnapshot(area, unlocked.payload, unlocked.encrypted);
      } catch (error) {
        showMessage(area, error.message || 'The offline snapshot could not be unlocked.', true);
      } finally {
        unlockButton.disabled = false;
      }
    });

    lockButton?.addEventListener('click', () => lock(area));
    deleteButton?.addEventListener('click', async () => {
      try {
        await clearSnapshot();
        lock(area, 'Offline snapshot deleted from this browser profile.');
      } catch (error) {
        showMessage(area, error.message || 'Offline data could not be deleted.', true);
      }
    });

    area.querySelector('[data-offline-search]')?.addEventListener('input', () => {
      if (unlockedPayload) {
        const encrypted = { savedAt: unlockedPayload.createdAt, expiresAt: unlockedPayload.expiresAt };
        displaySnapshot(area, unlockedPayload, encrypted);
      }
    });

    ['pointerdown', 'keydown', 'touchstart'].forEach((eventName) => {
      area.addEventListener(eventName, () => {
        if (unlockedPayload && idleTimer) {
          window.clearTimeout(idleTimer);
          idleTimer = window.setTimeout(() => lock(area, 'Offline data was locked after 5 minutes of inactivity.'), AUTO_LOCK_MS);
        }
      }, { passive: true });
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && unlockedPayload) lock(area, 'Offline data was locked when the app was hidden.');
    });
    window.addEventListener('pagehide', () => {
      if (unlockedPayload) lock(area, 'Offline data was locked when the app was closed.');
    });

    readSnapshot().then((encrypted) => {
      if (!encrypted) return;
      if (Date.now() >= encrypted.expiresAt) {
        return clearSnapshot().then(() => showMessage(area, 'The previous offline snapshot expired and was deleted. Connect to save a fresh one.'));
      }
      showMessage(area, `An encrypted offline snapshot is available and expires ${new Date(encrypted.expiresAt).toLocaleString()}.`);
    }).catch((error) => showMessage(area, error.message || 'Offline storage could not be checked.', true));
  }

  if ('BroadcastChannel' in window) {
    broadcast = new BroadcastChannel('norrisbeauty-offline-vault');
    broadcast.addEventListener('message', (event) => {
      if (event.data?.type === 'cleared') {
        document.querySelectorAll('[data-offline-vault]').forEach((area) => {
          lock(area, 'Offline data was deleted from another NorrisBeauty tab.');
        });
      }
    });
  }

  document.querySelectorAll('[data-offline-vault]').forEach(setupArea);
  window.NorrisOfflineVault = { clear: clearSnapshot };
})();
