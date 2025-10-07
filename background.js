// Background service worker for Spark extension

// Debug logging system
let debugLogs = [];
const maxDebugLogs = 1000;

function debugLog(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        level,
        message,
        source: 'background'
    };
    
    debugLogs.push(logEntry);
    
    // Keep only the most recent logs
    if (debugLogs.length > maxDebugLogs) {
        debugLogs.shift();
    }
    
    // Always log to console for background script
    console.log(`[SPARK BG ${level.toUpperCase()}]`, message);
    
    // Store in chrome storage for persistence
    chrome.storage.local.set({ backgroundDebugLogs: debugLogs.slice(-100) }); // Keep last 100
}

chrome.runtime.onInstalled.addListener(() => {
    debugLog('Spark extension installed', 'info');
    
    // Set up default settings
    chrome.storage.sync.get(['settings'], (result) => {
        if (!result.settings) {
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
            chrome.storage.sync.set({ settings: defaultSettings });
            debugLog('Default settings initialized', 'info');
        } else {
            debugLog('Existing settings loaded', 'info');
        }
    });
    
    // Clear any existing alarms on install
    chrome.alarms.clearAll();
    debugLog('Cleared all existing alarms', 'info');
});

// Handle service worker startup
chrome.runtime.onStartup.addListener(() => {
    debugLog('Extension service worker started', 'info');
    
    // Check if there was a running timer that needs to be restored
    checkTimerState();
});

// Keep service worker alive when needed
chrome.runtime.onSuspend.addListener(() => {
    debugLog('Service worker suspending', 'warn');
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    debugLog(`Received message: ${request.action}`, 'info');
    
    switch (request.action) {
        case 'showNotification':
            showNotification(request.title, request.message, request.sessionType);
            break;
        case 'openBreakContent':
            openBreakContent(request.type, request.url);
            break;
        case 'startBackgroundTimer':
            startBackgroundTimer(request.duration, request.sessionInfo);
            
            // Open break content if this is a break session starting and content hasn't been opened yet
            if (request.sessionInfo && 
                (request.sessionInfo.type === 'shortBreak' || request.sessionInfo.type === 'longBreak')) {
                chrome.storage.local.get(['timerState']).then(result => {
                    // Only open break content if it hasn't been opened for this session
                    if (!result.timerState || !result.timerState.breakContentOpened) {
                        chrome.storage.sync.get(['settings']).then(settingsResult => {
                            const settings = settingsResult.settings || {
                                enableFacts: true,
                                enableQuotes: true,
                                enableWebsites: true,
                                
                            };
                            openBreakContentBackground(settings);
                            
                            // Update timer state to mark break content as opened
                            if (result.timerState) {
                                const updatedState = {
                                    ...result.timerState,
                                    breakContentOpened: true
                                };
                                chrome.storage.local.set({ timerState: updatedState });
                            }
                        });
                    }
                });
            }
            break;
        case 'stopBackgroundTimer':
            stopBackgroundTimer();
            break;
        case 'debugLog':
            // Handle debug logs from popup
            if (request.logEntry) {
                const logEntry = {
                    ...request.logEntry,
                    source: 'popup'
                };
                debugLogs.push(logEntry);
                
                if (debugLogs.length > maxDebugLogs) {
                    debugLogs.shift();
                }
                
                chrome.storage.local.set({ backgroundDebugLogs: debugLogs.slice(-100) });
                console.log(`[SPARK POPUP ${logEntry.level.toUpperCase()}]`, logEntry.message);
            }
            break;
        case 'clearDebugLogs':
            debugLogs = [];
            chrome.storage.local.remove(['backgroundDebugLogs']);
            debugLog('Debug logs cleared', 'info');
            break;
        case 'debugCommand':
            handleDebugCommand(request.command, request);
            break;
        case 'dismissAllNotifications':
            dismissAllNotifications();
            break;
    }
});

// Dismiss all actionable Spark notifications (those we stored metadata for)
async function dismissAllNotifications() {
    try {
        const all = await chrome.storage.local.get(null);
        const notifKeys = Object.keys(all).filter(k => k.startsWith('notification_'));
        let cleared = 0;
        await Promise.all(notifKeys.map(async k => {
            const id = k.replace('notification_', '');
            try {
                const ok = await chrome.notifications.clear(id);
                if (ok) cleared++;
            } catch (e) {}
            chrome.storage.local.remove([k]);
        }));
        debugLog(`dismissAllNotifications cleared=${cleared} trackedKeys=${notifKeys.length}`,'info');
    } catch (e) {
        debugLog(`dismissAllNotifications error: ${e.message}`,'error');
    }
}

