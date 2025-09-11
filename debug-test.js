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
    
    // Note: This would need to be called from the popup context
    console.log('Switch to debug panel in popup to test accelerated timers');
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
    setTimeout(exportDebugLogs, 3000);
    
    console.log('✅ Debug tests initiated');
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
    exportDebugLogs,
    runQuickTests
};

console.log('🧪 Debug functions available as window.sparkDebugTest');
