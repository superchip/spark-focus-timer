# 🧪 Spark Extension - Debug Mode Installation & Testing Guide

## Quick Setup for Testing

### 1. Install Extension in Chrome
```bash
# Navigate to your project directory
cd /home/ron/my_projects/spark

# Open Chrome and go to chrome://extensions/
# Enable "Developer mode" (toggle in top-right)
# Click "Load unpacked" and select the spark folder
```

### 2. Enable Debug Mode
1. Click the Spark extension icon in Chrome toolbar
2. Click the settings gear icon (⚙️)
3. Scroll to the bottom and check "Enable Debug Mode"
4. You'll see a 🧪 button appear in the header

### 3. Test Debug Features

#### Quick Test (5-second timers)
1. Click the 🧪 debug button
2. Enable "Test Mode (5 second timers)"
3. Start a focus session - it will complete in 5 seconds
4. Test break content and notifications

#### Accelerated Test (60x speed)
1. Disable test mode
2. Enable "Accelerated Timers (60x speed)"
3. Start a normal session - 25 minutes becomes 25 seconds

#### View Debug Information
1. Open Chrome DevTools (F12)
2. Go to Console tab
3. Look for `[SPARK-*]` prefixed debug messages
4. Use "Export Logs" button to download full logs

### 4. Debug Panel Features

#### Settings Section
- **Debug Mode**: Master toggle
- **Test Mode**: 5-second timers
- **Accelerated**: 60x speed
- **Log Level**: ERROR/WARN/INFO/DEBUG

#### Actions Section
- **Test Notification**: Verify notifications work
- **View Storage**: See all extension data
- **Export Logs**: Download debug logs
- **Clear Logs**: Reset debug history
- **Clear Storage**: Reset everything (⚠️ destructive)

#### Info Section
- Real-time timer status
- Session count and type
- Current running state

### 5. Console Testing

Open DevTools Console and run:
```javascript
// View current debug settings
chrome.storage.sync.get(['debugSettings'], console.log);

// View all storage data
chrome.storage.sync.get(null, console.log);
chrome.storage.local.get(null, console.log);

// Send test message to background
chrome.runtime.sendMessage({
    action: 'debugCommand',
    command: 'simulateNotification'
});
```

### 6. Common Test Scenarios

#### Timer Functionality
- [x] Start/pause/reset works
- [x] Time displays correctly
- [x] Progress ring updates
- [x] Session transitions (focus → break → focus)
- [x] Long break every 4th cycle

#### Break Content
- [x] Random facts load
- [x] Inspirational quotes display
 
- [x] Random websites open
- [x] Content settings work

#### Notifications
- [x] Session complete notifications
- [x] Break time notifications
- [x] Test notifications work

#### Settings Persistence
- [x] Timer durations save
- [x] Content preferences save
- [x] Debug settings persist
- [x] Stats tracking works

### 7. Debugging Tips

#### Check Console Messages
Look for these message types:
- `[SPARK-INFO]` - General events
- `[SPARK-DEBUG]` - Detailed tracing
- `[SPARK-ERROR]` - Issues to investigate
- `[SPARK-WARN]` - Non-critical problems

#### Storage Inspection
Use "View Storage" to check:
- `settings`: User preferences
- `debugSettings`: Debug configuration
- `stats`: Daily statistics
- `timerState`: Active timer data
- `debugLogs`: Debug message history

#### Performance Monitoring
- Monitor memory usage with accelerated timers
- Check for API rate limiting with frequent tests
- Verify cleanup happens correctly

### 8. Known Debug Features

#### Test Mode Benefits
- ✅ Rapid testing of full timer cycles
- ✅ Quick break content verification
- ✅ Fast notification testing
- ✅ Session transition validation

#### Accelerated Mode Benefits
- ✅ Long-term behavior testing
- ✅ Memory leak detection
- ✅ Performance profiling
- ✅ Stress testing APIs

#### Logging Benefits
- ✅ API call tracking
- ✅ Error diagnosis
- ✅ User behavior analysis
- ✅ Performance monitoring

### 9. Reset Instructions

#### Soft Reset (Keep Settings)
```javascript
// Clear only timer state and stats
chrome.storage.local.clear();
```

#### Hard Reset (Everything)
```javascript
// Clear all data
chrome.storage.sync.clear();
chrome.storage.local.clear();
```

Or use the "Clear All Storage" button in debug panel.

### 10. Distribution Notes

Before distributing the extension:
1. Disable debug mode in default settings
2. Remove or comment out debug test files
3. Set log level to ERROR only
4. Clear all debug logs
5. Test with debug mode disabled

---

**Ready to debug! 🧪⚡**

The extension now has comprehensive debug capabilities for thorough testing and development.
