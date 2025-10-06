class SparkTimer {
    constructor() {
        this.isRunning = false;
        this.isPaused = false;
        this.currentSession = 'focus'; // 'focus', 'shortBreak', 'longBreak'
        this.sessionCount = 0;
        this.timeLeft = 0;
        this.totalTime = 0;
        this.interval = null;
        this.breakContentOpened = false; // Track if break content has been opened for current session
        this.sessionStartTime = null; // Track when the current session actually started

        // Long-press state
        this.isLongPressing = false;
        this.longPressTimer = null;
        this.longPressThreshold = 800; // 800ms for long press

        // Settings
        this.settings = {
            focusDuration: 25,
            shortBreak: 5,
            longBreak: 30,
            enableNotifications: true,
            enableFacts: true,
            enableQuotes: true,
            enableWebsites: true,
            enableDebugMode: false
        };

        // Debug system
        this.debugLogs = [];
        this.maxDebugLogs = 100;
        this.speedMultiplier = 1;
        this.originalInterval = 1000; // Store original interval

        this.breakContentTypes = [
            'Interesting Fact',
            'Inspirational Quote',
            'Cool Website',

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
        this.setupMessageListener();
        this.updateDisplay();
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
        this.debug(`Loading stats, timerState found: ${!!result.timerState}`, 'info');
        
        if (result.timerState) {
            this.debug(`Timer state: session=${result.timerState.currentSession}, running=${result.timerState.isRunning}, timeLeft=${result.timerState.timeLeft}`, 'info');
        }
        
        // Load stats
        if (result.stats) {
            const today = new Date().toDateString();
            if (result.stats.date === today) {
                this.updateStatsDisplay(result.stats);
            }
        }

        // Restore timer state if it exists
        if (result.timerState) {
            if (result.timerState.isRunning) {
                this.debug('Restoring running timer state', 'info');
                this.restoreTimerState(result.timerState);
            } else {
                // Timer is not running but we should restore the session info
                this.debug('Restoring non-running timer state', 'info');
                this.currentSession = result.timerState.currentSession;
                this.sessionCount = result.timerState.sessionCount;
                this.timeLeft = result.timerState.timeLeft;
                this.totalTime = result.timerState.totalTime;
                this.breakContentOpened = result.timerState.breakContentOpened || false;
                this.debug(`Restored timer state for ${this.currentSession} session (not running)`, 'info');
                this.updateDisplay();
                this.updateControls();
            }
        } else {
            this.debug('No timer state found, using defaults', 'info');
            // Set default time for focus session
            this.timeLeft = this.settings.focusDuration * 60;
            this.totalTime = this.timeLeft;
            this.updateDisplay();
            this.updateControls();
        }
    }

    async restoreTimerState(state) {
        this.currentSession = state.currentSession;
        this.sessionCount = state.sessionCount;
        this.totalTime = state.totalTime;
        this.breakContentOpened = state.breakContentOpened || false;

        if (state.sessionStartTime) {
            // New logic: calculate elapsed time from actual session start
            const now = Date.now();
            const elapsed = Math.floor((now - state.sessionStartTime) / 1000);
            this.timeLeft = Math.max(0, state.totalTime - elapsed);
            this.sessionStartTime = state.sessionStartTime;
        } else {
            // Fallback for old saved states or missing sessionStartTime: use saved timeLeft
            this.timeLeft = state.timeLeft;
            this.sessionStartTime = Date.now() - (this.totalTime - this.timeLeft) * 1000;
        }
        
        if (this.timeLeft > 0) {
            this.isRunning = true;
            // Start ticking and immediately sync UI controls so Pause button shows (fix state loss on reopen)
            this.startTimer();
            this.updateDisplay();
            this.updateControls();
            this.debug('Restored running session and updated controls (Pause visible)', 'info');
            
            // Restart background timer for remaining time
            chrome.runtime.sendMessage({
                action: 'startBackgroundTimer',
                duration: this.timeLeft / 60, // Convert seconds to minutes
                sessionInfo: {
                    type: this.currentSession,
                    sessionCount: this.sessionCount
                }
            });
        } else {
            // Timer finished while popup was closed - check if background handled it
            const result = await chrome.storage.local.get(['timerState']);
            if (result.timerState && !result.timerState.isRunning) {
                // Background script already handled completion - use its state
                this.currentSession = result.timerState.currentSession;
                this.sessionCount = result.timerState.sessionCount;
                this.timeLeft = result.timerState.timeLeft;
                this.totalTime = result.timerState.totalTime;
                this.breakContentOpened = result.timerState.breakContentOpened || false;
                this.debug('Timer state restored from background completion', 'info');
                this.updateDisplay();
                this.updateControls();
            } else {
                // Handle completion now (background didn't handle it yet)
                this.handleSessionComplete();
            }
        }
    }

    setupEventListeners() {
        // Timer circle interactions (tap to start/pause, long-press to reset)
        const timerCircle = document.getElementById('timerCircle');

        // Mouse events
        timerCircle.addEventListener('mousedown', (e) => this.handlePressStart(e));
        timerCircle.addEventListener('mouseup', (e) => this.handlePressEnd(e));
        timerCircle.addEventListener('mouseleave', (e) => this.handlePressCancel(e));

        // Touch events
        timerCircle.addEventListener('touchstart', (e) => this.handlePressStart(e));
        timerCircle.addEventListener('touchend', (e) => this.handlePressEnd(e));
        timerCircle.addEventListener('touchcancel', (e) => this.handlePressCancel(e));

        // Stats drawer toggle
        document.getElementById('statsHandle').addEventListener('click', () => this.toggleStats());

        // GitHub link in settings footer
        document.getElementById('githubLink').addEventListener('click', (e) => {
            e.preventDefault();
            chrome.tabs.create({ url: 'https://github.com/superchip/spark-focus-timer' });
        });

        // Settings and debug controls
        document.getElementById('settingsBtn').addEventListener('click', () => this.showSettings());
        document.getElementById('closeSettings').addEventListener('click', () => this.hideSettings());
        document.getElementById('debugBtn').addEventListener('click', () => this.showDebugConsole());
        document.getElementById('closeDebug').addEventListener('click', () => this.hideDebugConsole());
        document.getElementById('clearLogs').addEventListener('click', () => this.clearDebugLogs());
        document.getElementById('exportLogs').addEventListener('click', () => this.exportDebugLogs());

        // Debug testing controls
        document.getElementById('applySpeed').addEventListener('click', () => this.applySpeedMultiplier());
        document.getElementById('testNotification').addEventListener('click', () => this.testNotification());
        document.getElementById('testBreakContent').addEventListener('click', () => this.testBreakContent());
        document.getElementById('testBackgroundTimer').addEventListener('click', () => this.testBackgroundTimer());
        document.getElementById('skipToEnd').addEventListener('click', () => this.skipToSessionEnd());
        document.getElementById('simulateFocus').addEventListener('click', () => this.simulateSession('focus', 10));
        document.getElementById('simulateBreak').addEventListener('click', () => this.simulateSession('shortBreak', 5));
        document.getElementById('resetStats').addEventListener('click', () => this.resetStats());
        document.getElementById('inspectStorage').addEventListener('click', () => this.inspectStorage());
        document.getElementById('clearAllStorage').addEventListener('click', () => this.clearAllStorage());
    }

    handlePressStart(e) {
        e.preventDefault();
        this.isLongPressing = false;

        const timerCircle = document.getElementById('timerCircle');
        const timerStatus = document.getElementById('timerStatus');

        // Determine action based on current session
        const isBreakSession = this.currentSession === 'shortBreak' || this.currentSession === 'longBreak';
        const actionText = isBreakSession ? '⏭ Skipping...' : '↻ Resetting...';

        // Start long-press timer
        this.longPressTimer = setTimeout(() => {
            this.isLongPressing = true;
            timerCircle.classList.add('long-pressing');
            timerStatus.textContent = actionText;
            this.debug(`Long press detected - preparing to ${isBreakSession ? 'skip' : 'reset'}`, 'info');
        }, this.longPressThreshold);
    }

    handlePressEnd(e) {
        e.preventDefault();

        const timerCircle = document.getElementById('timerCircle');
        const timerStatus = document.getElementById('timerStatus');

        // Clear long-press timer
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }

        if (this.isLongPressing) {
            // Long press completed
            timerCircle.classList.remove('long-pressing');
            timerStatus.textContent = '';

            // Check if we're in a break session
            const isBreakSession = this.currentSession === 'shortBreak' || this.currentSession === 'longBreak';

            if (isBreakSession) {
                // Skip break and go to focus
                this.skipBreakToFocus();
                this.debug('Break skipped via long press', 'info');
            } else {
                // Reset timer
                this.resetSession();
                this.debug('Timer reset via long press', 'info');
            }

            this.isLongPressing = false;
        } else {
            // Short tap - toggle timer
            timerCircle.classList.remove('long-pressing');
            timerStatus.textContent = '';
            this.toggleTimer();
        }
    }

    handlePressCancel(e) {
        // Cancel long-press if mouse/touch leaves the circle
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }

        if (this.isLongPressing) {
            const timerCircle = document.getElementById('timerCircle');
            const timerStatus = document.getElementById('timerStatus');
            timerCircle.classList.remove('long-pressing');
            timerStatus.textContent = '';
            this.isLongPressing = false;
        }
    }

    toggleTimer() {
        if (this.isRunning) {
            // Timer is running - pause it
            this.pauseSession();
        } else {
            // Timer is not running - start it
            this.startSession();
        }
    }

    setupMessageListener() {
        // Listen for messages from background script
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            try {
                if (message.action === 'sessionStartedFromNotification') {
                    this.debug(`Received session start notification: ${message.sessionType}`, 'info');
                    // Force reload the timer state to get the latest information
                    setTimeout(async () => {
                        await this.loadStats();
                        this.debug('Timer state reloaded after notification start', 'info');
                    }, 100); // Small delay to ensure background script has finished
                } else if (message.action === 'breakContentOpened') {
                    // Background confirmed break content tab opened
                    this.debug(`Break content opened (${message.type})`, 'info');
                    this.breakContentOpened = true;
                    // Persist flag in timer state if session still running
                    this.saveTimerState();
                } else if (message.action === 'checkIfPopupOpen') {
                    // Background is checking if popup is open - respond to confirm
                    this.debug('Background script checking if popup is open - responding', 'info');
                    sendResponse({ popupOpen: true });
                    return true; // Keep message channel open for response
                } else if (message.action === 'startSessionFromNotification') {
                    // Background wants us to start a session since popup is already open
                    this.debug(`Starting ${message.sessionType} session from notification in current popup`, 'info');
                    this.startSessionFromNotificationMessage(message.sessionType);
                }
            } catch (error) {
                this.debug(`Error handling message: ${error.message}`, 'error');
            }
        });
    }

    async startSessionFromNotificationMessage(sessionType) {
        try {
            // Load the current timer state first to ensure we have the latest info
            const result = await chrome.storage.local.get(['timerState']);
            
            if (!result.timerState) {
                this.debug('No timer state found for notification session start', 'warn');
                return;
            }
            
            // Update our internal state to match the stored state
            this.currentSession = result.timerState.currentSession;
            this.sessionCount = result.timerState.sessionCount;
            this.timeLeft = result.timerState.timeLeft;
            this.totalTime = result.timerState.totalTime;
            this.breakContentOpened = result.timerState.breakContentOpened || false;
            
            this.debug(`Starting ${this.currentSession} session in popup from notification`, 'info');
            
            // Start the session (this will trigger the normal flow)
            this.startSession();
            
        } catch (error) {
            this.debug(`Error starting session from notification message: ${error.message}`, 'error');
        }
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
        elements.enableDebugMode.checked = this.settings.enableDebugMode;

        // Update display values
        document.getElementById('focusValue').textContent = this.settings.focusDuration;
        document.getElementById('shortBreakValue').textContent = this.settings.shortBreak;
        document.getElementById('longBreakValue').textContent = this.settings.longBreak;

        // Add event listeners for live display updates (no auto-save)
        elements.focusDuration.addEventListener('input', (e) => {
            document.getElementById('focusValue').textContent = e.target.value;
        });

        elements.shortBreak.addEventListener('input', (e) => {
            document.getElementById('shortBreakValue').textContent = e.target.value;
        });

        elements.longBreak.addEventListener('input', (e) => {
            document.getElementById('longBreakValue').textContent = e.target.value;
        });

        // Save Settings button listener
        const saveBtn = document.getElementById('saveSettingsBtn');
        saveBtn.addEventListener('click', () => {
            // Update all settings from form values
            this.settings.focusDuration = parseInt(elements.focusDuration.value);
            this.settings.shortBreak = parseInt(elements.shortBreak.value);
            this.settings.longBreak = parseInt(elements.longBreak.value);
            this.settings.enableNotifications = elements.enableNotifications.checked;
            this.settings.enableFacts = elements.enableFacts.checked;
            this.settings.enableQuotes = elements.enableQuotes.checked;
            this.settings.enableWebsites = elements.enableWebsites.checked;
            this.settings.enableDebugMode = elements.enableDebugMode.checked;

            // Save to storage
            this.saveSettings();

            // Apply new durations to timer based on current session
            const wasRunning = this.isRunning;

            // Stop timer if running
            if (this.isRunning) {
                clearInterval(this.interval);
                this.isRunning = false;
                this.isPaused = false;
                chrome.runtime.sendMessage({ action: 'stopBackgroundTimer' });
            }

            // Update timer with new duration
            if (this.currentSession === 'focus') {
                this.timeLeft = this.settings.focusDuration * 60;
            } else if (this.currentSession === 'shortBreak') {
                this.timeLeft = this.settings.shortBreak * 60;
            } else if (this.currentSession === 'longBreak') {
                this.timeLeft = this.settings.longBreak * 60;
            }
            this.totalTime = this.timeLeft;

            // Restart timer if it was running
            if (wasRunning) {
                this.sessionStartTime = Date.now();
                this.isRunning = true;
                this.startTimer();
                chrome.runtime.sendMessage({
                    action: 'startBackgroundTimer',
                    duration: this.timeLeft / 60,
                    sessionInfo: {
                        type: this.currentSession,
                        sessionCount: this.sessionCount
                    }
                });
            }

            this.updateDisplay();
            this.updateControls();

            // Update UI elements
            this.updateDebugVisibility();

            // Show success feedback
            saveBtn.textContent = '✓ Saved';
            saveBtn.classList.add('saved');

            setTimeout(() => {
                saveBtn.textContent = 'Save';
                saveBtn.classList.remove('saved');
            }, 1500);

            this.debug('Settings saved successfully', 'info');
        });
    }

    showSettings() {
        document.getElementById('settingsPanel').style.display = 'block';
    }

    hideSettings() {
        document.getElementById('settingsPanel').style.display = 'none';
    }

    toggleStats() {
        const statsDrawer = document.getElementById('statsDrawer');
        statsDrawer.classList.toggle('open');
        this.debug('Stats drawer toggled', 'info');
    }

    startSession() {
        // Prevent multiple intervals (double-speed bug) by clearing any existing interval first
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }

    // Dismiss any pending actionable notifications when user explicitly starts a session
    chrome.runtime.sendMessage({ action: 'dismissAllNotifications' });

        if (this.isPaused) {
            this.isPaused = false;
            // When resuming, adjust sessionStartTime to account for the time that has already elapsed
            if (this.sessionStartTime) {
                this.sessionStartTime = Date.now() - (this.totalTime - this.timeLeft) * 1000;
            }
            this.debug('Timer resumed', 'info');
        } else {
            // Start new (or replacement) session
            const startBtn = document.getElementById('startBtn');
            const wantsFocus = startBtn && startBtn.textContent.includes('Focus');
            const switchingEarlyFromBreak = wantsFocus && (this.currentSession === 'shortBreak' || this.currentSession === 'longBreak');
            if (switchingEarlyFromBreak) {
                this.debug('User requested to start focus while break running/active - terminating break early', 'info');
                this.currentSession = 'focus';
                // Reset break content flag since we are moving back to focus
                this.breakContentOpened = false;
            }

            this.timeLeft = this.getCurrentSessionDuration() * 60;
            this.totalTime = this.timeLeft;
            this.sessionStartTime = Date.now(); // Record when this session actually started
            this.debug(`Starting ${this.currentSession} session (${this.getCurrentSessionDuration()} minutes)`, 'info');
        }

        this.isRunning = true;
        this.startTimer();
        this.updateControls();
        this.saveTimerState();
        
        // Open break content AFTER starting timer (with minimal delay) for break sessions
        // Brief delay ensures UI updates before content opens
        const isBreakSession = (this.currentSession === 'shortBreak' || this.currentSession === 'longBreak');
        if (isBreakSession && !this.breakContentOpened && !this.isPaused) {
            this.debug('Scheduling break content to open after delay', 'info');
            setTimeout(() => {
                this.openBreakContent();
                this.breakContentOpened = true;
                this.saveTimerState();
                this.debug('Break content opened after delay', 'info');
            }, 200); // 200ms delay - just enough for UI to update
        }

        // Start background timer to ensure notifications work even when popup is closed
        chrome.runtime.sendMessage({
            action: 'startBackgroundTimer',
            duration: this.timeLeft / 60, // Convert seconds to minutes
            sessionInfo: {
                type: this.currentSession,
                sessionCount: this.sessionCount
            }
        });
    }

    pauseSession() {
        this.isPaused = true;
        this.isRunning = false;
        clearInterval(this.interval);
        this.updateControls();
        this.clearTimerState();
        this.debug('Timer paused', 'info');

        // Stop background timer when paused
        chrome.runtime.sendMessage({
            action: 'stopBackgroundTimer'
        });
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
        this.breakContentOpened = false; // Reset break content flag on reset
        this.updateDisplay();
        this.updateControls();
        this.clearTimerState();
        this.debug(`Timer reset for ${this.currentSession} session`, 'info');

        // Stop background timer when reset
        chrome.runtime.sendMessage({
            action: 'stopBackgroundTimer'
        });
    }

    startTimer() {
        const interval = this.originalInterval / this.speedMultiplier;
        this.debug(`Starting timer with ${this.speedMultiplier}x speed (${interval}ms interval)`, 'info');
        
        this.interval = setInterval(() => {
            this.timeLeft--;
            this.updateDisplay();
            this.saveTimerState();

            if (this.timeLeft <= 0) {
                this.handleSessionComplete();
            }
        }, interval);
    }

    async handleSessionComplete() {
        this.isRunning = false;
        clearInterval(this.interval);
        
        this.debug(`${this.currentSession} session completed`, 'info');
        
        // Stop background timer since we're handling completion here
        chrome.runtime.sendMessage({
            action: 'stopBackgroundTimer'
        });
        
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
                this.debug('Focus session complete - ready for long break', 'info');
            } else {
                this.currentSession = 'shortBreak';
                this.timeLeft = this.settings.shortBreak * 60;
                this.debug('Focus session complete - ready for short break', 'info');
            }
            
            // Reset break content flag for new break session
            this.breakContentOpened = false;
            
            // Don't automatically open break content or start break timer
            // User needs to manually start the break session
        } else {
            // Break session completed
            this.currentSession = 'focus';
            this.timeLeft = this.settings.focusDuration * 60;
            this.debug('Break complete - ready for focus session', 'info');
            
            // Reset break content flag when switching to focus
            this.breakContentOpened = false;
        }

        this.totalTime = this.timeLeft;
        this.updateDisplay();
        this.updateControls();
    // Persist the new (non-running) timer state so background notification actions
    // know which upcoming session to start (fixes Start Break showing focus issue)
    await this.saveIdleTimerState();
    this.debug('Saved idle timer state after session completion', 'info');
    }

    async openBreakContent() {
        const enabledTypes = [];
        if (this.settings.enableFacts) enabledTypes.push('fact');
        if (this.settings.enableQuotes) enabledTypes.push('quote');
        if (this.settings.enableWebsites) enabledTypes.push('website');
        

        if (enabledTypes.length === 0) {
            this.debug('No break content types enabled', 'warn');
            return;
        }

        const randomType = enabledTypes[Math.floor(Math.random() * enabledTypes.length)];
        this.debug(`Opening break content: ${randomType}`, 'info');
        
        try {
            let url = ''; // Default empty URL
            switch (randomType) {
                case 'fact':
                    url = 'https://uselessfacts.jsph.pl/random.json?language=en';
                    break;
                case 'quote':
                    url = 'https://api.quotegarden.io/api/v3/quotes/random';
                    break;
                case 'website':
                    // For websites, background script will pick randomly
                    url = '';
                    break;
            }

            // Always send message to background script to open content
            // This ensures popup can be re-opened after content tab opens
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

        // Update session badge
        const sessionBadge = document.getElementById('sessionBadge');
        const sessionIcon = sessionBadge.querySelector('.session-icon');
        const sessionLabel = sessionBadge.querySelector('.session-label');

        const sessionData = {
            focus: { label: 'Focus Time', icon: '⚡' },
            shortBreak: { label: 'Short Break', icon: '☕' },
            longBreak: { label: 'Long Break', icon: '🌙' }
        };

        const data = sessionData[this.currentSession];
        sessionLabel.textContent = data.label;
        sessionIcon.textContent = data.icon;

        // Update progress ring
        const progress = this.totalTime > 0 ? (this.totalTime - this.timeLeft) / this.totalTime : 0;
        const radius = 115; // Updated SVG circle radius for 256px timer
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (progress * circumference);
        const circleEl = document.getElementById('progressCircle');
        if (circleEl) circleEl.style.strokeDashoffset = offset;

        // Update body class for gradient backgrounds
        document.body.className = '';
        if (this.currentSession === 'shortBreak') {
            document.body.classList.add('short-break');
        } else if (this.currentSession === 'longBreak') {
            document.body.classList.add('long-break');
        }
        // Focus session uses default gradient (no class needed)

        // Add stopped class to timer circle when not running
        const timerCircle = document.getElementById('timerCircle');
        if (!this.isRunning) {
            timerCircle.classList.add('stopped');
        } else {
            timerCircle.classList.remove('stopped');
        }
    }

    updateControls() {
        const hintText = document.getElementById('hintText');
        const hintSubtext = document.getElementById('hintSubtext');

        // Update hint text based on timer state
        if (this.isRunning) {
            hintText.textContent = 'Tap to Pause';
        } else if (this.isPaused) {
            hintText.textContent = 'Tap to Resume';
        } else {
            hintText.textContent = 'Tap to Start';
        }

        // Update subtext based on session type
        const isBreakSession = this.currentSession === 'shortBreak' || this.currentSession === 'longBreak';
        if (hintSubtext) {
            hintSubtext.textContent = isBreakSession ? 'Hold to skip' : 'Hold to reset';
        }
    }

    // Allow user to end the current break early and jump into a fresh focus session
    skipBreakToFocus() {
        if (!(this.currentSession === 'shortBreak' || this.currentSession === 'longBreak')) return;
        this.debug('Skip Break activated - switching immediately to focus session', 'info');
        // Stop current timers
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        chrome.runtime.sendMessage({ action: 'stopBackgroundTimer' });

        // Transition to focus
        this.currentSession = 'focus';
        this.isRunning = false; // We'll start a new session below
        this.isPaused = false;
        this.breakContentOpened = false;
        this.timeLeft = this.settings.focusDuration * 60;
        this.totalTime = this.timeLeft;
        this.saveIdleTimerState(); // Persist non-running state right before starting
        this.updateDisplay();
        this.updateControls();

        // Automatically start the focus session (common expectation when skipping)
        this.startSession();
        this.debug('Focus session started after skipping break', 'info');
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

            // Focus streak is simply the number of completed focus sessions today
            stats.currentStreak = stats.completedSessions;

            stats.lastSessionDate = today;
        }

        await chrome.storage.local.set({ stats });
        this.updateStatsDisplay(stats);
    }

    updateStatsDisplay(stats) {
        // Update completed sessions
        const completedSessionsEl = document.getElementById('completedSessions');
        if (completedSessionsEl) {
            completedSessionsEl.textContent = stats.completedSessions || 0;
        }

        // Update streak
        const currentStreakEl = document.getElementById('currentStreak');
        if (currentStreakEl) {
            currentStreakEl.textContent = stats.currentStreak || 0;
        }

        // Update total focus time
        const hours = Math.floor(stats.totalFocusTime / 60);
        const minutes = stats.totalFocusTime % 60;
        let timeText = '';
        if (hours > 0) {
            timeText = `${hours}h`;
            if (minutes > 0) timeText += ` ${minutes}m`;
        } else {
            timeText = `${minutes}m`;
        }
        const totalFocusTimeEl = document.getElementById('totalFocusTime');
        if (totalFocusTimeEl) {
            totalFocusTimeEl.textContent = timeText;
        }
    }

    async saveTimerState() {
        if (this.isRunning) {
            const state = {
                isRunning: this.isRunning,
                currentSession: this.currentSession,
                sessionCount: this.sessionCount,
                timeLeft: this.timeLeft,
                totalTime: this.totalTime,
                sessionStartTime: this.sessionStartTime,
                breakContentOpened: this.breakContentOpened
            };
            await chrome.storage.local.set({ timerState: state });
        }
    }

    // Save a non-running (idle) timer state so that notification actions can start
    // the correct next session even if popup is closed.
    async saveIdleTimerState() {
        const state = {
            isRunning: false,
            currentSession: this.currentSession,
            sessionCount: this.sessionCount,
            timeLeft: this.timeLeft,
            totalTime: this.totalTime,
            sessionStartTime: null,
            breakContentOpened: this.breakContentOpened
        };
        await chrome.storage.local.set({ timerState: state });
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
        this.inspectStorage(); // Auto-refresh storage display
        
        // Set current speed multiplier in dropdown
        const speedSelect = document.getElementById('speedMultiplier');
        speedSelect.value = this.speedMultiplier.toString();
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
        let url;
        try {
            if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
                const blob = new Blob([logs], { type: 'application/json' });
                url = URL.createObjectURL(blob);
            } else {
                this.debug('URL.createObjectURL not available in popup; using data URL', 'warn');
            }
        } catch (e) {
            this.debug(`createObjectURL failed in popup: ${e.message}; using data URL`, 'warn');
        }
        if (!url) {
            url = 'data:application/json;charset=utf-8,' + encodeURIComponent(logs);
        }
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `spark-debug-logs-${new Date().toISOString().slice(0, 19)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        if (url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
        }
        
        this.debug('Debug logs exported', 'info');
    }

    // Debug Testing Methods
    applySpeedMultiplier() {
        const speedSelect = document.getElementById('speedMultiplier');
        const newSpeed = parseInt(speedSelect.value);
        const oldSpeed = this.speedMultiplier;
        this.speedMultiplier = newSpeed;
        
        this.debug(`Speed multiplier changed from ${oldSpeed}x to ${newSpeed}x`, 'info');
        
        // If timer is running, restart it with new speed
        if (this.isRunning) {
            clearInterval(this.interval);
            this.startTimer();
            this.debug('Timer restarted with new speed', 'info');
        }
    }

    testNotification() {
        this.debug('Testing notification system', 'info');
        chrome.runtime.sendMessage({
            action: 'showNotification',
            title: '🧪 Test Notification',
            message: 'This is a test notification from the debug console!',
            sessionType: 'focus' // Test with focus session type to show buttons
        });
    }

    testBreakContent() {
        this.debug('Testing break content system', 'info');
    const contentTypes = ['fact', 'quote', 'website'];
        const randomType = contentTypes[Math.floor(Math.random() * contentTypes.length)];
        
        chrome.runtime.sendMessage({
            action: 'debugCommand',
            command: 'testBreakContent',
            contentType: randomType
        });
    }

    testBackgroundTimer() {
        this.debug('Testing background timer (10 seconds)', 'info');
        
        // Start a 10-second background timer for testing
        chrome.runtime.sendMessage({
            action: 'startBackgroundTimer',
            duration: 10 / 60, // 10 seconds in minutes
            sessionInfo: {
                type: 'focus',
                sessionCount: 1
            }
        });
        
        // Set up a mock timer state for testing
        const testState = {
            isRunning: true,
            currentSession: 'focus',
            sessionCount: 1,
            timeLeft: 10,
            totalTime: 10,
            startTime: Date.now()
        };
        
        chrome.storage.local.set({ timerState: testState });
        this.debug('Background timer test started - close popup to test!', 'info');
    }

    skipToSessionEnd() {
        if (!this.isRunning) {
            this.debug('Cannot skip - timer is not running', 'warn');
            return;
        }
        
        this.debug('Skipping to session end', 'info');
        this.timeLeft = 1; // Will trigger session complete on next tick
    }

    simulateSession(sessionType, durationSeconds) {
        this.debug(`Simulating ${sessionType} session for ${durationSeconds} seconds`, 'info');
        
        // Stop current session
        if (this.isRunning) {
            this.pauseSession();
        }
        
        // Set up simulation
        this.currentSession = sessionType;
        this.timeLeft = durationSeconds;
        this.totalTime = durationSeconds;
        this.breakContentOpened = false; // Reset for simulation
        this.updateDisplay();
        
        // Start the simulated session
        this.startSession();
    }

    async resetStats() {
        this.debug('Resetting all statistics', 'info');

        await chrome.storage.local.remove(['stats']);

        // Reset display
        const completedSessionsEl = document.getElementById('completedSessions');
        const totalFocusTimeEl = document.getElementById('totalFocusTime');
        const currentStreakEl = document.getElementById('currentStreak');

        if (completedSessionsEl) completedSessionsEl.textContent = '0';
        if (totalFocusTimeEl) totalFocusTimeEl.textContent = '0m';
        if (currentStreakEl) currentStreakEl.textContent = '0';

        this.debug('Statistics reset complete', 'info');
    }

    async inspectStorage() {
        this.debug('Inspecting extension storage', 'info');
        
        try {
            const [syncStorage, localStorage] = await Promise.all([
                chrome.storage.sync.get(null),
                chrome.storage.local.get(null)
            ]);
            
            const storageData = {
                sync: syncStorage,
                local: localStorage
            };
            
            const storageDisplay = document.getElementById('storageDisplay');
            storageDisplay.innerHTML = `<pre>${JSON.stringify(storageData, null, 2)}</pre>`;
            
            this.debug('Storage inspection complete', 'info');
        } catch (error) {
            this.debug(`Storage inspection failed: ${error.message}`, 'error');
        }
    }

    async clearAllStorage() {
        if (!confirm('Are you sure you want to clear ALL extension data? This cannot be undone.')) {
            return;
        }
        
        this.debug('Clearing all extension storage', 'warn');
        
        try {
            await Promise.all([
                chrome.storage.sync.clear(),
                chrome.storage.local.clear()
            ]);
            
            this.debug('All storage cleared', 'info');
            
            // Reinitialize with defaults
            await this.loadSettings();
            this.updateDisplay();
            this.inspectStorage();
            
        } catch (error) {
            this.debug(`Failed to clear storage: ${error.message}`, 'error');
        }
    }

    showNotification() {
        if (this.currentSession === 'focus') {
            chrome.runtime.sendMessage({
                action: 'showNotification',
                title: '⚡ Focus Session Complete!',
                message: 'Great work! Click the extension to start your break when ready.',
                sessionType: 'focus'
            });
        } else {
            chrome.runtime.sendMessage({
                action: 'showNotification',
                title: '⏰ Break Time Over!',
                message: 'Ready to focus again? Let\'s spark some productivity!',
                sessionType: 'break'
            });
        }
    }
}

// Initialize the timer when popup loads
document.addEventListener('DOMContentLoaded', () => {
    new SparkTimer();
});