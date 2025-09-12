// Test script for background notifications
// This can be run in the extension's service worker console

// Test 1: Basic notification test
function testBasicNotification() {
    console.log('Testing basic notification...');
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: '🧪 Test Notification',
        message: 'This is a test notification from the service worker',
        priority: 2,
        requireInteraction: true
    }, (notificationId) => {
        if (chrome.runtime.lastError) {
            console.error('Notification error:', chrome.runtime.lastError);
        } else {
            console.log('Notification created:', notificationId);
        }
    });
}

// Test 2: Alarm-triggered notification
function testAlarmNotification() {
    console.log('Testing alarm notification in 10 seconds...');
    
    chrome.alarms.create('testNotification', {
        delayInMinutes: 10 / 60 // 10 seconds
    });
    
    // Set up one-time alarm listener
    function alarmHandler(alarm) {
        if (alarm.name === 'testNotification') {
            console.log('Test alarm triggered!');
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon48.png',
                title: '⏰ Alarm Test',
                message: 'This notification was triggered by an alarm!',
                priority: 2,
                requireInteraction: true
            });
            
            // Remove listener after use
            chrome.alarms.onAlarm.removeListener(alarmHandler);
        }
    }
    
    chrome.alarms.onAlarm.addListener(alarmHandler);
}

// Test 3: Check notification permissions
function checkNotificationPermissions() {
    console.log('Checking notification permissions...');
    
    chrome.permissions.contains({
        permissions: ['notifications']
    }, (hasPermission) => {
        console.log('Has notification permission:', hasPermission);
        
        if (!hasPermission) {
            console.log('Requesting notification permission...');
            chrome.permissions.request({
                permissions: ['notifications']
            }, (granted) => {
                console.log('Permission granted:', granted);
            });
        }
    });
}

// Test 4: Check active alarms
function checkActiveAlarms() {
    chrome.alarms.getAll((alarms) => {
        console.log('Active alarms:', alarms);
        alarms.forEach(alarm => {
            console.log(`- ${alarm.name}: scheduled for ${new Date(alarm.scheduledTime)}`);
        });
    });
}

// Export test functions
if (typeof module !== 'undefined') {
    module.exports = {
        testBasicNotification,
        testAlarmNotification,
        checkNotificationPermissions,
        checkActiveAlarms
    };
}

// Auto-run tests if in console
if (typeof chrome !== 'undefined' && chrome.runtime) {
    console.log('Notification test functions available:');
    console.log('- testBasicNotification()');
    console.log('- testAlarmNotification()');
    console.log('- checkNotificationPermissions()');
    console.log('- checkActiveAlarms()');
}
