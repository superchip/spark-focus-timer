// Quick Debug Mode Enabler for Spark Extension
// Run this in the browser console (F12) to enable debug mode

console.log('🧪 Spark Debug Mode Enabler');

// Function to enable debug mode directly
async function enableSparkDebugMode() {
    try {
        // Enable debug mode in storage
        const debugSettings = {
            enabled: true,
            logLevel: 2, // INFO level
            testMode: false,
            acceleratedTimers: false,
            speedMultiplier: 60
        };
        
        await chrome.storage.sync.set({ debugSettings });
        console.log('✅ Debug mode enabled in storage');
        
        // Reload extension popup
        console.log('🔄 Please close and reopen the extension popup to see changes');
        
        return true;
    } catch (error) {
        console.error('❌ Failed to enable debug mode:', error);
        return false;
    }
}

// Function to check current debug status
async function checkDebugStatus() {
    try {
        const result = await chrome.storage.sync.get(['debugSettings']);
        console.log('🔍 Current debug settings:', result.debugSettings || 'Not set');
        return result.debugSettings;
    } catch (error) {
        console.error('❌ Failed to check debug status:', error);
        return null;
    }
}

// Function to disable debug mode
async function disableSparkDebugMode() {
    try {
        const debugSettings = {
            enabled: false,
            logLevel: 1, // WARN level
            testMode: false,
            acceleratedTimers: false,
            speedMultiplier: 60
        };
        
        await chrome.storage.sync.set({ debugSettings });
        console.log('✅ Debug mode disabled');
        console.log('🔄 Please close and reopen the extension popup to see changes');
        
        return true;
    } catch (error) {
        console.error('❌ Failed to disable debug mode:', error);
        return false;
    }
}

// Function to test debug functionality
async function testDebugFeatures() {
    console.log('🧪 Testing debug features...');
    
    // Test storage access
    try {
        const allSync = await chrome.storage.sync.get(null);
        const allLocal = await chrome.storage.local.get(null);
        console.log('📦 Sync storage:', allSync);
        console.log('📦 Local storage:', allLocal);
    } catch (error) {
        console.error('❌ Storage test failed:', error);
    }
    
    // Test message passing
    try {
        const response = await new Promise((resolve) => {
            chrome.runtime.sendMessage({
                action: 'debugCommand',
                command: 'simulateNotification'
            }, resolve);
        });
        console.log('📧 Message test result:', response);
    } catch (error) {
        console.error('❌ Message test failed:', error);
    }
}

// Auto-run check on load
console.log('🏃 Checking current debug status...');
checkDebugStatus().then(status => {
    if (status && status.enabled) {
        console.log('✅ Debug mode is already enabled');
        console.log('📝 Available commands:');
        console.log('  - enableSparkDebugMode()');
        console.log('  - disableSparkDebugMode()');
        console.log('  - checkDebugStatus()');
        console.log('  - testDebugFeatures()');
    } else {
        console.log('💡 Debug mode is disabled. Run enableSparkDebugMode() to enable it.');
    }
});

// Make functions available globally
window.sparkDebugConsole = {
    enable: enableSparkDebugMode,
    disable: disableSparkDebugMode,
    check: checkDebugStatus,
    test: testDebugFeatures
};

console.log('🎯 Quick commands available:');
console.log('  window.sparkDebugConsole.enable()   - Enable debug mode');
console.log('  window.sparkDebugConsole.disable()  - Disable debug mode');
console.log('  window.sparkDebugConsole.check()    - Check status');
console.log('  window.sparkDebugConsole.test()     - Test features');
