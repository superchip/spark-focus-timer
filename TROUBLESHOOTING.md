# 🔧 Debug Mode Troubleshooting Guide

## Issue: Debug Button Not Showing

### Quick Fix Steps:

#### 1. **Enable Debug Mode in Settings**
- Open Spark extension popup
- Click settings gear (⚙️) button
- Scroll to bottom - you should see "Debug Mode" section
- Check "Enable Debug Mode" checkbox
- Look for 🧪 button in header

#### 2. **If Debug Mode Section is Missing**
The debug section should now be visible at the bottom of settings. If it's not there:
- Close and reopen the extension popup
- Try reloading the extension in chrome://extensions/

#### 3. **Use Console to Enable Debug Mode**
If the UI method doesn't work:

1. **Right-click on extension popup → Inspect**
2. **Go to Console tab**
3. **Paste and run this command:**
```javascript
chrome.storage.sync.set({
    debugSettings: {
        enabled: true,
        logLevel: 2,
        testMode: false,
        acceleratedTimers: false,
        speedMultiplier: 60
    }
}).then(() => {
    console.log('✅ Debug mode enabled! Close and reopen popup.');
});
```

#### 4. **Alternative Console Method**
You can also copy and paste the `debug-console.js` file contents into the console, then run:
```javascript
window.sparkDebugConsole.enable();
```

#### 5. **Force Reload Extension**
1. Go to `chrome://extensions/`
2. Find "Spark" extension
3. Click the reload button (🔄)
4. Open popup again

### Verification Steps:

#### Check if Debug Mode is Active:
```javascript
// Run in popup console
chrome.storage.sync.get(['debugSettings'], (result) => {
    console.log('Debug settings:', result.debugSettings);
});
```

#### Look for Debug Button:
- Should appear as 🧪 next to the settings gear
- Should have tooltip "Debug Panel" on hover

#### Check Console Messages:
- Open browser console (F12)
- Look for messages like `[SPARK-INFO]`, `[SPARK-DEBUG]`

### Common Issues:

#### ❌ "debugSettings is undefined"
**Solution:** Debug mode hasn't been initialized yet
```javascript
// Initialize debug settings
chrome.storage.sync.set({
    debugSettings: { enabled: true, logLevel: 2 }
});
```

#### ❌ Debug button appears but panel doesn't open
**Solution:** Check for JavaScript errors in console
- Look for error messages when clicking 🧪 button
- Try refreshing the popup

#### ❌ Settings section shows but no debug option
**Solution:** HTML file issue
- Extension may need to be reloaded
- Check if `enableDebugMode` checkbox exists in HTML

#### ❌ Debug mode enables but features don't work
**Solution:** Check background script
- Look for background script errors in extension's service worker console
- Go to chrome://extensions/ → Spark → "service worker" link

### Manual Debug Panel Creation:

If all else fails, you can manually create debug features in console:

```javascript
// Create debug button manually
const debugBtn = document.createElement('button');
debugBtn.textContent = '🧪';
debugBtn.style.marginLeft = '10px';
debugBtn.onclick = () => alert('Debug mode is working!');
document.querySelector('.header').appendChild(debugBtn);
```

### Extension Console Access:

#### For Popup:
1. Right-click extension icon → Inspect
2. Console tab will show popup logs

#### For Background Script:
1. Go to chrome://extensions/
2. Find Spark extension
3. Click "service worker" link
4. Console tab will show background logs

### Reset Everything:

If nothing works, reset all extension data:

```javascript
// Clear all extension storage
chrome.storage.sync.clear();
chrome.storage.local.clear();
// Then reload extension and try again
```

### Check Extension Permissions:

Make sure manifest.json has required permissions:
```json
{
  "permissions": ["storage", "tabs", "notifications", "alarms"]
}
```

### Success Indicators:

✅ Debug checkbox appears in settings
✅ 🧪 button appears in header
✅ Console shows debug messages
✅ Debug panel opens when clicking 🧪
✅ Test features work (5-second timers, etc.)

---

**Still having issues?** Check the browser console for error messages and verify the extension has loaded correctly in chrome://extensions/
