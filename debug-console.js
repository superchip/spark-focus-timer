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
    
    // Test break content
    try {
        chrome.runtime.sendMessage({
            action: 'debugCommand',
            command: 'testBreakContent',
            contentType: 'fact'
        });
        console.log('✅ Break content test initiated');
    } catch (error) {
        console.error('❌ Break content test failed:', error);
    }
}

// Function to set accelerated timer mode
async function setAcceleratedMode(speedMultiplier = 60) {
    try {
        const debugSettings = {
            enabled: true,
            logLevel: 2,
            testMode: true,
            acceleratedTimers: true,
            speedMultiplier: speedMultiplier
        };
        
        await chrome.storage.sync.set({ debugSettings });
        console.log(`✅ Accelerated mode enabled (${speedMultiplier}x speed)`);
        console.log('🔄 Please close and reopen the extension popup to see changes');
        
        return true;
    } catch (error) {
        console.error('❌ Failed to enable accelerated mode:', error);
        return false;
    }
}

// Function to run comprehensive tests
async function runComprehensiveTests() {
    console.log('🚀 Running comprehensive Spark debug tests...');
    
    // Enable debug mode first
    await enableSparkDebugMode();
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test all features
    await testDebugFeatures();
    
    // Enable accelerated mode
    await setAcceleratedMode(300); // 5 minute sessions become 1 second
    
    console.log('✅ Comprehensive tests complete');
    console.log('💡 Check the extension popup debug console for detailed logs');
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
    test: testDebugFeatures,
    setAcceleratedMode: setAcceleratedMode,
    runComprehensiveTests: runComprehensiveTests
};

console.log('🎯 Quick commands available:');
console.log('  window.sparkDebugConsole.enable()     - Enable debug mode');
console.log('  window.sparkDebugConsole.disable()    - Disable debug mode');
console.log('  window.sparkDebugConsole.check()      - Check status');
console.log('  window.sparkDebugConsole.test()       - Test features');
console.log('  window.sparkDebugConsole.setAcceleratedMode(speed) - Set timer speed');
console.log('  window.sparkDebugConsole.runComprehensiveTests() - Run all tests');
