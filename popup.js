// popup.js

let recognition;
let listening = false;
let wakeWordDetected = false;
let commandTimeout;
let fullCommand = '';
let isInterimResult = false;

const startBtn = document.getElementById('start');
const statusDiv = document.getElementById('status');

// Check for browser support
window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if ('SpeechRecognition' in window) {
    recognition = new window.SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        listening = true;
        fullCommand = '';
        isInterimResult = false;
        statusDiv.textContent = "Listening for 'Hey Kutty'...";
        startBtn.innerHTML = '<i class="fa-solid fa-microphone-slash"></i> Stop Listening';
    };

    recognition.onend = () => {
        if (listening) {
            recognition.start();
        } else {
            statusDiv.textContent = "Stopped listening. Click to start again.";
            startBtn.innerHTML = '<i class="fa-solid fa-microphone"></i> Start Listening';
        }
    };

    recognition.onresult = (event) => {
        // Get the last result
        const lastResult = event.results[event.results.length - 1];
        const transcript = lastResult[0].transcript.toLowerCase();
        isInterimResult = lastResult.isFinal === false;

        // Only process final results for wake word detection
        if (!wakeWordDetected && !isInterimResult && transcript.includes('hey kutty')) {
            wakeWordDetected = true;
            fullCommand = '';
            statusDiv.textContent = "Hey Kutty detected! What can I do for you? (Say 'done' when finished)";
            
            if (commandTimeout) {
                clearTimeout(commandTimeout);
            }
            
            commandTimeout = setTimeout(() => {
                wakeWordDetected = false;
                fullCommand = '';
                statusDiv.textContent = "Listening for 'Hey Kutty'...";
            }, 10000);
        }
        
        // If wake word is detected, collect the command
        if (wakeWordDetected) {
            // Remove the wake word from the transcript if it's present
            let currentInput = transcript.replace('hey kutty', '').trim();
            
            // Only process non-interim results for command collection
            if (!isInterimResult) {
                // Check if the user said "done"
                if (currentInput.includes('done')) {
                    // Remove "done" from the command
                    currentInput = currentInput.replace('done', '').trim();
                    fullCommand += ' ' + currentInput;
                    fullCommand = fullCommand.trim();
                    
                    // Process the complete command
                    if (fullCommand) {
                        statusDiv.textContent = `Processing command: "${fullCommand}"`;
                        chrome.runtime.sendMessage({
                            type: "voice-command",
                            command: fullCommand
                        });
                    }
                    
                    // Reset for next command
                    wakeWordDetected = false;
                    fullCommand = '';
                    statusDiv.textContent = "Listening for 'Hey Kutty'...";
                } else {
                    // Add to the full command
                    fullCommand += ' ' + currentInput;
                    fullCommand = fullCommand.trim();
                    statusDiv.textContent = `Command so far: "${fullCommand}" (Say 'done' when finished)`;
                }
            } else {
                // Show interim results without processing them
                statusDiv.textContent = `Listening... "${currentInput}" (Say 'done' when finished)`;
            }
        }
    };

    recognition.onerror = (event) => {
        statusDiv.textContent = `Error: ${event.error}`;
        if (event.error === 'no-speech') {
            recognition.start();
        }
    };
} else {
    statusDiv.textContent = "Sorry, your browser doesn't support Speech Recognition.";
    startBtn.disabled = true;
}

function handleCommand(command) {
    console.log('Command received:', command);
    
    // Convert command to lowercase for easier matching
    command = command.toLowerCase();
    
    // Handle website opening
    if (command.includes('open') || command.includes('go to')) {
        let website = command.replace(/open|go to|website|site/g, '').trim();
        
        // Add common website mappings for convenience
        const websiteMap = {
            'youtube': 'youtube.com',
            'google': 'google.com',
            'facebook': 'facebook.com',
            'twitter': 'twitter.com',
            'instagram': 'instagram.com',
            'linkedin': 'linkedin.com',
            'github': 'github.com',
            'amazon': 'amazon.in',
            'netflix': 'netflix.com',
            'spotify': 'spotify.com'
        };
        
        // Check if it's a mapped website
        if (websiteMap[website]) {
            website = websiteMap[website];
        } else {
            // Handle any website input
            // Remove common words that might be spoken
            website = website.replace(/dot|point|dot com|dot in|dot org|dot net|dot edu|dot gov/g, '.');
            
            // Clean up the website name
            website = website.replace(/\s+/g, ''); // Remove spaces
            
            // If the input doesn't look like a domain, try to make it one
            if (!website.includes('.')) {
                // Check if it's a common TLD
                const commonTLDs = ['.com', '.org', '.net', '.in', '.co', '.io'];
                let hasTLD = false;
                
                for (let tld of commonTLDs) {
                    if (website.endsWith(tld)) {
                        hasTLD = true;
                        break;
                    }
                }
                
                // If no TLD found, append .com
                if (!hasTLD) {
                    website += '.com';
                }
            }
        }
        
        // Add https:// if not present
        if (!website.startsWith('http://') && !website.startsWith('https://')) {
            website = 'https://' + website;
        }
        
        // Try to open the website
        chrome.tabs.create({ url: website }, (tab) => {
            // If the website fails to load, perform a search instead
            chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
                if (tabId === tab.id && info.status === 'complete') {
                    chrome.tabs.onUpdated.removeListener(listener);
                    chrome.tabs.get(tabId, (tab) => {
                        if (tab.url === 'chrome://errorpage/') {
                            // If the website failed to load, perform a search
                            chrome.tabs.update(tabId, {
                                url: `https://www.google.com/search?q=${encodeURIComponent(website.replace('https://', ''))}`
                            });
                        }
                    });
                }
            });
        });
        return;
    }
    
    // Handle web searches
    if (command.includes('search for') || command.includes('look up')) {
        let searchQuery = command.replace(/search for|look up/g, '').trim();
        chrome.tabs.create({ url: `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}` });
        return;
    }
    
    // Handle browser actions
    if (command.includes('new tab')) {
        chrome.tabs.create({});
        return;
    }
    
    if (command.includes('close tab')) {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.remove(tabs[0].id);
        });
        return;
    }
    
    if (command.includes('refresh') || command.includes('reload')) {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.reload(tabs[0].id);
        });
        return;
    }
    
    // If no specific command is matched, perform a web search
    chrome.tabs.create({ url: `https://www.google.com/search?q=${encodeURIComponent(command)}` });
}

startBtn.addEventListener('click', () => {
    if (listening) {
        listening = false;
        recognition.stop();
    } else {
        listening = true;
        wakeWordDetected = false;
        recognition.start();
    }
});