// Start background timer using alarms
function startBackgroundTimer(durationMinutes, sessionInfo) {
    debugLog(`Starting background timer for ${durationMinutes} minutes`, 'info');
    
    // Clear any existing alarms
    chrome.alarms.clear('sparkTimer');
    chrome.alarms.clear('sparkTimerCheck');
    chrome.alarms.clear('sparkKeepAlive');
    
    // Create main alarm for timer completion
    chrome.alarms.create('sparkTimer', {
        delayInMinutes: durationMinutes
    });
    
    // Create backup check alarm (1 minute after main alarm)
    chrome.alarms.create('sparkTimerCheck', {
        delayInMinutes: durationMinutes + 1
    });
    
    // Create keep-alive alarms to prevent service worker from sleeping
    // Chrome can put service workers to sleep after 30 seconds of inactivity
    const keepAliveInterval = Math.min(durationMinutes / 4, 5); // Every 1/4 of duration or 5 minutes, whichever is smaller
    
    if (keepAliveInterval > 0.5) { // Only if session is longer than 30 seconds
        chrome.alarms.create('sparkKeepAlive', {
            delayInMinutes: keepAliveInterval,
            periodInMinutes: keepAliveInterval
        });
    }
    
    debugLog(`Background timer set: main=${durationMinutes}min, check=${durationMinutes + 1}min, keepAlive=${keepAliveInterval}min`, 'info');
}

// Stop background timer
function stopBackgroundTimer() {
    debugLog('Stopping background timer', 'info');
    chrome.alarms.clear('sparkTimer');
    chrome.alarms.clear('sparkTimerCheck');
    chrome.alarms.clear('sparkKeepAlive');
}

// Show notification
function showNotification(title, message, sessionType = null) {
    debugLog(`Showing notification: ${title}`, 'info');
    
    // Create notification options
    const notificationOptions = {
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: title,
        message: message,
        priority: 2,
        // Keep notification until user acts for session transitions
        requireInteraction: !!sessionType
    };
    
    // Add action buttons based on session type
    if (sessionType) {
        notificationOptions.buttons = [];
        if (sessionType === 'focus') {
            notificationOptions.buttons.push({
                title: '🌿 Start Break',
                iconUrl: 'icons/icon32.png'
            });
            notificationOptions.buttons.push({
                title: '✖ Dismiss',
                iconUrl: 'icons/icon32.png'
            });
        } else if (sessionType === 'break') {
            notificationOptions.buttons.push({
                title: '⚡ Start Focus',
                iconUrl: 'icons/icon32.png'
            });
            notificationOptions.buttons.push({
                title: '✖ Dismiss',
                iconUrl: 'icons/icon32.png'
            });
        }
    }
    
    // Try to create notification with error handling
    try {
        chrome.notifications.create({
            ...notificationOptions
        }, (notificationId) => {
            if (chrome.runtime.lastError) {
                debugLog(`Notification error: ${chrome.runtime.lastError.message}`, 'error');
                
                // Fallback: try simpler notification without buttons
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icons/icon48.png',
                    title: title,
                    message: message
                });
            } else {
                debugLog(`Notification created successfully: ${notificationId}`, 'info');
                // Store session type for button handling
                if (sessionType) {
                    chrome.storage.local.set({ 
                        [`notification_${notificationId}`]: { sessionType: sessionType }
                    });
                }
                // Manual auto-dismiss fallback only if not actionable
                if (!sessionType) {
                    setTimeout(async () => {
                        try {
                            await chrome.notifications.clear(notificationId);
                            chrome.storage.local.remove([`notification_${notificationId}`]);
                            debugLog(`Notification auto-dismissed: ${notificationId}`,'info');
                        } catch (e) {}
                    }, 12000);
                }
            }
        });
    } catch (error) {
        debugLog(`Notification creation failed: ${error.message}`, 'error');
        console.error('Notification error:', error);
    }
}

