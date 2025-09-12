// Options page logic (moved from inline script to satisfy CSP best practices)
(function(){
  const elements = {
    focusDuration: document.getElementById('focusDuration'),
    shortBreak: document.getElementById('shortBreak'),
    longBreak: document.getElementById('longBreak'),
    enableFacts: document.getElementById('enableFacts'),
    enableQuotes: document.getElementById('enableQuotes'),
    enableWebsites: document.getElementById('enableWebsites'),
  enableNotifications: document.getElementById('enableNotifications'),
    resetDefaults: document.getElementById('resetDefaults'),
    saveIndicator: document.getElementById('saveIndicator')
  };

  const defaultSettings = {
    focusDuration: 25,
    shortBreak: 5,
    longBreak: 30,
    enableNotifications: true,
    enableFacts: true,
    enableQuotes: true,
    enableWebsites: true,
  enableDebugMode: false
  };

  function showSaved() {
    elements.saveIndicator.classList.add('visible');
    setTimeout(()=>elements.saveIndicator.classList.remove('visible'),1500);
  }

  function load() {
    chrome.storage.sync.get(['settings']).then(res => {
      const s = { ...defaultSettings, ...(res.settings||{}) };
      Object.entries(s).forEach(([k,v]) => {
        if (elements[k]) {
          if (elements[k].type === 'checkbox') elements[k].checked = !!v; else elements[k].value = v;
        }
      });
    });
  }

  function save() {
    chrome.storage.sync.get(['settings']).then(res => {
      const current = { ...defaultSettings, ...(res.settings||{}) };
      Object.keys(defaultSettings).forEach(k => {
        if (elements[k]) {
          current[k] = elements[k].type === 'checkbox' ? elements[k].checked : (elements[k].value || defaultSettings[k]);
        }
      });
      chrome.storage.sync.set({ settings: current }).then(showSaved);
    });
  }

  Object.values(elements).forEach(el => {
    if (!el || el.id==='resetDefaults' || el.id==='saveIndicator') return;
    el.addEventListener('change', save);
    el.addEventListener('input', e => { if (e.target.type==='number') save(); });
  });

  elements.resetDefaults.addEventListener('click', () => {
    if (!confirm('Reset all options to recommended defaults?')) return;
    Object.entries(defaultSettings).forEach(([k,v]) => { if (elements[k]) { if (elements[k].type==='checkbox') elements[k].checked = v; else elements[k].value = v; } });
    save();
  });

  load();
})();
