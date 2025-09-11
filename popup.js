class SparkTimer {
    constructor() {
        this.isRunning = false;
        this.isPaused = false;
        this.currentSession = 'focus'; // 'focus', 'shortBreak', 'longBreak'
        this.sessionCount = 0;
        this.timeLeft = 0;
        this.totalTime = 0;
        this.interval = null;
        
        // Settings
        this.settings = {
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

        // Debug system
        this.debugLogs = [];
        this.maxDebugLogs = 100;

        this.breakContentTypes = [
            'Interesting Fact',
            'Inspirational Quote',
            'Cool Website',
            'NASA Image of the Day',
            'Life Advice',
            'Random Discovery'
        ];

        this.init();
    }

    async init() {
        await this.loadSettings();
        await this.loadStats();
        await this.loadDebugLogs();
        this.setupEventListeners();
        this.updateDisplay();
        this.updateBreakPreview();
        this.setupSettingsPanel();
        this.updateDebugVisibility();
        this.debug('Spark Timer initialized', 'info');
    }

    async loadSettings() {
        const result = await chrome.storage.sync.get(['settings']);
        if (result.settings) {
            this.settings = { ...this.settings, ...result.settings };
        }
    }

    async saveSettings() {
        await chrome.storage.sync.set({ settings: this.settings });
    }

    async loadStats() {
        const result = await chrome.storage.local.get(['stats', 'timerState']);
        
        // Load stats
        if (result.stats) {
            const today = new Date().toDateString();
            if (result.stats.date === today) {
                this.updateStatsDisplay(result.stats);
            }
        }

        // Restore timer state if running
        if (result.timerState && result.timerState.isRunning) {
            this.restoreTimerState(result.timerState);
        }
    }

    async restoreTimerState(state) {
        const now = Date.now();
        const elapsed = Math.floor((now - state.startTime) / 1000);
        
        this.currentSession = state.currentSession;
        this.sessionCount = state.sessionCount;
        this.timeLeft = Math.max(0, state.timeLeft - elapsed);
        this.totalTime = state.totalTime;
        
        if (this.timeLeft > 0) {
            this.isRunning = true;
            this.startTimer();
        } else {
            // Timer finished while popup was closed
            this.handleSessionComplete();
        }
    }

    setupEventListeners() {
        document.getElementById('startBtn').addEventListener('click', () => this.startSession());
        document.getElementById('pauseBtn').addEventListener('click', () => this.pauseSession());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetSession());
        document.getElementById('settingsBtn').addEventListener('click', () => this.showSettings());
        document.getElementById('closeSettings').addEventListener('click', () => this.hideSettings());
        document.getElementById('debugBtn').addEventListener('click', () => this.showDebugConsole());
        document.getElementById('closeDebug').addEventListener('click', () => this.hideDebugConsole());
        document.getElementById('clearLogs').addEventListener('click', () => this.clearDebugLogs());
        document.getElementById('exportLogs').addEventListener('click', () => this.exportDebugLogs());
    }

    setupSettingsPanel() {
        const elements = {
            focusDuration: document.getElementById('focusDuration'),
            shortBreak: document.getElementById('shortBreak'),
            longBreak: document.getElementById('longBreak'),
            enableNotifications: document.getElementById('enableNotifications'),
            enableFacts: document.getElementById('enableFacts'),
            enableQuotes: document.getElementById('enableQuotes'),
            enableWebsites: document.getElementById('enableWebsites'),
            enableNasa: document.getElementById('enableNasa'),
            enableDebugMode: document.getElementById('enableDebugMode')
        };

        // Set initial values
        elements.focusDuration.value = this.settings.focusDuration;
        elements.shortBreak.value = this.settings.shortBreak;
        elements.longBreak.value = this.settings.longBreak;
        elements.enableNotifications.checked = this.settings.enableNotifications;
        elements.enableFacts.checked = this.settings.enableFacts;
        elements.enableQuotes.checked = this.settings.enableQuotes;
        elements.enableWebsites.checked = this.settings.enableWebsites;
        elements.enableNasa.checked = this.settings.enableNasa;
        elements.enableDebugMode.checked = this.settings.enableDebugMode;

        // Update display values
        document.getElementById('focusValue').textContent = this.settings.focusDuration;
        document.getElementById('shortBreakValue').textContent = this.settings.shortBreak;
        document.getElementById('longBreakValue').textContent = this.settings.longBreak;

        // Add event listeners
        elements.focusDuration.addEventListener('input', (e) => {
            this.settings.focusDuration = parseInt(e.target.value);
            document.getElementById('focusValue').textContent = e.target.value;
            this.saveSettings();
        });

        elements.shortBreak.addEventListener('input', (e) => {
            this.settings.shortBreak = parseInt(e.target.value);
            document.getElementById('shortBreakValue').textContent = e.target.value;
            this.saveSettings();
        });

        elements.longBreak.addEventListener('input', (e) => {
            this.settings.longBreak = parseInt(e.target.value);
            document.getElementById('longBreakValue').textContent = e.target.value;
            this.saveSettings();
        });

        // Checkbox listeners
        Object.keys(elements).forEach(key => {
            if (elements[key].type === 'checkbox') {
                elements[key].addEventListener('change', (e) => {
                    this.settings[key] = e.target.checked;
                    this.saveSettings();
                    this.updateBreakPreview();
                    
                    // Handle debug mode toggle
                    if (key === 'enableDebugMode') {
                        this.updateDebugVisibility();
                    }
                });
            }
        });
    }

    showSettings() {
        document.getElementById('settingsPanel').style.display = 'block';
    }

    hideSettings() {
        document.getElementById('settingsPanel').style.display = 'none';
    }

    startSession() {
        if (this.isPaused) {
            this.isPaused = false;
            this.debug('Timer resumed', 'info');
        } else {
            // Start new session
            this.timeLeft = this.getCurrentSessionDuration() * 60;
            this.totalTime = this.timeLeft;
            this.debug(`Starting ${this.currentSession} session (${this.getCurrentSessionDuration()} minutes)`, 'info');
        }
        
        this.isRunning = true;
        this.startTimer();
        this.updateControls();
        this.saveTimerState();
    }

    pauseSession() {
        this.isPaused = true;
        this.isRunning = false;
        clearInterval(this.interval);
        this.updateControls();
        this.clearTimerState();
        this.debug('Timer paused', 'info');
    }

    resetSession() {
        this.isRunning = false;
        this.isPaused = false;
        clearInterval(this.interval);
        
        if (this.currentSession === 'focus') {
            this.timeLeft = this.settings.focusDuration * 60;
        } else if (this.currentSession === 'shortBreak') {
            this.timeLeft = this.settings.shortBreak * 60;
        } else {
            this.timeLeft = this.settings.longBreak * 60;
        }
        
        this.totalTime = this.timeLeft;
        this.updateDisplay();
        this.updateControls();
        this.clearTimerState();
        this.debug(`Timer reset for ${this.currentSession} session`, 'info');
    }

    startTimer() {
        this.interval = setInterval(() => {
            this.timeLeft--;
            this.updateDisplay();
            this.saveTimerState();

            if (this.timeLeft <= 0) {
                this.handleSessionComplete();
            }
        }, 1000);
    }

    async handleSessionComplete() {
        this.isRunning = false;
        clearInterval(this.interval);
        
        this.debug(`${this.currentSession} session completed`, 'info');
        
        // Show notification
        if (this.settings.enableNotifications) {
            this.showNotification();
        }

        // Update stats
        await this.updateStats();

        // Switch session type
        if (this.currentSession === 'focus') {
            this.sessionCount++;
            
            if (this.sessionCount % 4 === 0) {
                this.currentSession = 'longBreak';
                this.timeLeft = this.settings.longBreak * 60;
                this.debug('Switching to long break', 'info');
            } else {
                this.currentSession = 'shortBreak';
                this.timeLeft = this.settings.shortBreak * 60;
                this.debug('Switching to short break', 'info');
            }
            
            // Open break content
            this.openBreakContent();
        } else {
            this.currentSession = 'focus';
            this.timeLeft = this.settings.focusDuration * 60;
            this.debug('Switching to focus session', 'info');
        }

        this.totalTime = this.timeLeft;
        this.updateDisplay();
        this.updateControls();
        this.updateBreakPreview();
        this.clearTimerState();
    }

    async openBreakContent() {
        const enabledTypes = [];
        if (this.settings.enableFacts) enabledTypes.push('fact');
        if (this.settings.enableQuotes) enabledTypes.push('quote');
        if (this.settings.enableWebsites) enabledTypes.push('website');
        if (this.settings.enableNasa) enabledTypes.push('nasa');

        if (enabledTypes.length === 0) {
            this.debug('No break content types enabled', 'warn');
            return;
        }

        const randomType = enabledTypes[Math.floor(Math.random() * enabledTypes.length)];
        this.debug(`Opening break content: ${randomType}`, 'info');
        
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
                    this.openRandomWebsite();
                    return;
                case 'nasa':
                    url = 'https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY';
                    break;
            }

            // Send message to background script to open content
            chrome.runtime.sendMessage({
                action: 'openBreakContent',
                type: randomType,
                url: url
            });
        } catch (error) {
            console.error('Failed to open break content:', error);
            this.debug(`Failed to open break content: ${error.message}`, 'error');
        }
    }

    openRandomWebsite() {
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
    }

    getCurrentSessionDuration() {
        switch (this.currentSession) {
            case 'focus': return this.settings.focusDuration;
            case 'shortBreak': return this.settings.shortBreak;
            case 'longBreak': return this.settings.longBreak;
            default: return this.settings.focusDuration;
        }
    }

    updateDisplay() {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        document.getElementById('timeLeft').textContent = timeString;
        
        const sessionLabels = {
            focus: 'Focus Time',
            shortBreak: 'Short Break',
            longBreak: 'Long Break'
        };
        
        document.getElementById('sessionType').textContent = sessionLabels[this.currentSession];
        
        // Update progress ring
        const progress = this.totalTime > 0 ? (this.totalTime - this.timeLeft) / this.totalTime : 0;
        const circumference = 2 * Math.PI * 52;
        const offset = circumference - (progress * circumference);
        document.getElementById('progressCircle').style.strokeDashoffset = offset;

        // Update body class
        document.body.className = '';
        if (this.isRunning) {
            if (this.currentSession === 'focus') {
                document.body.classList.add('timer-active');
            } else {
                document.body.classList.add('break-active');
            }
        }
    }

    updateControls() {
        const startBtn = document.getElementById('startBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        
        if (this.isRunning) {
            startBtn.style.display = 'none';
            pauseBtn.style.display = 'block';
            pauseBtn.textContent = 'Pause';
        } else {
            startBtn.style.display = 'block';
            pauseBtn.style.display = 'none';
            
            if (this.isPaused) {
                startBtn.textContent = 'Resume';
            } else {
                const sessionLabels = {
                    focus: 'Start Focus',
                    shortBreak: 'Start Break',
                    longBreak: 'Start Break'
                };
                startBtn.textContent = sessionLabels[this.currentSession];
            }
        }
    }

    updateBreakPreview() {
        const preview = document.getElementById('breakPreview');
        const contentType = document.getElementById('breakContentType');
        
        if (this.currentSession === 'focus' && !this.isRunning) {
            const enabledTypes = [];
            if (this.settings.enableFacts) enabledTypes.push('Interesting Fact');
            if (this.settings.enableQuotes) enabledTypes.push('Inspirational Quote');
            if (this.settings.enableWebsites) enabledTypes.push('Cool Website');
            if (this.settings.enableNasa) enabledTypes.push('NASA Discovery');
            
            if (enabledTypes.length > 0) {
                const randomType = enabledTypes[Math.floor(Math.random() * enabledTypes.length)];
                contentType.textContent = randomType;
                preview.style.display = 'block';
            } else {
                preview.style.display = 'none';
            }
        } else {
            preview.style.display = 'none';
        }
    }

    async updateStats() {
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

        if (this.currentSession === 'focus') {
            stats.completedSessions++;
            stats.totalFocusTime += this.settings.focusDuration;
            
            // Update streak
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            
            if (stats.lastSessionDate === yesterday.toDateString() || stats.completedSessions === 1) {
                stats.currentStreak = stats.completedSessions;
            }
            
            stats.lastSessionDate = today;
        }

        await chrome.storage.local.set({ stats });
        this.updateStatsDisplay(stats);
    }

    updateStatsDisplay(stats) {
        document.getElementById('completedSessions').textContent = stats.completedSessions;
        
        const hours = Math.floor(stats.totalFocusTime / 60);
        const minutes = stats.totalFocusTime % 60;
        let timeText = '';
        if (hours > 0) {
            timeText = `${hours}h`;
            if (minutes > 0) timeText += ` ${minutes}m`;
        } else {
            timeText = `${minutes}m`;
        }
        document.getElementById('totalFocusTime').textContent = timeText;
        
        document.getElementById('currentStreak').textContent = stats.currentStreak;
    }

    async saveTimerState() {
        if (this.isRunning) {
            const state = {
                isRunning: this.isRunning,
                currentSession: this.currentSession,
                sessionCount: this.sessionCount,
                timeLeft: this.timeLeft,
                totalTime: this.totalTime,
                startTime: Date.now() - (this.totalTime - this.timeLeft) * 1000
            };
            await chrome.storage.local.set({ timerState: state });
        }
    }

    async clearTimerState() {
        await chrome.storage.local.remove(['timerState']);
    }

    async loadDebugLogs() {
        // Load both popup and background debug logs from storage
        const result = await chrome.storage.local.get(['popupDebugLogs', 'backgroundDebugLogs']);
        
        if (result.popupDebugLogs) {
            this.debugLogs = result.popupDebugLogs;
        }
        
        // Merge with background logs
        if (result.backgroundDebugLogs) {
            const allLogs = [...this.debugLogs, ...result.backgroundDebugLogs];
            // Sort by timestamp
            allLogs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            this.debugLogs = allLogs.slice(-this.maxDebugLogs);
        }
    }

    async saveDebugLogs() {
        // Save popup logs to storage
        await chrome.storage.local.set({ 
            popupDebugLogs: this.debugLogs.filter(log => log.source !== 'background').slice(-50) 
        });
    }

    // Debug functionality
    debug(message, level = 'info') {
        if (!this.settings.enableDebugMode) return;
        
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            session: this.currentSession,
            timeLeft: this.timeLeft,
            isRunning: this.isRunning
        };
        
        this.debugLogs.push(logEntry);
        
        // Keep only the most recent logs
        if (this.debugLogs.length > this.maxDebugLogs) {
            this.debugLogs.shift();
        }
        
        // Log to console as well
        console.log(`[SPARK DEBUG ${level.toUpperCase()}]`, message, logEntry);
        
        // Update debug display if panel is open
        this.updateDebugDisplay();
        
        // Save to storage
        this.saveDebugLogs();
        
        // Send to background script for persistent logging
        chrome.runtime.sendMessage({
            action: 'debugLog',
            logEntry
        });
    }

    updateDebugVisibility() {
        const debugBtn = document.getElementById('debugBtn');
        debugBtn.style.display = this.settings.enableDebugMode ? 'block' : 'none';
    }

    async showDebugConsole() {
        // Refresh debug logs from storage when opening console
        await this.loadDebugLogs();
        document.getElementById('debugPanel').style.display = 'block';
        this.updateDebugDisplay();
    }

    hideDebugConsole() {
        document.getElementById('debugPanel').style.display = 'none';
    }

    updateDebugDisplay() {
        const debugLogsEl = document.getElementById('debugLogs');
        if (!debugLogsEl) return;

        debugLogsEl.innerHTML = this.debugLogs
            .slice(-50) // Show only the last 50 logs
            .map(log => {
                const levelClass = `debug-${log.level}`;
                return `
                    <div class="debug-log-entry ${levelClass}">
                        <span class="debug-timestamp">${new Date(log.timestamp).toLocaleTimeString()}</span>
                        <span class="debug-level">[${log.level.toUpperCase()}]</span>
                        <span class="debug-message">${log.message}</span>
                        <span class="debug-context">Session: ${log.session}, Time: ${Math.floor(log.timeLeft / 60)}:${(log.timeLeft % 60).toString().padStart(2, '0')}</span>
                    </div>
                `;
            })
            .join('');

        // Auto-scroll to bottom
        debugLogsEl.scrollTop = debugLogsEl.scrollHeight;
    }

    clearDebugLogs() {
        this.debugLogs = [];
        this.updateDebugDisplay();
        this.saveDebugLogs();
        chrome.runtime.sendMessage({
            action: 'clearDebugLogs'
        });
        chrome.storage.local.remove(['popupDebugLogs']);
    }

    exportDebugLogs() {
        const logs = JSON.stringify(this.debugLogs, null, 2);
        const blob = new Blob([logs], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `spark-debug-logs-${new Date().toISOString().slice(0, 19)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.debug('Debug logs exported', 'info');
    }

    showNotification() {
        if (this.currentSession === 'focus') {
            chrome.runtime.sendMessage({
                action: 'showNotification',
                title: '⚡ Focus Session Complete!',
                message: 'Great work! Time for a well-deserved break.'
            });
        } else {
            chrome.runtime.sendMessage({
                action: 'showNotification',
                title: '⏰ Break Time Over!',
                message: 'Ready to focus again? Let\'s spark some productivity!'
            });
        }
    }
}

// Initialize the timer when popup loads
document.addEventListener('DOMContentLoaded', () => {
    new SparkTimer();
});