// Handle break content opening
async function openBreakContent(type, url) {
    debugLog(`Opening break content: ${type} from ${url}`, 'info');
    
    try {
        let content = '';
        let finalUrl = '';

        switch (type) {
            case 'fact':
                debugLog('Fetching interesting fact (with fallbacks)', 'info');
                const factData = await fetchFact();
                if (factData && factData.text) {
                    content = `Did you know? ${factData.text}`;
                    finalUrl = createContentPage('Interesting Fact', content, '🧠');
                    debugLog('Successfully created fact content page', 'info');
                } else {
                    debugLog('Failed to fetch fact data from all endpoints', 'warn');
                }
                break;

            case 'quote':
                debugLog('Fetching inspirational quote (with fallbacks)', 'info');
                const quoteNorm = await fetchQuote();
                if (quoteNorm && quoteNorm.quoteText) {
                    content = `"${quoteNorm.quoteText}" - ${quoteNorm.quoteAuthor || 'Unknown'}`;
                    finalUrl = createContentPage('Inspirational Quote', content, '💭');
                    debugLog('Successfully created quote content page', 'info');
                } else {
                    debugLog('Failed to fetch quote data from all endpoints', 'warn');
                }
                break;

            case 'website':
                // Open a random website from the curated list
                debugLog('Opening random website', 'info');
                await openRandomWebsiteBackground();
                return; // Return early since openRandomWebsiteBackground handles everything
            

            default:
                // For websites, just open the URL directly
                finalUrl = url;
                debugLog(`Opening website directly: ${url}`, 'info');
                break;
        }

        if (finalUrl) {
            const created = await chrome.tabs.create({ url: finalUrl });
            debugLog('Successfully opened tab with content', 'info');
            // Notify popup (if open) that content was opened
            chrome.runtime.sendMessage({ action: 'breakContentOpened', type, url: finalUrl }).catch(() => {});

            // After opening break content tab, try to re-open popup after a delay
            // This gives Chrome time to open the tab, then we can show the popup again
            setTimeout(() => {
                chrome.action.openPopup().then(() => {
                    debugLog('Popup re-opened after break content tab', 'info');
                }).catch((err) => {
                    debugLog(`Could not re-open popup after break content: ${err.message}`, 'info');
                });
            }, 600); // 600ms delay to let Chrome settle
        } else {
            // No content URL generated (likely API fetch failed) - open fallback website
            debugLog('No content URL generated, opening fallback website', 'warn');
            const created = await chrome.tabs.create({ url: 'https://theuselessweb.com/' });
            debugLog('Opened fallback website', 'info');

            // Notify popup and try to reopen after delay
            chrome.runtime.sendMessage({ action: 'breakContentOpened', type: 'website', url: 'https://theuselessweb.com/' }).catch(() => {});
            setTimeout(() => {
                chrome.action.openPopup().then(() => {
                    debugLog('Popup re-opened after fallback website', 'info');
                }).catch((err) => {
                    debugLog(`Could not re-open popup after fallback: ${err.message}`, 'info');
                });
            }, 600);
        }
    } catch (error) {
        debugLog(`Error opening break content: ${error.message}`, 'error');
        console.error('Error opening break content:', error);
        // Fallback: open a default interesting website
        chrome.tabs.create({ url: 'https://theuselessweb.com/' });
        debugLog('Opened fallback website', 'info');
    }
}

// Generic fetch with timeout, retries & fallback list
async function robustFetchJson(urls, { timeoutMs = 8000, maxRetriesPerUrl = 1 } = {}) {
    if (!Array.isArray(urls)) urls = [urls];
    const errors = [];
    for (const url of urls) {
        for (let attempt = 0; attempt <= maxRetriesPerUrl; attempt++) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeoutMs);
            const started = Date.now();
            try {
                debugLog(`Fetch attempt ${attempt + 1} for ${url}`, 'info');
                const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
                clearTimeout(timer);
                if (!res.ok) {
                    const text = await res.text().catch(() => '');
                    throw new Error(`HTTP ${res.status} ${res.statusText} :: ${text.slice(0,120)}`);
                }
                const json = await res.json();
                debugLog(`Fetched ${url} in ${Date.now() - started}ms`, 'info');
                return { data: json, source: url };
            } catch (e) {
                clearTimeout(timer);
                const aborted = e.name === 'AbortError';
                debugLog(`Fetch failed (${aborted ? 'timeout' : 'error'}) for ${url}: ${e.message}`, 'warn');
                errors.push({ url, attempt, message: e.message });
                // Retry same URL unless last attempt
                if (attempt < maxRetriesPerUrl) continue;
                // Break to next URL after final attempt
                break;
            }
        }
    }
    debugLog(`All fetch attempts failed: ${errors.map(e => e.url + '#' + (e.attempt+1) + ':' + e.message).join(' | ')}`, 'error');
    return null;
}

// Backwards-compatible wrapper for existing calls expecting single URL
async function fetchJsonData(url) {
    const result = await robustFetchJson(url);
    return result ? result.data : null;
}

// Specialized helpers for content types with multiple fallback endpoints
async function fetchFact() {
    // Primary + fallbacks (must also be in host_permissions)
    const endpoints = [
        'https://uselessfacts.jsph.pl/random.json?language=en',
        'https://catfact.ninja/fact'
    ];
    const result = await robustFetchJson(endpoints, { timeoutMs: 7000, maxRetriesPerUrl: 1 });
    if (!result) return null;
    // Normalize to { text }
    const d = result.data;
    if (d && d.text) return { text: d.text };
    if (d && d.fact) return { text: d.fact };
    return null;
}

