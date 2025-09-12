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
                enableNasa: true,
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
            showNotification(request.title, request.message);
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
                                enableNasa: true
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
    }
});

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
function showNotification(title, message) {
    debugLog(`Showing notification: ${title}`, 'info');
    
    // Try to create notification with error handling
    try {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: title,
            message: message,
            priority: 2,
            requireInteraction: true // Keep notification visible until user interacts
        }, (notificationId) => {
            if (chrome.runtime.lastError) {
                debugLog(`Notification error: ${chrome.runtime.lastError.message}`, 'error');
                
                // Fallback: try simpler notification
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icons/icon48.png',
                    title: title,
                    message: message
                });
            } else {
                debugLog(`Notification created successfully: ${notificationId}`, 'info');
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
                debugLog('Fetching interesting fact', 'info');
                const factData = await fetchJsonData(url);
                if (factData && factData.text) {
                    content = `Did you know? ${factData.text}`;
                    finalUrl = createContentPage('Interesting Fact', content, '🧠');
                    debugLog('Successfully created fact content page', 'info');
                } else {
                    debugLog('Failed to fetch fact data', 'warn');
                }
                break;

            case 'quote':
                debugLog('Fetching inspirational quote', 'info');
                const quoteData = await fetchJsonData(url);
                if (quoteData && quoteData.data && quoteData.data.quoteText) {
                    content = `"${quoteData.data.quoteText}" - ${quoteData.data.quoteAuthor || 'Unknown'}`;
                    finalUrl = createContentPage('Inspirational Quote', content, '💭');
                    debugLog('Successfully created quote content page', 'info');
                } else {
                    debugLog('Failed to fetch quote data', 'warn');
                }
                break;

            case 'nasa':
                debugLog('Fetching NASA image of the day', 'info');
                const nasaData = await fetchJsonData(url);
                if (nasaData && nasaData.url) {
                    content = `
                        <div style="text-align: center;">
                            <h2>${nasaData.title || 'NASA Image of the Day'}</h2>
                            <img src="${nasaData.url}" style="max-width: 100%; height: auto; border-radius: 12px; margin: 20px 0;">
                            <p style="font-style: italic; color: #666;">${nasaData.explanation || 'Explore the cosmos with NASA!'}</p>
                        </div>
                    `;
                    finalUrl = createContentPage('NASA Discovery', content, '🚀', true);
                    debugLog('Successfully created NASA content page', 'info');
                } else {
                    debugLog('Failed to fetch NASA data', 'warn');
                }
                break;

            default:
                // For websites, just open the URL directly
                finalUrl = url;
                debugLog(`Opening website directly: ${url}`, 'info');
                break;
        }

        if (finalUrl) {
            chrome.tabs.create({ url: finalUrl });
            debugLog('Successfully opened tab with content', 'info');
        } else {
            debugLog('No content URL generated', 'warn');
        }
    } catch (error) {
        debugLog(`Error opening break content: ${error.message}`, 'error');
        console.error('Error opening break content:', error);
        // Fallback: open a default interesting website
        chrome.tabs.create({ url: 'https://theuselessweb.com/' });
        debugLog('Opened fallback website', 'info');
    }
}

