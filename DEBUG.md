# Spark Chrome Extension - Debug Mode

## 🧪 Debug Features Added

This extension now includes comprehensive debug functionality to help with testing and development.

### Debug Mode Features

#### 1. **Debug Logging System**
- **Background Script Logging**: All extension activities are logged with different levels (ERROR, WARN, INFO, DEBUG)
- **Popup Logging**: Timer operations and user interactions are logged
- **Persistent Logs**: Debug logs are stored and can be exported for analysis

#### 2. **Debug Panel**
- Access via 🧪 button in the header (appears when debug mode is enabled)
- **Debug Settings**:
  - Enable/disable debug mode
  - Test mode (5-second timers for quick testing)
  - Accelerated timers (60x speed)
  - Log level control (ERROR, WARN, INFO, DEBUG)

#### 3. **Debug Actions**
- **Test Notification**: Send a test notification
- **View Storage**: Inspect all extension storage data
- **Export Logs**: Download debug logs as JSON
- **Clear Logs**: Reset debug log history
- **Clear All Storage**: Reset all extension data (use with caution)

#### 4. **Test Mode Features**
- **5-Second Timers**: All timer durations become 5 seconds for quick testing
- **Accelerated Mode**: Timers run at 60x speed (1 minute = 1 second)
- **Quick Testing**: Perfect for testing session transitions and break content

### How to Enable Debug Mode

1. **Open the extension popup**
2. **Click the settings gear icon (⚙️)**
3. **Scroll down to find "Debug Mode" section**
4. **Check "Enable Debug Mode"**
5. **The debug button (🧪) will appear in the header**

### Debug Panel Usage

#### Settings Tab
- **Enable Debug Mode**: Master toggle for all debug features
- **Test Mode**: Use 5-second timers instead of normal durations
- **Accelerated Timers**: Run timers at 60x speed (when not in test mode)
- **Log Level**: Control verbosity of logging (ERROR → WARN → INFO → DEBUG)

#### Actions Tab
- **Test Notification**: Verify notification system works
- **View Storage**: Open new tab showing all stored data
- **Export Logs**: Download logs for analysis
- **Clear Logs**: Remove all debug logs
- **Clear All Storage**: Reset extension (⚠️ destructive action)

#### Info Tab
- **Real-time Stats**: Current session info, timer state, session count
- **Quick Status**: Running state, time remaining, current session type

### Testing Scenarios

#### Quick Session Testing
1. Enable "Test Mode" in debug panel
2. Start a focus session (will run for 5 seconds)
3. Test break content and notifications
4. Verify session transitions work correctly

#### Performance Testing
1. Enable "Accelerated Timers" 
2. Start normal duration sessions
3. Watch 25-minute focus sessions complete in 25 seconds
4. Test long-running behavior quickly

#### API Testing
1. Enable debug mode
2. Monitor console for API call logs
3. Test break content (facts, quotes, websites)
4. Check network requests and responses

#### Storage Testing
1. Use "View Storage" to inspect data
2. Test settings persistence
3. Verify stats tracking
4. Test timer state restoration

### Debug Console Commands

Open browser console and run:
```javascript
// Load debug test script (if included)
window.sparkDebugTest.runQuickTests();

// Manual function calls
window.sparkDebugTest.testDebugMessages();
window.sparkDebugTest.exportDebugLogs();
```

### Log Levels Explained

- **ERROR (0)**: Critical issues, API failures, storage errors
- **WARN (1)**: Non-critical issues, fallback actions
- **INFO (2)**: Important events, user actions, state changes
- **DEBUG (3)**: Detailed tracing, API responses, internal state

### Development Workflow

1. **Enable debug mode** for enhanced logging
2. **Use test mode** for rapid iteration
3. **Monitor console** for real-time feedback
4. **Export logs** when issues occur
5. **Clear storage** to test fresh installs

### Troubleshooting

#### Debug Mode Not Showing
- Make sure you've enabled it in settings
- Refresh the popup
- Check if the 🧪 button appears in header

#### Logs Not Appearing
- Check log level setting
- Open browser console (F12)
- Look for `[SPARK-*]` prefixed messages

#### Test Mode Not Working
- Verify test mode is enabled in debug panel
- Try resetting the timer
- Check if 5-second duration is applied

### Security Notes

- Debug mode stores additional data locally
- Exported logs may contain sensitive information
- Clear debug data before distributing
- Debug features are for development only

### Files Modified for Debug Support

- `manifest.json`: Added tabs permission
- `background.js`: Added DebugSystem class and logging
- `popup.js`: Added debug panel and test features
- `popup.html`: Added debug setting option
- `styles.css`: Added debug panel styling
- `debug-test.js`: Test script for console testing

### Performance Impact

- **Minimal impact** when debug mode is disabled
- **Slight overhead** when enabled due to logging
- **Storage usage** increases with log retention
- **No impact** on normal user experience when disabled

---

**Happy debugging! 🧪⚡**