async function fetchQuote() {
    const endpoints = [
        'https://api.quotegarden.io/api/v3/quotes/random',
        'https://api.quotable.io/random'
    ];
    const result = await robustFetchJson(endpoints, { timeoutMs: 7000, maxRetriesPerUrl: 1 });
    if (!result) return null;
    const d = result.data;
    // QuoteGarden structure
    if (d && Array.isArray(d.data) && d.data[0]) {
        const q = d.data[0];
        return { quoteText: q.quoteText || q.quote || q.quoteText, quoteAuthor: q.quoteAuthor || q.quoteAuthor || q.author };
    }
    // Quotable structure
    if (d && d.content) {
        return { quoteText: d.content, quoteAuthor: d.author || 'Unknown' };
    }
    return null;
}

// Create a content page for break content
function createContentPage(title, content, emoji, isHtml = false) {
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title} - Spark</title>
        <style>
            * { margin:0; padding:0; box-sizing:border-box; }
            body {
                font-family: system-ui, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: #f2f5f9;
                min-height: 100vh;
                display:flex;
                align-items:center;
                justify-content:center;
                padding:32px 20px;
                color:#222;
                line-height:1.5;
            }
            .container {
                max-width:860px;
                background:#fff;
                border-radius:24px;
                padding:48px 44px;
                text-align:center;
                box-shadow:0 4px 12px rgba(0,0,0,0.06), 0 20px 40px -8px rgba(0,0,0,0.08);
                border:1px solid #e3e8ef;
            }
            .header { margin-bottom:28px; }
            .emoji { font-size:56px; margin-bottom:12px; display:block; }
            .title { font-size:30px; font-weight:600; margin-bottom:6px; color:#111; letter-spacing:-0.5px; }
            .subtitle { font-size:15px; color:#555; margin-bottom:32px; }
            .content {
                font-size:18px;
                text-align:left;
                margin:0 auto 34px;
                max-width:680px;
                ${isHtml ? '' : 'background:#f8fafc; padding:26px 28px; border-radius:14px; border-left:5px solid #667eea;'}
                color:#222;
            }
            .content p { margin-bottom:1em; }
            .content p:last-child { margin-bottom:0; }
            .timer-info {
                font-size:13px;
                color:#555;
                margin-top:34px;
                padding-top:22px;
                border-top:1px solid #e5e9ef;
            }
            .close-btn {
                background:#667eea;
                border:1px solid #546adf;
                border-radius:14px;
                padding:14px 26px;
                color:#fff;
                font-size:15px;
                font-weight:600;
                cursor:pointer;
                letter-spacing:.3px;
                transition:background .18s ease, transform .18s ease, box-shadow .18s ease;
                margin-top:10px;
                box-shadow:0 2px 4px rgba(0,0,0,0.08), 0 6px 18px -6px rgba(102,126,234,0.45);
            }
            .close-btn:hover { background:#546adf; transform:translateY(-2px); }
            .close-btn:active { transform:translateY(0); }
            img { max-width:100%; height:auto; border-radius:16px; margin:24px 0; box-shadow:0 4px 16px -4px rgba(0,0,0,0.18); }
            @media (max-width:680px){
                .container { padding:40px 28px; }
                .title { font-size:26px; }
                .content { font-size:17px; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <span class="emoji">${emoji}</span>
                <h1 class="title">${title}</h1>
                <p class="subtitle">Take a moment to explore and recharge</p>
            </div>
            
            <div class="content">
                ${isHtml ? content : `<p>${content}</p>`}
            </div>
            
            <div class="timer-info">
                <p>⚡ Brought to you by Spark</p>
                <p>Close this tab when you're ready to get back to work!</p>
                <button class="close-btn" onclick="window.close()">Close</button>
            </div>
        </div>
        
        <script>
            // Auto-close after 5 minutes if user doesn't interact
            setTimeout(() => {
                if (confirm('Break time is over! Ready to spark some productivity?')) {
                    window.close();
                }
            }, 300000); // 5 minutes
        </script>
    </body>
    </html>
    `;
    // In extension MV3 service worker context URL.createObjectURL may be unavailable.
    try {
        if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
            const blob = new Blob([html], { type: 'text/html' });
            return URL.createObjectURL(blob);
        }
        debugLog('URL.createObjectURL not available; falling back to data URL', 'warn');
    } catch (e) {
        debugLog(`createObjectURL failed: ${e.message}; using data URL fallback`, 'warn');
    }
    // Fallback: data URL (encode to preserve characters)
    return 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
}

// Handle alarms (for notifications when popup is closed)
chrome.alarms.onAlarm.addListener(async (alarm) => {
    debugLog(`Alarm triggered: ${alarm.name}`, 'info');
    
    // Ensure service worker stays active during alarm handling
    keepServiceWorkerAlive();
    
    if (alarm.name === 'sparkTimer') {
        await handleTimerComplete();
    } else if (alarm.name === 'sparkTimerCheck') {
        // Fallback alarm to check timer state
        debugLog('Fallback timer check triggered', 'info');
        await checkTimerState();
    } else if (alarm.name === 'sparkKeepAlive') {
        // Keep-alive alarm to prevent service worker from sleeping
        debugLog('Keep-alive alarm triggered', 'info');
        await checkTimerState();
    }
});

// Keep service worker alive and check timer state
async function checkTimerState() {
    try {
        const result = await chrome.storage.local.get(['timerState']);
        
        if (result.timerState && result.timerState.isRunning) {
            const now = Date.now();
            const startTime = result.timerState.sessionStartTime || result.timerState.startTime;
            const elapsed = Math.floor((now - startTime) / 1000);
            const timeLeft = Math.max(0, result.timerState.totalTime - elapsed);
            
            if (timeLeft <= 0) {
                // Timer should have completed
                debugLog('Timer found to be completed during check', 'info');
                await handleTimerComplete();
            } else {
                debugLog(`Timer still running: ${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')} remaining`, 'info');
                
                // Set up next keep-alive if needed
                const nextCheckMinutes = Math.min(Math.ceil(timeLeft / 60), 5); // Check every 5 minutes max
                chrome.alarms.create('sparkKeepAlive', {
                    delayInMinutes: nextCheckMinutes
                });
            }
        }
    } catch (error) {
        debugLog(`Error checking timer state: ${error.message}`, 'error');
    }
}

// Keep service worker alive during critical operations
function keepServiceWorkerAlive() {
    // This function helps ensure the service worker doesn't sleep during alarm handling
    const wakeLock = setInterval(() => {
        // Small storage operation to keep worker active
        chrome.storage.local.get('keepAlive');
    }, 1000);
    
    // Clear after 30 seconds
    setTimeout(() => {
        clearInterval(wakeLock);
    }, 30000);
}

// Handle timer completion in background
async function handleTimerComplete() {
    debugLog('Timer completed in background', 'info');
    
    try {
        // Get current timer state and settings
        const result = await chrome.storage.local.get(['timerState']);
        const settingsResult = await chrome.storage.sync.get(['settings']);
        
        if (!result.timerState || !result.timerState.isRunning) {
            debugLog('No active timer found', 'warn');
            return;
        }
        
        const timerState = result.timerState;
        const settings = settingsResult.settings || {
            focusDuration: 25,
            shortBreak: 5,
            longBreak: 30,
            enableNotifications: true,
            enableFacts: true,
            enableQuotes: true,
            enableWebsites: true,
            
        };
        
        debugLog(`Completing ${timerState.currentSession} session`, 'info');
        
        // Show completion notification
        if (settings.enableNotifications) {
            if (timerState.currentSession === 'focus') {
                showNotification('⚡ Focus Session Complete!', 'Great work! Click the extension to start your break when ready.', 'focus');
            } else {
                showNotification('⏰ Break Time Over!', 'Ready to focus again? Let\'s spark some productivity!', 'break');
            }
        }
        
        // Update stats
        await updateBackgroundStats(timerState, settings);
        
        // Determine next session
        let nextSession, nextDuration, sessionCount = timerState.sessionCount;
        
        if (timerState.currentSession === 'focus') {
            sessionCount++;
            
            if (sessionCount % 4 === 0) {
                nextSession = 'longBreak';
                nextDuration = settings.longBreak;
                debugLog('Focus session complete - ready for long break', 'info');
            } else {
                nextSession = 'shortBreak';
                nextDuration = settings.shortBreak;
                debugLog('Focus session complete - ready for short break', 'info');
            }
            
            // Don't automatically open break content when focus session ends
            // User needs to manually start the break session
        } else {
            nextSession = 'focus';
            nextDuration = settings.focusDuration;
            debugLog('Break complete - ready for focus session', 'info');
        }
        
        // Update timer state for next session (but don't start automatically)
        const newTimerState = {
            isRunning: false,
            currentSession: nextSession,
            sessionCount: sessionCount,
            timeLeft: nextDuration * 60,
            totalTime: nextDuration * 60,
            sessionStartTime: null,
            breakContentOpened: false
        };
        
        await chrome.storage.local.set({ timerState: newTimerState });
        debugLog(`Timer state updated for next ${nextSession} session`, 'info');
        
        // Clear any existing alarms
        chrome.alarms.clear('sparkTimer');
        
    } catch (error) {
        debugLog(`Error handling timer completion: ${error.message}`, 'error');
        console.error('Error handling timer completion:', error);
    }
}

// Update stats in background
async function updateBackgroundStats(timerState, settings) {
    const today = new Date().toDateString();
    const result = await chrome.storage.local.get(['stats']);
    
    let stats = {
        date: today,
        completedSessions: 0,
        totalFocusTime: 0,
        currentStreak: 0,
        lastSessionDate: null
    };

    if (result.stats && result.stats.date === today) {
        stats = result.stats;
    }

    if (timerState.currentSession === 'focus') {
        stats.completedSessions++;
        stats.totalFocusTime += settings.focusDuration;
        
        // Focus streak is simply the number of completed focus sessions today
        stats.currentStreak = stats.completedSessions;

        stats.lastSessionDate = today;
        
        debugLog(`Stats updated: ${stats.completedSessions} sessions, ${stats.totalFocusTime} minutes`, 'info');
    }

    await chrome.storage.local.set({ stats });
}

// Open break content in background
async function openBreakContentBackground(settings) {
    const enabledTypes = [];
    if (settings.enableFacts) enabledTypes.push('fact');
    if (settings.enableQuotes) enabledTypes.push('quote');
    if (settings.enableWebsites) enabledTypes.push('website');
    

    if (enabledTypes.length === 0) {
        debugLog('No break content types enabled', 'warn');
        return;
    }

    const randomType = enabledTypes[Math.floor(Math.random() * enabledTypes.length)];
    debugLog(`Opening break content: ${randomType}`, 'info');
    
    try {
        if (randomType === 'website') {
            await openRandomWebsiteBackground();
            return;
        }
        // For fact/quote pass placeholder (unused) URL for backwards compatibility
        await openBreakContent(randomType, '');
    } catch (error) {
        debugLog(`Failed to open break content: ${error.message}`, 'error');
    }
}

// Open random website in background
async function openRandomWebsiteBackground() {
    const websites = [
        'https://theuselessweb.com/',
        'https://www.boredpanda.com/',
        'https://www.mentalfloss.com/',
        'https://www.atlasobscura.com/',
        'https://99percentinvisible.org/',
        'https://www.reddit.com/r/todayilearned/',
        'https://www.reddit.com/r/interestingasfuck/',
        'https://www.ted.com/talks',
        'https://www.nationalgeographic.com/photography/',
        'https://pudding.cool/'
    ];
    
    const randomSite = websites[Math.floor(Math.random() * websites.length)];
    try {
        await chrome.tabs.create({ url: randomSite });
        debugLog(`Opened random website: ${randomSite}`, 'info');
        
        // Try to re-open popup after opening website
        setTimeout(() => {
            chrome.action.openPopup().then(() => {
                debugLog('Popup re-opened after website tab', 'info');
            }).catch((err) => {
                debugLog(`Could not re-open popup after website: ${err.message}`, 'info');
            });
        }, 600);
    } catch (e) {
        debugLog(`Failed to open random website: ${e.message}`, 'error');
    }
}

// Cleanup object URLs periodically to prevent memory leaks
setInterval(() => {
    // This is a basic cleanup - in a real extension you'd track created URLs
    debugLog('Performing periodic cleanup', 'info');
}, 600000); // 10 minutes

// Load existing debug logs on startup
chrome.storage.local.get(['backgroundDebugLogs'], (result) => {
    if (result.backgroundDebugLogs) {
        debugLogs = result.backgroundDebugLogs;
        debugLog('Loaded existing debug logs from storage', 'info');
    }
});

// Handle notification clicks
chrome.notifications.onClicked.addListener((notificationId) => {
    debugLog(`Notification clicked: ${notificationId}`, 'info');
    // Body click: if this notification represented a completed focus session,
    // treat body click as implicit "start break" to give user faster flow.
    chrome.storage.local.get([`notification_${notificationId}`]).then(async store => {
        const data = store[`notification_${notificationId}`];
        if (data && data.sessionType === 'focus') {
            debugLog('Body click on focus-complete notification -> starting break automatically', 'info');
            await handleSessionStartFromNotification('break', notificationId);
        } else {
            debugLog('Body click on non-focus or missing data notification -> dismissing', 'info');
            chrome.notifications.clear(notificationId);
            chrome.storage.local.remove([`notification_${notificationId}`]);
        }
    }).catch(() => {
        chrome.notifications.clear(notificationId);
        chrome.storage.local.remove([`notification_${notificationId}`]);
    });
});

// Handle notification button clicks
chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
    debugLog(`Notification button clicked: ${notificationId}, button: ${buttonIndex}`, 'info');
    
    try {
        // Get the stored notification data
        const result = await chrome.storage.local.get([`notification_${notificationId}`]);
        const notificationData = result[`notification_${notificationId}`];
        
        if (!notificationData) {
            debugLog('No notification data found', 'warn');
            return;
        }
        
        const { sessionType } = notificationData;
        
        // Handle button clicks based on session type and button index
        if (sessionType === 'focus' && buttonIndex === 0) {
            // Start break button clicked
            debugLog('Starting break session from notification (button path)', 'info');
            await handleSessionStartFromNotification('break', notificationId);
        } else if (sessionType === 'break' && buttonIndex === 0) {
            // Start focus button clicked
            debugLog('Starting focus session from notification (button path)', 'info');
            await handleSessionStartFromNotification('focus', notificationId);
        } else if (buttonIndex === 1) {
            // Dismiss button
            debugLog('Dismiss button clicked', 'info');
            chrome.notifications.clear(notificationId);
            chrome.storage.local.remove([`notification_${notificationId}`]);
        }
        
    } catch (error) {
        debugLog(`Error handling button click: ${error.message}`, 'error');
        // Clean up on error
        chrome.notifications.clear(notificationId);
        chrome.storage.local.remove([`notification_${notificationId}`]);
    }
});

