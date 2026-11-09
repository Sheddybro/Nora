(() => {
  const installButtons = [...document.querySelectorAll('.pwa-install-button')];
  let installPrompt = null;

  const setInstallButtonVisibility = (visible) => {
    installButtons.forEach((button) => { button.hidden = !visible; });
  };
  const isInstalled = () => window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;

  setInstallButtonVisibility(false);
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js', { scope: '/' }).catch((error) => {
        const status = document.querySelector('[data-pwa-status], [data-offline-status]');
        if (status) {
          status.textContent = 'Desktop app support could not start. Refresh while online and try again.';
          status.hidden = false;
        }
        console.error('NorrisBeauty service worker registration failed.', error);
      });
    });
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    if (isInstalled()) return;
    event.preventDefault();
    installPrompt = event;
    setInstallButtonVisibility(true);
  });

  installButtons.forEach((button) => button.addEventListener('click', async () => {
    if (!installPrompt) return;
    try {
      installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted' || isInstalled()) setInstallButtonVisibility(false);
    } catch (error) {
      const status = document.querySelector('[data-pwa-status], [data-offline-status]');
      if (status) {
        status.textContent = 'The desktop app install prompt could not be opened. Use your browser menu to install NorrisBeauty.';
        status.hidden = false;
      }
      console.error('NorrisBeauty installation prompt failed.', error);
    } finally {
      installPrompt = null;
    }
  }));
  window.addEventListener('appinstalled', () => setInstallButtonVisibility(false));

  document.querySelectorAll('form.logout-form').forEach((form) => {
    form.addEventListener('submit', async (event) => {
      if (form.dataset.offlineCleared === 'true') return;
      event.preventDefault();
      const submit = form.querySelector('button[type="submit"]');
      if (submit) submit.disabled = true;
      try {
        await window.NorrisOfflineVault?.clear();
        form.dataset.offlineCleared = 'true';
        if (submit) submit.disabled = false;
        form.requestSubmit();
      } catch (error) {
        if (submit) submit.disabled = false;
        window.alert(`Offline data could not be deleted, so you were not signed out. ${error.message}`);
      }
    });
  });
})();
