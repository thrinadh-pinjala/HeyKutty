// popup.js

let recognition;
let listening = false;
let wakeWordDetected = false;
let commandTimeout;

const startBtn = document.getElementById('start');
const statusDiv = document.getElementById('status');

// Check for browser support
window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if ('SpeechRecognition' in window) {
    recognition = new window.SpeechRecognition();
    recognition.continuous = true; // Changed to true to continuously listen
    recognition.interimResults = true; // Changed to true to get real-time results
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        listening = true;
        statusDiv.textContent = "Listening for 'Kutty'...";
        startBtn.innerHTML = '<i class="fa-solid fa-microphone-slash"></i> Stop Listening';
    };

    recognition.onend = () => {
        if (listening) {
            // Restart recognition if it ends while we're still supposed to be listening
            recognition.start();
        } else {
            statusDiv.textContent = "Stopped listening. Click to start again.";
            startBtn.innerHTML = '<i class="fa-solid fa-microphone"></i> Start Listening';
        }
    };

    recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
            .map(result => result[0].transcript.toLowerCase())
            .join('');

        // Check for wake word
        if (!wakeWordDetected && transcript.includes('hey kutty')) {
            wakeWordDetected = true;
            statusDiv.textContent = "Hey Kutty detected! What can I do for you?";
            
            // Clear any existing timeout
            if (commandTimeout) {
                clearTimeout(commandTimeout);
            }
            
            // Set a timeout to reset wake word detection if no command is given
            commandTimeout = setTimeout(() => {
                wakeWordDetected = false;
                statusDiv.textContent = "Listening for 'Hey Kutty'...";
            }, 5000); // 5 seconds timeout for command
        }
        
        // If wake word is detected, process the command
        if (wakeWordDetected && transcript.includes('hey kutty')) {
            const command = transcript.split('hey kutty')[1].trim();
            if (command) {
                statusDiv.textContent = `Processing command: "${command}"`;
                handleCommand(command);
                wakeWordDetected = false;
            }
        }
    };

    recognition.onerror = (event) => {
        statusDiv.textContent = `Error: ${event.error}`;
        if (event.error === 'no-speech') {
            // Restart recognition on no-speech error
            recognition.start();
        }
    };
} else {
    statusDiv.textContent = "Sorry, your browser doesn't support Speech Recognition.";
    startBtn.disabled = true;
}

function handleCommand(command) {
    // Add your command handling logic here
    console.log('Command received:', command);
    
    // Example command handling
    if (command.includes('open youtube')) {
        chrome.tabs.create({ url: 'https://www.youtube.com' });
    }
    // Add more commands as needed
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