// Handle session start from notification with popup detection
async function handleSessionStartFromNotification(sessionType, notificationId) {
    try {
    // Keep SW alive during potentially longer async logic
    keepServiceWorkerAlive();
    debugLog(`handleSessionStartFromNotification invoked for ${sessionType}`, 'info');
        // Try to send a message to check if popup is open
        let popupIsOpen = false;
        
        try {
            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    action: 'checkIfPopupOpen'
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve(response);
                    }
                });
                
                // Timeout after 100ms if no response (popup likely not open)
                setTimeout(() => reject(new Error('Timeout')), 100);
            });
            
            if (response && response.popupOpen) {
                popupIsOpen = true;
                debugLog('Popup is open, starting session in current popup', 'info');
            }
        } catch (error) {
            popupIsOpen = false;
            debugLog('Popup is not open, will open popup and start session', 'info');
        }
        
    if (popupIsOpen) {
            // Popup is open - start session in background to ensure break content opens reliably
            debugLog('Starting session in background (popup is open and will auto-refresh)', 'info');

            // Start the session in background (this guarantees break content opens)
            await startNextSessionFromNotification(sessionType);

            // Notify popup to refresh its state
            chrome.runtime.sendMessage({
                action: 'sessionStartedFromNotification',
                sessionType: sessionType
            }).catch(() => {
                debugLog('Could not notify popup of session start (popup may have closed)', 'info');
            });

            // Clear notification
            chrome.notifications.clear(notificationId);
            chrome.storage.local.remove([`notification_${notificationId}`]);

    } else {
            // Popup is not open - start session in background to guarantee it works
            debugLog('Starting session fully in background (popup closed)', 'info');

            // Start the session in background first (this ensures break content opens reliably)
            await startNextSessionFromNotification(sessionType);

            // Then open popup to show the running session
            setTimeout(() => {
                chrome.action.openPopup().then(() => {
                    debugLog('Popup opened to show running session', 'info');
                }).catch((error) => {
                    debugLog(`Could not open popup after starting session: ${error.message}`, 'warn');
                });
            }, 200);

            // Clear notification after a brief delay
            setTimeout(() => {
                chrome.notifications.clear(notificationId);
                chrome.storage.local.remove([`notification_${notificationId}`]);
            }, 400);
        }
        
    } catch (error) {
        debugLog(`Error handling session start from notification: ${error.message}`, 'error');
        // Fallback: clear notification
        chrome.notifications.clear(notificationId);
        chrome.storage.local.remove([`notification_${notificationId}`]);
    }
}

