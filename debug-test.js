// Debug Test Script for Spark Extension
// This script can be run in the browser console to test debug functionality

console.log('🧪 Spark Debug Test Script Loaded');

// Test debug message
function testDebugMessages() {
    console.log('Testing debug message system...');
    
    // Send test messages to background script
    chrome.runtime.sendMessage({
        action: 'debugCommand',
        command: 'simulateNotification'
    }, (response) => {
        console.log('Notification test response:', response);
    });
}

// Test storage inspection
function testStorageInspection() {
    console.log('Testing storage inspection...');
    
    chrome.runtime.sendMessage({
        action: 'getDebugInfo',
        includeStorage: true
    }, (response) => {
        console.log('Debug info response:', response);
    });
}

// Test timer with accelerated mode
function testAcceleratedTimer() {
    console.log('Testing accelerated timer mode...');
    
    chrome.runtime.sendMessage({
        action: 'debugCommand',
        command: 'setSpeed',
        speedMultiplier: 300
    }, (response) => {
        console.log('Speed test response:', response);
    });
}

// Test break content system
function testBreakContentSystem() {
    console.log('Testing break content system...');
    
    const contentTypes = ['fact', 'quote', 'website'];
    contentTypes.forEach((type, index) => {
        setTimeout(() => {
            chrome.runtime.sendMessage({
                action: 'debugCommand',
                command: 'testBreakContent',
                contentType: type
            });
        }, index * 2000);
    });
}

// Test notification system
function testNotificationSystem() {
    console.log('Testing notification system...');
    
    const notifications = [
        { title: '🧪 Test 1', message: 'Focus session test notification' },
        { title: '🧪 Test 2', message: 'Break time test notification' },
        { title: '🧪 Test 3', message: 'Productivity boost notification' }
    ];
    
    notifications.forEach((notif, index) => {
        setTimeout(() => {
            chrome.runtime.sendMessage({
                action: 'showNotification',
                title: notif.title,
                message: notif.message
            });
        }, index * 3000);
    });
}

// Test storage operations
function testStorageOperations() {
    console.log('Testing storage operations...');
    
    // Test writing
    chrome.storage.sync.set({ 
        debugTest: { 
            timestamp: Date.now(),
            testData: 'Debug test data' 
        } 
    });
    
    chrome.storage.local.set({ 
        debugTestLocal: { 
            timestamp: Date.now(),
            testData: 'Local debug test data' 
        } 
    });
    
    // Test reading
    setTimeout(() => {
        chrome.storage.sync.get(['debugTest'], (result) => {
            console.log('Sync storage test result:', result);
        });
        
        chrome.storage.local.get(['debugTestLocal'], (result) => {
            console.log('Local storage test result:', result);
        });
    }, 1000);
}

// Export logs for analysis
function exportDebugLogs() {
    console.log('Exporting debug logs...');
    
    chrome.runtime.sendMessage({
        action: 'debugCommand',
        command: 'exportLogs'
    }, (response) => {
        if (response.success) {
            console.log('Logs exported:', response.data);
        }
    });
}

// Quick test suite
function runQuickTests() {
    console.log('🚀 Running Spark debug tests...');
    
    setTimeout(testDebugMessages, 1000);
    setTimeout(testStorageInspection, 2000);
    setTimeout(testNotificationSystem, 3000);
    setTimeout(testStorageOperations, 4000);
    setTimeout(exportDebugLogs, 5000);
    
    console.log('✅ Debug tests initiated');
}

// Comprehensive test suite
function runComprehensiveTests() {
    console.log('🚀 Running comprehensive Spark tests...');
    
    setTimeout(testDebugMessages, 1000);
    setTimeout(testStorageInspection, 3000);
    setTimeout(testNotificationSystem, 5000);
    setTimeout(testBreakContentSystem, 8000);
    setTimeout(testAcceleratedTimer, 15000);
    setTimeout(testStorageOperations, 17000);
    setTimeout(exportDebugLogs, 20000);
    
    console.log('✅ Comprehensive tests initiated - will run over 20 seconds');
}

// Auto-run tests if in debug mode
chrome.storage.sync.get(['debugSettings'], (result) => {
    if (result.debugSettings && result.debugSettings.enabled) {
        console.log('🧪 Debug mode detected - running tests');
        runQuickTests();
    } else {
        console.log('ℹ️ Debug mode not enabled. Enable in extension settings to run tests.');
    }
});

// Make functions available globally for manual testing
window.sparkDebugTest = {
    testDebugMessages,
    testStorageInspection,
    testAcceleratedTimer,
    testBreakContentSystem,
    testNotificationSystem,
    testStorageOperations,
    exportDebugLogs,
    runQuickTests,
    runComprehensiveTests
};

console.log('🧪 Debug functions available as window.sparkDebugTest');
