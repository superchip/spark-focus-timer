// Background service worker for Spark extension

chrome.runtime.onInstalled.addListener(() => {
    console.log('Spark extension installed');
    
    // Set up default settings
    chrome.storage.sync.get(['settings'], (result) => {
        if (!result.settings) {
            const defaultSettings = {
                focusDuration: 25,
                shortBreak: 5,
                longBreak: 30,
                enableNotifications: true,
                enableFacts: true,
                enableQuotes: true,
                enableWebsites: true,
                enableNasa: true
            };
            chrome.storage.sync.set({ settings: defaultSettings });
        }
    });
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'showNotification':
            showNotification(request.title, request.message);
            break;
        case 'openBreakContent':
            openBreakContent(request.type, request.url);
            break;
    }
});

// Show notification
function showNotification(title, message) {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: title,
        message: message,
        priority: 2
    });
}

// Handle break content opening
async function openBreakContent(type, url) {
    try {
        let content = '';
        let finalUrl = '';

        switch (type) {
            case 'fact':
                const factData = await fetchJsonData(url);
                if (factData && factData.text) {
                    content = `Did you know? ${factData.text}`;
                    finalUrl = createContentPage('Interesting Fact', content, '🧠');
                }
                break;

            case 'quote':
                const quoteData = await fetchJsonData(url);
                if (quoteData && quoteData.data && quoteData.data.quoteText) {
                    content = `"${quoteData.data.quoteText}" - ${quoteData.data.quoteAuthor || 'Unknown'}`;
                    finalUrl = createContentPage('Inspirational Quote', content, '💭');
                }
                break;

            case 'nasa':
                const nasaData = await fetchJsonData(url);
                if (nasaData && nasaData.url) {
                    content = `
                        <div style="text-align: center;">
                            <h2>${nasaData.title || 'NASA Image of the Day'}</h2>
                            <img src="${nasaData.url}" style="max-width: 100%; height: auto; border-radius: 12px; margin: 20px 0;">
                            <p style="font-style: italic; color: #666;">${nasaData.explanation || 'Explore the cosmos with NASA!'}</p>
                        </div>
                    `;
                    finalUrl = createContentPage('NASA Discovery', content, '🚀', true);
                }
                break;

            default:
                // For websites, just open the URL directly
                finalUrl = url;
                break;
        }

        if (finalUrl) {
            chrome.tabs.create({ url: finalUrl });
        }
    } catch (error) {
        console.error('Error opening break content:', error);
        // Fallback: open a default interesting website
        chrome.tabs.create({ url: 'https://theuselessweb.com/' });
    }
}

// Fetch JSON data from APIs
async function fetchJsonData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error('Fetch error:', error);
        return null;
    }
}

// Create a content page for break content
function createContentPage(title, content, emoji, isHtml = false) {
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title} - Spark</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                color: white;
            }
            
            .container {
                max-width: 800px;
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(20px);
                border-radius: 20px;
                padding: 40px;
                text-align: center;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            .header {
                margin-bottom: 30px;
            }
            
            .emoji {
                font-size: 48px;
                margin-bottom: 16px;
                display: block;
            }
            
            .title {
                font-size: 28px;
                font-weight: 600;
                margin-bottom: 8px;
                color: white;
            }
            
            .subtitle {
                font-size: 16px;
                color: rgba(255, 255, 255, 0.8);
                margin-bottom: 30px;
            }
            
            .content {
                font-size: 18px;
                line-height: 1.6;
                margin-bottom: 30px;
                ${isHtml ? '' : 'background: rgba(255, 255, 255, 0.1); padding: 24px; border-radius: 12px; border-left: 4px solid white;'}
            }
            
            .timer-info {
                font-size: 14px;
                color: rgba(255, 255, 255, 0.7);
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            .close-btn {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                border-radius: 12px;
                padding: 12px 24px;
                color: white;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                margin-top: 20px;
            }
            
            .close-btn:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: translateY(-2px);
            }
            
            img {
                max-width: 100%;
                height: auto;
                border-radius: 12px;
                margin: 20px 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <span class="emoji">${emoji}</span>
                <h1 class="title">${title}</h1>
                <p class="subtitle">Take a moment to explore and recharge</p>
            </div>
            
            <div class="content">
                ${isHtml ? content : `<p>${content}</p>`}
            </div>
            
            <div class="timer-info">
                <p>⚡ Brought to you by Spark</p>
                <p>Close this tab when you're ready to get back to work!</p>
                <button class="close-btn" onclick="window.close()">Close & Return to Work</button>
            </div>
        </div>
        
        <script>
            // Auto-close after 5 minutes if user doesn't interact
            setTimeout(() => {
                if (confirm('Break time is over! Ready to spark some productivity?')) {
                    window.close();
                }
            }, 300000); // 5 minutes
        </script>
    </body>
    </html>
    `;
    
    const blob = new Blob([html], { type: 'text/html' });
    return URL.createObjectURL(blob);
}

// Handle alarms (for notifications when popup is closed)
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'sparkTimer') {
        showNotification('⚡ Spark Timer', 'Check your timer!');
    }
});

// Cleanup object URLs periodically to prevent memory leaks
setInterval(() => {
    // This is a basic cleanup - in a real extension you'd track created URLs
    console.log('Performing periodic cleanup');
}, 600000); // 10 minutes