// Start next session from notification button
async function startNextSessionFromNotification(sessionType) {
    try {
    debugLog(`startNextSessionFromNotification: requested ${sessionType}`, 'info');
        // Get current timer state
        const result = await chrome.storage.local.get(['timerState']);
        
        if (!result.timerState) {
            debugLog('No timer state found for notification action (cannot start)', 'warn');
            return;
        }
        
        const timerState = result.timerState;
        
        // Determine session duration and actual session type
        const settingsResult = await chrome.storage.sync.get(['settings']);
        const settings = settingsResult.settings || {
            focusDuration: 25,
            shortBreak: 5,
            longBreak: 30,
            enableFacts: true,
            enableQuotes: true,
            enableWebsites: true
        };
        
        let duration;
        let actualSessionType;
        
    if (sessionType === 'focus') {
            // If a break is currently running and user chose to start focus early, terminate break early
            if ((timerState.currentSession === 'shortBreak' || timerState.currentSession === 'longBreak') && timerState.isRunning) {
                debugLog('Early break termination requested - starting focus immediately', 'info');
            }
            actualSessionType = 'focus';
            duration = settings.focusDuration;
        } else {
            // For break start we expect timerState.currentSession to already be shortBreak or longBreak
            // If it's still 'focus', it means the completion handler didn't persist idle state yet.
            if (timerState.currentSession === 'focus') {
                // Derive which break should come next based on sessionCount + 1 (focus just finished)
                const nextCount = timerState.sessionCount + 1;
                if (nextCount % 4 === 0) {
                    actualSessionType = 'longBreak';
                    duration = settings.longBreak;
                    debugLog('Derived longBreak session (fallback) because state still showed focus', 'warn');
                } else {
                    actualSessionType = 'shortBreak';
                    duration = settings.shortBreak;
                    debugLog('Derived shortBreak session (fallback) because state still showed focus', 'warn');
                }
            } else {
                actualSessionType = timerState.currentSession; // shortBreak or longBreak
                if (timerState.currentSession === 'longBreak') {
                    duration = settings.longBreak;
                } else {
                    duration = settings.shortBreak;
                }
            }
        }
        
        // Update timer state to running (if we terminated a running break early we still keep sessionCount unchanged)
        const newTimerState = {
            isRunning: true,
            currentSession: actualSessionType,
            sessionCount: timerState.sessionCount,
            timeLeft: duration * 60,
            totalTime: duration * 60,
            sessionStartTime: Date.now(),
            breakContentOpened: false
        };
        
        // Save the new timer state first
        await chrome.storage.local.set({ timerState: newTimerState });
        debugLog(`Timer state saved: ${actualSessionType}, running: true`, 'info');
        
        // Start background timer
        startBackgroundTimer(duration, {
            type: actualSessionType,
            sessionCount: timerState.sessionCount
        });
        
        // If starting a break session, open break content and update state
        if (sessionType === 'break') {
            if (!newTimerState.breakContentOpened) {
                debugLog('Attempting to open break content (notification path)', 'info');
                let opened = false;
                try {
                    await openBreakContentBackground(settings);
                    opened = true;
                } catch (e) {
                    debugLog(`Primary break content open failed: ${e.message}`, 'error');
                }
                if (!opened) {
                    // Guarantee some content opens
                    try {
                        debugLog('Opening fallback random website (notification path)', 'warn');
                        await openRandomWebsiteBackground();
                        opened = true;
                    } catch (e2) {
                        debugLog(`Fallback website open failed: ${e2.message}`, 'error');
                    }
                }
                if (opened) {
                    newTimerState.breakContentOpened = true;
                    await chrome.storage.local.set({ timerState: newTimerState });
                    debugLog('Break content opened and state updated (notification path)', 'info');
                } else {
                    debugLog('Unable to open any break content after all attempts', 'error');
                }
            } else {
                debugLog('Break content already marked opened, skipping (notification path)', 'info');
            }
        }
        
    debugLog(`Started ${actualSessionType} session from notification (${duration} minutes). breakContentOpened=${newTimerState.breakContentOpened}`, 'info');
        
        // Notify any open popup that the session has started
        chrome.runtime.sendMessage({
            action: 'sessionStartedFromNotification',
            sessionType: actualSessionType,
            timeLeft: duration * 60
        }).catch(() => {
            // Popup might not be open, which is fine
            debugLog('No popup to notify about session start', 'info');
        });
        
    } catch (error) {
        debugLog(`Error starting session from notification: ${error.message}`, 'error');
    }
}

