# Spark Extension - Debug Testing Guide

## Overview

The Spark extension now includes comprehensive debugging and testing functionality to help developers and testers validate the extension's behavior quickly and efficiently.

## Debug Interface Features

### 1. Timer Speed Control
- **Speed Multiplier**: Adjust timer speed from 1x (normal) to 3600x (lightning fast)
- **Real-time Application**: Changes apply immediately to running timers
- **Use Cases**: 
  - Test full Pomodoro cycles in seconds instead of minutes
  - Validate session transitions
  - Test notification timing

### 2. Session Testing
- **Test Notifications**: Trigger test notifications instantly
- **Test Break Content**: Validate break content fetching and display
- **Skip to End**: Jump to the end of current session for testing transitions
- **Simulate Sessions**: Run ultra-fast 10-second focus or 5-second break sessions

### 3. Data Management
- **Reset Stats**: Clear all statistics for clean testing
- **Storage Inspector**: View all extension data in real-time
- **Clear All Storage**: Complete data reset (with confirmation)

### 4. Debug Logging
- **Real-time Logs**: See all extension activity with timestamps
- **Log Levels**: Info, Warning, and Error categorization
- **Export Logs**: Download logs as JSON for analysis
- **Persistent Logs**: Logs survive popup closures

## How to Access Debug Features

### Method 1: Extension Popup (Recommended)
1. Open the Spark extension popup
2. Go to Settings (⚙️ button)
3. Enable "Debug Mode" checkbox
4. Close settings - you'll see a debug button (🐛) in the header
5. Click the debug button to open the debug console

### Method 2: Browser Console
1. Open Developer Tools (F12)
2. Navigate to the Console tab
3. Load the debug console: 
   ```javascript
   // Copy and paste this into the console
   var script = document.createElement('script');
   script.src = chrome.runtime.getURL('debug-console.js');
   document.head.appendChild(script);
   ```

## Testing Scenarios

### Scenario 1: Quick Timer Validation
1. Enable debug mode
2. Set speed multiplier to 300x (5 minutes becomes 1 second)
3. Start a focus session
4. Watch the complete cycle: Focus → Break → Focus

### Scenario 2: Notification Testing
1. Click "Test Notification" in debug console
2. Verify notification appears
3. Test both focus complete and break complete notifications

### Scenario 3: Break Content Validation
1. Click "Test Break Content" multiple times
2. Verify different content types open (facts, quotes, NASA images, websites)
3. Check that content displays properly

### Scenario 4: Data Persistence Testing
1. Start a session, let it complete
2. Close and reopen the popup
3. Verify stats are maintained
4. Use "Reset Stats" to clear and test fresh state

### Scenario 5: Speed Testing Full Cycle
1. Set speed to 3600x (lightning mode)
2. Run "Simulate Focus (10s)" 
3. Immediately followed by "Simulate Break (5s)"
4. Observe complete Pomodoro cycle in under 20 seconds

## Debug Console Commands

### Browser Console Commands
```javascript
// Enable debug mode
window.sparkDebugConsole.enable()

// Set ultra-fast speed (1 hour becomes 1 second)
window.sparkDebugConsole.setAcceleratedMode(3600)

// Run all tests
window.sparkDebugConsole.runComprehensiveTests()

// Check current status
window.sparkDebugConsole.check()
```

### Extension Debug Panel
- **Speed Controls**: Dropdown + Apply button
- **Session Controls**: Test buttons for all scenarios
- **Data Controls**: Inspect, reset, and clear functions
- **Log Management**: Clear and export options

## Performance Testing

### Load Testing
1. Enable lightning speed (3600x)
2. Run multiple cycles rapidly
3. Monitor for memory leaks or performance issues
4. Check that notifications don't spam

### Persistence Testing
1. Start sessions with extension open
2. Close popup during sessions
3. Reopen and verify state restoration
4. Test browser restart scenarios

## Troubleshooting

### Debug Mode Not Visible
- Ensure debug mode is enabled in settings
- Refresh the popup after enabling
- Check that the debug button (🐛) appears in header

### Speed Changes Not Working
- Click "Apply" after changing speed multiplier
- If timer is running, it will restart with new speed
- Check debug logs for speed change confirmations

### Storage Issues
- Use "Inspect Storage" to view current data
- "Clear All Storage" for complete reset
- Check both sync and local storage sections

### Content Tests Failing
- Verify internet connection for API calls
- Some APIs may have rate limits
- Check background script logs for API errors

## Advanced Testing

### API Testing
Test break content APIs individually:
```javascript
// Test specific content types
chrome.runtime.sendMessage({
    action: 'debugCommand',
    command: 'testBreakContent',
    contentType: 'nasa'  // or 'fact', 'quote', 'website'
});
```

### Storage Manipulation
```javascript
// Inject test data
chrome.storage.sync.set({
    settings: {
        focusDuration: 1,  // 1 minute focus for testing
        shortBreak: 1,     // 1 minute break
        enableDebugMode: true
    }
});
```

### Message Testing
```javascript
// Test background communication
chrome.runtime.sendMessage({
    action: 'debugCommand',
    command: 'simulateNotification'
});
```

## Best Practices

1. **Always Enable Debug Mode First**: This ensures all logging is captured
2. **Use Appropriate Speeds**: 60x for general testing, 300x for quick cycles, 3600x for rapid testing
3. **Monitor Logs**: Keep debug console open to catch issues immediately
4. **Export Logs**: Save logs when reproducing bugs for analysis
5. **Reset Between Tests**: Use reset functions to ensure clean test states
6. **Test Edge Cases**: Very short sessions, immediate pauses, rapid clicks

## Integration with Development

### Development Workflow
1. Enable debug mode for all development
2. Use accelerated timers for faster iteration
3. Export logs when bugs are found
4. Use storage inspector to verify data changes

### Continuous Testing
- Run comprehensive tests after any timer logic changes
- Validate notification system after UI changes  
- Test storage operations after data model changes
- Verify break content after API changes

This debug system transforms the extension development and testing experience from waiting minutes for timer cycles to completing full tests in seconds.
