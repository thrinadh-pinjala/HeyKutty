import IntentHandler from './intentHandler.js';
import WebsiteInteractionHandler from './websiteInteractions.js';

// Initialize handlers
const intentHandler = new IntentHandler();
const websiteInteractionHandler = new WebsiteInteractionHandler();

// Global voice recognition setup
let globalRecognition;
let isListening = false;
let wakeWordDetected = false;
let commandTimeout;
let fullCommand = '';

// Initialize speech recognition
if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    globalRecognition = new SpeechRecognition();
    globalRecognition.continuous = true;
    globalRecognition.interimResults = true;
    globalRecognition.lang = 'en-US';

    globalRecognition.onstart = () => {
        isListening = true;
        fullCommand = '';
        console.log('Global voice recognition started');
    };

    globalRecognition.onend = () => {
        if (isListening) {
            globalRecognition.start();
        }
    };

    globalRecognition.onresult = (event) => {
        const lastResult = event.results[event.results.length - 1];
        const transcript = lastResult[0].transcript.toLowerCase();
        const isInterimResult = lastResult.isFinal === false;

        // Only process final results for wake word detection
        if (!wakeWordDetected && !isInterimResult && transcript.includes('hey kutty')) {
            wakeWordDetected = true;
            fullCommand = '';
            console.log('Wake word detected!');
            
            // Show notification
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon.png',
                title: 'Hey Kutty',
                message: 'Listening for your command... (Say "done" when finished)'
            });
            
            if (commandTimeout) {
                clearTimeout(commandTimeout);
            }
            
            commandTimeout = setTimeout(() => {
                wakeWordDetected = false;
                fullCommand = '';
                console.log('Command timeout - resetting wake word detection');
            }, 10000);
        }
        
        // If wake word is detected, collect the command
        if (wakeWordDetected) {
            let currentInput = transcript.replace('hey kutty', '').trim();
            
            if (!isInterimResult) {
                if (currentInput.includes('done')) {
                    currentInput = currentInput.replace('done', '').trim();
                    fullCommand += ' ' + currentInput;
                    fullCommand = fullCommand.trim();
                    
                    if (fullCommand) {
                        console.log('Processing command:', fullCommand);
                        // Process the command
                        processCommand(fullCommand);
                    }
                    
                    wakeWordDetected = false;
                    fullCommand = '';
                } else {
                    fullCommand += ' ' + currentInput;
                    fullCommand = fullCommand.trim();
                }
            }
        }
    };

    globalRecognition.onerror = (event) => {
        console.error('Recognition error:', event.error);
        if (event.error === 'no-speech') {
            globalRecognition.start();
        }
    };

    // Start global recognition
    globalRecognition.start();
}

// Function to process commands with enhanced error handling
async function processCommand(command) {
    try {
        // First try to handle website-specific commands
        const handled = await websiteInteractionHandler.processWebsiteCommand(command);
        
        // If not handled as a website command, process as a general command
        if (!handled) {
            const action = intentHandler.processCommand(command);
            await handleAction(action);
        }
    } catch (error) {
        console.error('Error processing command:', error);
        // Show error notification
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon.png',
            title: 'Error',
            message: 'Sorry, I encountered an error processing your command. Please try again.'
        });
    }
}

// Enhanced action handler with better error handling
async function handleAction(action) {
    try {
        console.log('Processing action:', action);

        switch (action.action) {
            case 'openWebsite':
                if (!action.url) {
                    throw new Error('No URL provided for openWebsite action');
                }
                await openWebsite(action.url);
                break;

            case 'search':
                if (!action.query) {
                    throw new Error('No query provided for search action');
                }
                await performSearch(action.query);
                break;

            case 'new tab':
                await createNewTab();
                break;

            case 'close tab':
                await closeCurrentTab();
                break;

            case 'refresh':
            case 'reload':
                await refreshCurrentTab();
                break;

            case 'next tab':
                await switchToNextTab();
                break;

            case 'previous tab':
                await switchToPreviousTab();
                break;

            default:
                // If no specific action is matched, perform a web search
                await performSearch(action.query || '');
        }
    } catch (error) {
        console.error('Error handling action:', error);
        throw error;
    }
}

// Helper functions for browser actions
async function openWebsite(url) {
    return new Promise((resolve, reject) => {
        chrome.tabs.create({ url }, (tab) => {
            chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
                if (tabId === tab.id && info.status === 'complete') {
                    chrome.tabs.onUpdated.removeListener(listener);
                    chrome.tabs.get(tabId, (tab) => {
                        if (tab.url === 'chrome://errorpage/') {
                            // If the website failed to load, perform a search
                            chrome.tabs.update(tabId, {
                                url: `https://www.google.com/search?q=${encodeURIComponent(url.replace('https://', '') + ' official website')}`
                            });
                        }
                        resolve();
                    });
                }
            });
        });
    });
}

async function performSearch(query) {
    return new Promise((resolve) => {
        chrome.tabs.create({ 
            url: `https://www.google.com/search?q=${encodeURIComponent(query)}`
        }, resolve);
    });
}

async function createNewTab() {
    return new Promise((resolve) => {
        chrome.tabs.create({}, resolve);
    });
}

async function closeCurrentTab() {
    return new Promise((resolve) => {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.remove(tabs[0].id, resolve);
        });
    });
}

async function refreshCurrentTab() {
    return new Promise((resolve) => {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.reload(tabs[0].id, resolve);
        });
    });
}

async function switchToNextTab() {
    return new Promise((resolve) => {
        chrome.tabs.query({currentWindow: true}, function(tabs) {
            chrome.tabs.query({active: true, currentWindow: true}, function(currentTab) {
                let currentIndex = tabs.findIndex(tab => tab.id === currentTab[0].id);
                let nextIndex = (currentIndex + 1) % tabs.length;
                chrome.tabs.update(tabs[nextIndex].id, {active: true}, resolve);
            });
        });
    });
}

async function switchToPreviousTab() {
    return new Promise((resolve) => {
        chrome.tabs.query({currentWindow: true}, function(tabs) {
            chrome.tabs.query({active: true, currentWindow: true}, function(currentTab) {
                let currentIndex = tabs.findIndex(tab => tab.id === currentTab[0].id);
                let prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
                chrome.tabs.update(tabs[prevIndex].id, {active: true}, resolve);
            });
        });
    });
}

// Handle messages from popup.js
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.type === "voice-command") {
        await processCommand(message.command);
    } else if (message.type === "toggle-listening") {
        isListening = !isListening;
        if (isListening) {
            globalRecognition.start();
        } else {
            globalRecognition.stop();
        }
    }
});

// Add keyboard shortcut listener
chrome.commands.onCommand.addListener((command) => {
    if (command === "toggle-listening") {
        // Send message to popup to toggle listening
        chrome.runtime.sendMessage({ type: "toggle-listening" });
    }
});
  