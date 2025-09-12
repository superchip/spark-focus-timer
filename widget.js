// Floating Spark Widget content script
// Injects a draggable mini timer that mirrors background/popup state.

function __sparkMountWidget(){
  const WIDGET_ID = 'spark-widget-root';
  if (document.getElementById(WIDGET_ID)) return; // prevent duplicates

  // User setting toggle (sync) key
  const SETTING_KEY = 'settings';
  let settingsCache = null;

  // State mirrored from storage timerState
  let timerState = null; // {isRunning,currentSession,sessionCount,timeLeft,totalTime,startTime,breakContentOpened}
  let tickInterval = null;

  const root = document.createElement('div');
  root.id = WIDGET_ID;
  document.documentElement.appendChild(root);
  const shadow = root.attachShadow ? root.attachShadow({mode:'open'}) : root; // fallback if unavailable
  console.debug('[SparkWidget] Inject root');

  // Inline CSS (shadow encapsulated) – trimmed subset of widget.css plus safety resets
  const style = document.createElement('style');
  style.textContent = `:host{all:initial;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Ubuntu,sans-serif;}
  .spark-widget{position:fixed;top:80px;left:20px;z-index:2147483646;width:210px;background:#ffffffee;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);box-shadow:0 6px 18px -4px rgba(0,0,0,.25),0 2px 4px rgba(0,0,0,.12);border:1px solid #e2e8f0;border-radius:16px;padding:14px 14px 12px;font-size:13px;line-height:1.3;color:#111;cursor:default;user-select:none;font-family:inherit;}
  .spark-widget.dragging{opacity:.85;cursor:grabbing}
  .spark-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}
  .spark-title{font-weight:600;font-size:13px;letter-spacing:.3px;display:flex;align-items:center;gap:4px}
  .spark-controls{display:flex;gap:6px}
  .spark-btn{border:none;background:#f1f5f9;color:#334155;padding:4px 8px;font-size:12px;border-radius:6px;cursor:pointer;display:flex;align-items:center;gap:4px;font-weight:500;font-family:inherit}
  .spark-btn:hover{background:#e2e8f0}
  .spark-btn-primary{background:#667eea;color:#fff}
  .spark-btn-primary:hover{background:#546adf}
  .spark-progress-wrap{position:relative;height:8px;background:#e2e8f0;border-radius:6px;overflow:hidden;margin:8px 0 6px}
  .spark-progress-bar{position:absolute;inset:0;width:0%;background:linear-gradient(90deg,#667eea,#764ba2);transition:width .4s cubic-bezier(.4,0,.2,1)}
  .spark-session-focus .spark-progress-bar{background:linear-gradient(90deg,#4ade80,#16a34a)}
  .spark-session-break .spark-progress-bar{background:linear-gradient(90deg,#fbbf24,#f59e0b)}
  .spark-time-row{display:flex;justify-content:space-between;font-size:11px;color:#475569;font-variant-numeric:tabular-nums}
  .spark-session-label{font-size:12px;font-weight:500;color:#475569}
  .spark-handle{position:absolute;top:4px;right:6px;width:14px;height:14px;cursor:grab;opacity:.55}
  .spark-handle:after{content:'⋮';font-size:14px;line-height:14px;color:#475569}
  .spark-footer{display:flex;justify-content:space-between;align-items:center;margin-top:4px}
  .spark-collapse-btn{background:transparent;border:none;cursor:pointer;font-size:14px;color:#64748b}
  .spark-collapse-btn:hover{color:#334155}
  .spark-collapsed .spark-main{display:none}
  .spark-collapsed{width:130px}
  .spark-status-dot{width:8px;height:8px;border-radius:50%;background:#4ade80;box-shadow:0 0 0 4px #dcfce7}
  .spark-session-break .spark-status-dot{background:#fbbf24;box-shadow:0 0 0 4px #fef3c7}
  .spark-close{position:absolute;top:4px;left:6px;width:18px;height:18px;border:none;background:transparent;font-size:16px;line-height:18px;cursor:pointer;color:#64748b}
  .spark-close:hover{color:#334155}
  button{font-family:inherit}
  `;

  const widget = document.createElement('div');
  widget.className = 'spark-widget spark-session-focus';
  widget.innerHTML = `
    <button class="spark-close" title="Hide">×</button>
    <div class="spark-handle" title="Drag"></div>
    <div class="spark-header">
      <div class="spark-title"><div class="spark-status-dot"></div><span id="sparkSessionLabel">Focus</span></div>
      <div class="spark-controls">
        <button class="spark-btn spark-btn-primary" id="sparkPlayPause">Start</button>
        <button class="spark-btn" id="sparkReset" title="Reset">⟲</button>
      </div>
    </div>
    <div class="spark-main">
      <div class="spark-progress-wrap"><div class="spark-progress-bar" id="sparkProgress"></div></div>
      <div class="spark-time-row"><span id="sparkTime">--:--</span><span id="sparkPct">0%</span></div>
      <div class="spark-footer">
        <span class="spark-session-label" id="sparkNextLabel"></span>
        <button class="spark-collapse-btn" id="sparkCollapse" title="Collapse">▾</button>
      </div>
    </div>`;
  shadow.appendChild(style);
  shadow.appendChild(widget);

  const els = {
    playPause: widget.querySelector('#sparkPlayPause'),
    reset: widget.querySelector('#sparkReset'),
    time: widget.querySelector('#sparkTime'),
    pct: widget.querySelector('#sparkPct'),
    progress: widget.querySelector('#sparkProgress'),
    sessionLabel: widget.querySelector('#sparkSessionLabel'),
    nextLabel: widget.querySelector('#sparkNextLabel'),
    collapse: widget.querySelector('#sparkCollapse'),
    close: widget.querySelector('.spark-close')
  };

  function loadSettings(){
  return chrome.storage.sync.get([SETTING_KEY]).then(r=>{settingsCache = r.settings||settingsCache; if(settingsCache && settingsCache.enableWidget===false){ root.remove(); return Promise.reject('Widget disabled'); } return settingsCache;});
  }

  function formatTime(sec){
    const m = Math.floor(sec/60).toString().padStart(2,'0');
    const s = Math.floor(sec%60).toString().padStart(2,'0');
    return `${m}:${s}`;
  }

  function deriveNextSession(state){
    if (!state) return '';
    if (state.currentSession === 'focus'){
      const nextCount = state.sessionCount + 1;
      if (nextCount % 4 === 0) return 'Next: Long Break';
      return 'Next: Short Break';
    }
    return 'Next: Focus';
  }

  function updateVisual(){
    if (!timerState){ els.time.textContent='--:--'; return; }
    const now = Date.now();
    let remaining = timerState.timeLeft;
    if (timerState.isRunning && timerState.startTime){
      const elapsed = Math.floor((now - timerState.startTime)/1000);
      remaining = Math.max(0, timerState.totalTime - elapsed);
    }
    els.time.textContent = formatTime(remaining);
    const progress = timerState.totalTime>0 ? (timerState.totalTime-remaining)/timerState.totalTime : 0;
    els.pct.textContent = Math.round(progress*100)+'%';
    els.progress.style.width = (progress*100)+'%';

    const session = timerState.currentSession;
    els.sessionLabel.textContent = session==='focus' ? 'Focus' : (session==='longBreak'?'Long Break':'Break');
    widget.classList.toggle('spark-session-focus', session==='focus');
    widget.classList.toggle('spark-session-break', session!=='focus');
    els.nextLabel.textContent = deriveNextSession(timerState);

    els.playPause.textContent = timerState.isRunning ? 'Pause' : (session==='focus' ? 'Start' : 'Start');
  }

  function clearTicker(){ if (tickInterval) { clearInterval(tickInterval); tickInterval=null; } }
  function startTicker(){ clearTicker(); tickInterval = setInterval(updateVisual, 1000); }

  // Persist position & collapsed state
  const POS_KEY = 'widgetPosition';
  function savePosition(left, top, collapsed){
    chrome.storage.local.set({ [POS_KEY]: { left, top, collapsed } });
  }
  function restorePosition(){
    chrome.storage.local.get([POS_KEY]).then(r=>{
      const pos = r[POS_KEY];
      if (!pos) return;
      widget.style.left = pos.left + 'px';
      widget.style.top = pos.top + 'px';
      if (pos.collapsed) widget.classList.add('spark-collapsed');
    });
  }

  function syncFromStorage(){
    console.debug('[SparkWidget] Sync from storage');
    chrome.storage.local.get(['timerState', POS_KEY]).then(res=>{
      if(res.timerState){ timerState = res.timerState; updateVisual(); if(timerState.isRunning) startTicker(); else clearTicker(); }
      else { timerState = null; updateVisual(); }
      const pos = res[POS_KEY];
      if (pos){ widget.style.left = pos.left+'px'; widget.style.top = pos.top+'px'; if(pos.collapsed) widget.classList.add('spark-collapsed'); }
    });
  }

  // Initial load
  loadSettings().then(()=> syncFromStorage()).catch(()=>{});

  // React to external changes
  chrome.storage.onChanged.addListener((changes, area)=>{
    if (area==='local' && changes.timerState){ timerState = changes.timerState.newValue; updateVisual(); if(timerState && timerState.isRunning) startTicker(); else clearTicker(); }
    if (area==='sync' && changes.settings){ settingsCache = changes.settings.newValue; }
  });

  // Control actions mimic popup logic by sending messages to background & updating storage state directly
  function saveState(state){ return chrome.storage.local.set({timerState: state}); }

  function getDurations(){
    const s = settingsCache || {}; return { focus: s.focusDuration||25, shortBreak: s.shortBreak||5, longBreak: s.longBreak||30 };
  }

  function startSession(){
    if(!timerState){ // create new focus state
      const d = getDurations();
      timerState = { isRunning:true,currentSession:'focus',sessionCount:0,timeLeft:d.focus*60,totalTime:d.focus*60,startTime:Date.now(),breakContentOpened:false };
    } else if (!timerState.isRunning){
      // resume same session fresh
      const durs = getDurations();
      let dur;
      if (timerState.currentSession==='focus') dur = durs.focus; else if (timerState.currentSession==='longBreak') dur = durs.longBreak; else dur = durs.shortBreak;
      timerState.isRunning = true; timerState.totalTime = dur*60; timerState.timeLeft = dur*60; timerState.startTime = Date.now();
      // Open break content if starting break
      if ((timerState.currentSession==='shortBreak' || timerState.currentSession==='longBreak') && !timerState.breakContentOpened){
        chrome.runtime.sendMessage({action:'openBreakContent', type:'fact', url:''}); // random via background; passing fact placeholder
        timerState.breakContentOpened = true;
      }
    } else {
      // already running -> treat as pause
      pauseSession(); return;
    }
    saveState(timerState).then(()=>{
      chrome.runtime.sendMessage({action:'startBackgroundTimer', duration: timerState.totalTime/60, sessionInfo:{ type: timerState.currentSession, sessionCount: timerState.sessionCount }});
      updateVisual(); startTicker();
    });
  }

  function pauseSession(){
    if (!timerState || !timerState.isRunning) return;
    // compute remaining
    const now = Date.now();
    const elapsed = Math.floor((now - timerState.startTime)/1000);
    const remaining = Math.max(0, timerState.totalTime - elapsed);
    timerState.isRunning = false; timerState.timeLeft = remaining; timerState.startTime = null;
    saveState(timerState).then(()=>{ chrome.runtime.sendMessage({action:'stopBackgroundTimer'}); updateVisual(); clearTicker(); });
  }

  function resetSession(){
    if(!timerState) return; const d = getDurations();
    let dur; if (timerState.currentSession==='focus') dur = d.focus; else if (timerState.currentSession==='longBreak') dur = d.longBreak; else dur = d.shortBreak;
    timerState.isRunning=false; timerState.timeLeft=dur*60; timerState.totalTime=dur*60; timerState.startTime=null; timerState.breakContentOpened=false;
    saveState(timerState).then(()=>{ chrome.runtime.sendMessage({action:'stopBackgroundTimer'}); updateVisual(); clearTicker(); });
  }

  // Event wiring
  els.playPause.addEventListener('click', startSession);
  els.reset.addEventListener('click', resetSession);
  els.close.addEventListener('click', ()=>{ root.remove(); clearTicker(); });
  console.debug('[SparkWidget] Event listeners bound');
  els.collapse.addEventListener('click', ()=>{ const collapsed = widget.classList.toggle('spark-collapsed'); els.collapse.textContent = collapsed ? '▸' : '▾'; const rect=widget.getBoundingClientRect(); savePosition(rect.left, rect.top, collapsed); });

  // Drag logic
  (function enableDrag(){
    const handle = widget.querySelector('.spark-handle');
    let dragging=false; let startX=0,startY=0,origX=0,origY=0;
    function clamp(val, min, max){ return Math.min(Math.max(val, min), max); }
    function onDown(e){ dragging=true; widget.classList.add('dragging'); startX=e.clientX; startY=e.clientY; const rect=widget.getBoundingClientRect(); origX=rect.left; origY=rect.top; document.addEventListener('mousemove',onMove); document.addEventListener('mouseup',onUp); }
    function onMove(e){ if(!dragging) return; const dx=e.clientX-startX; const dy=e.clientY-startY; const vw = window.innerWidth; const vh = window.innerHeight; const wRect = widget.getBoundingClientRect(); const newLeft = clamp(origX+dx, 4, vw - wRect.width - 4); const newTop = clamp(origY+dy, 4, vh - wRect.height - 4); widget.style.left=newLeft+'px'; widget.style.top=newTop+'px'; widget.style.right='auto'; widget.style.bottom='auto'; widget.style.position='fixed'; }
    function onUp(){ if(!dragging) return; dragging=false; widget.classList.remove('dragging'); document.removeEventListener('mousemove',onMove); document.removeEventListener('mouseup',onUp); const rect=widget.getBoundingClientRect(); savePosition(rect.left, rect.top, widget.classList.contains('spark-collapsed')); }
    handle.addEventListener('mousedown', onDown);
  })();

  restorePosition();

  // Keyboard accessibility (focus + space/enter triggers main button)
  widget.tabIndex = 0; widget.addEventListener('keydown', e=>{ if(e.key===' '||e.key==='Enter'){ e.preventDefault(); els.playPause.click(); } });

  // Public debug hook
  window.__sparkWidget = { syncFromStorage, remount: __sparkMountWidget };
}

// Auto-mount if enabled
try { __sparkMountWidget(); } catch(e) { /* silent */ }

// Provide global helper for manual injection from console
window.__sparkInjectWidget = function(){
  if (document.getElementById('spark-widget-root')) {
    console.log('[SparkWidget] Already mounted');
  } else {
    try { __sparkMountWidget(); } catch(e) { console.warn('[SparkWidget] Mount failed', e); }
  }
};
