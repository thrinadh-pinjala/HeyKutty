// Content script for handling DOM interactions
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
        case 'typeInElement':
            typeInElement(message.selector, message.text);
            break;
        case 'clickElement':
            clickElement(message.selector);
            break;
    }
});

// Function to type text into an element
function typeInElement(selector, text) {
    const element = document.querySelector(selector);
    if (element) {
        // Focus the element
        element.focus();
        
        // Clear existing value
        element.value = '';
        
        // Set the new value
        element.value = text;
        
        // Trigger input event
        element.dispatchEvent(new Event('input', { bubbles: true }));
        
        // Trigger change event
        element.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

// Function to click an element
function clickElement(selector) {
    const element = document.querySelector(selector);
    if (element) {
        element.click();
    }
} 