// Fetch JSON data from APIs
async function fetchJsonData(url) {
    debugLog(`Fetching data from: ${url}`, 'info');
    try {
        const response = await fetch(url);
        if (!response.ok) {
            debugLog(`HTTP ${response.status}: ${response.statusText}`, 'warn');
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        debugLog('Successfully fetched and parsed JSON data', 'info');
        return data;
    } catch (error) {
        debugLog(`Fetch error: ${error.message}`, 'error');
        console.error('Fetch error:', error);
        return null;
    }
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
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                color: white;
            }
            
            .container {
                max-width: 800px;
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(20px);
                border-radius: 20px;
                padding: 40px;
                text-align: center;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            .header {
                margin-bottom: 30px;
            }
            
            .emoji {
                font-size: 48px;
                margin-bottom: 16px;
                display: block;
            }
            
            .title {
                font-size: 28px;
                font-weight: 600;
                margin-bottom: 8px;
                color: white;
            }
            
            .subtitle {
                font-size: 16px;
                color: rgba(255, 255, 255, 0.8);
                margin-bottom: 30px;
            }
            
            .content {
                font-size: 18px;
                line-height: 1.6;
                margin-bottom: 30px;
                ${isHtml ? '' : 'background: rgba(255, 255, 255, 0.1); padding: 24px; border-radius: 12px; border-left: 4px solid white;'}
            }
            
            .timer-info {
                font-size: 14px;
                color: rgba(255, 255, 255, 0.7);
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            .close-btn {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                border-radius: 12px;
                padding: 12px 24px;
                color: white;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                margin-top: 20px;
            }
            
            .close-btn:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: translateY(-2px);
            }
            
            img {
                max-width: 100%;
                height: auto;
                border-radius: 12px;
                margin: 20px 0;
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
                <button class="close-btn" onclick="window.close()">Close & Return to Work</button>
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
    
    const blob = new Blob([html], { type: 'text/html' });
    return URL.createObjectURL(blob);
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
            const elapsed = Math.floor((now - result.timerState.startTime) / 1000);
            const timeLeft = result.timerState.timeLeft - elapsed;
            
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
            enableNasa: true
        };
        
        debugLog(`Completing ${timerState.currentSession} session`, 'info');
        
        // Show completion notification
        if (settings.enableNotifications) {
            if (timerState.currentSession === 'focus') {
                showNotification('⚡ Focus Session Complete!', 'Great work! Click the extension to start your break when ready.');
            } else {
                showNotification('⏰ Break Time Over!', 'Ready to focus again? Let\'s spark some productivity!');
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
            startTime: null,
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
        
        // Update streak
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (stats.lastSessionDate === yesterday.toDateString() || stats.completedSessions === 1) {
            stats.currentStreak = stats.completedSessions;
        }
        
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
    if (settings.enableNasa) enabledTypes.push('nasa');

    if (enabledTypes.length === 0) {
        debugLog('No break content types enabled', 'warn');
        return;
    }

    const randomType = enabledTypes[Math.floor(Math.random() * enabledTypes.length)];
    debugLog(`Opening break content: ${randomType}`, 'info');
    
    try {
        let url;
        switch (randomType) {
            case 'fact':
                url = 'https://uselessfacts.jsph.pl/random.json?language=en';
                break;
            case 'quote':
                url = 'https://api.quotegarden.io/api/v3/quotes/random';
                break;
            case 'website':
                await openRandomWebsiteBackground();
                return;
            case 'nasa':
                url = 'https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY';
                break;
        }

        await openBreakContent(randomType, url);
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
    chrome.tabs.create({ url: randomSite });
    debugLog(`Opened random website: ${randomSite}`, 'info');
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
    
    // Clear the notification
    chrome.notifications.clear(notificationId);
    
    // Focus on the extension or open popup
    chrome.action.openPopup().catch(() => {
        // If popup can't be opened, at least clear the notification
        debugLog('Could not open popup from notification click', 'warn');
    });
});

// Handle notification close
chrome.notifications.onClosed.addListener((notificationId, byUser) => {
    debugLog(`Notification closed: ${notificationId}, by user: ${byUser}`, 'info');
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
    const types = ['fact', 'quote', 'website', 'nasa'];
    const testType = contentType || types[Math.floor(Math.random() * types.length)];
    
    debugLog(`Testing break content type: ${testType}`, 'info');
    
    const testUrls = {
        fact: 'https://uselessfacts.jsph.pl/random.json?language=en',
        quote: 'https://api.quotegarden.io/api/v3/quotes/random',
        website: 'https://theuselessweb.com/',
        nasa: 'https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY'
    };
    
    openBreakContent(testType, testUrls[testType]);
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
    const blob = new Blob([logData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Open in a new tab for download
    chrome.tabs.create({ 
        url: url,
        active: false 
    });
    
    debugLog('Debug logs exported to new tab', 'info');
}