// Handle notification close
chrome.notifications.onClosed.addListener((notificationId, byUser) => {
    debugLog(`Notification closed: ${notificationId}, by user: ${byUser}`, 'info');
    
    // Clean up stored notification data when notification is closed
    chrome.storage.local.remove([`notification_${notificationId}`]);
});

// Handle debug commands
function handleDebugCommand(command, request) {
    debugLog(`Handling debug command: ${command}`, 'info');
    
    switch (command) {
        case 'testBreakContent':
            testBreakContent(request.contentType);
            break;
        case 'simulateNotification':
            showNotification('🧪 Debug Test', 'This is a simulated notification for testing purposes');
            break;
        case 'exportLogs':
            exportDebugLogs();
            break;
        default:
            debugLog(`Unknown debug command: ${command}`, 'warn');
    }
}

// Test break content functionality
function testBreakContent(contentType = null) {
    const types = ['fact', 'quote', 'website'];
    const testType = contentType || types[Math.floor(Math.random() * types.length)];
    
    debugLog(`Testing break content type: ${testType}`, 'info');
    
    // For website still pass a URL; for fact/quote URL ignored
    const url = testType === 'website' ? 'https://theuselessweb.com/' : '';
    openBreakContent(testType, url);
}

// Export debug logs for analysis
function exportDebugLogs() {
    debugLog('Exporting debug logs for analysis', 'info');
    
    const exportData = {
        timestamp: new Date().toISOString(),
        totalLogs: debugLogs.length,
        logs: debugLogs
    };
    
    // Create a data URL with the logs
    const logData = JSON.stringify(exportData, null, 2);
    let url;
    try {
        if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
            const blob = new Blob([logData], { type: 'application/json' });
            url = URL.createObjectURL(blob);
        } else {
            debugLog('URL.createObjectURL not available for logs; using data URL', 'warn');
        }
    } catch (e) {
        debugLog(`createObjectURL failed for logs: ${e.message}; using data URL`, 'warn');
    }
    if (!url) {
        url = 'data:application/json;charset=utf-8,' + encodeURIComponent(logData);
    }
    
    // Open in a new tab for download
    chrome.tabs.create({ 
        url: url,
        active: false 
    });
    
    debugLog('Debug logs exported to new tab', 'info');
}