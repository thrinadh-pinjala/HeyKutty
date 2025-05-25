// Website interaction handler
class WebsiteInteractionHandler {
    constructor() {
        // Define website-specific selectors and actions
        this.websiteConfigs = {
            'youtube.com': {
                searchBar: 'input#search',
                searchButton: 'button#search-icon-legacy',
                actions: {
                    'type in search bar': {
                        pattern: /type in search bar of youtube (.*)/i,
                        handler: async (text) => {
                            await this.typeInElement('input#search', text);
                        }
                    },
                    'search': {
                        pattern: /now search/i,
                        handler: async () => {
                            await this.clickElement('button#search-icon-legacy');
                        }
                    }
                }
            },
            'chat.openai.com': {
                promptBox: 'textarea[data-id="root"]',
                sendButton: 'button[data-testid="send-button"]',
                actions: {
                    'type in prompt box': {
                        pattern: /type in the prompt box of chatgpt (.*)/i,
                        handler: async (text) => {
                            await this.typeInElement('textarea[data-id="root"]', text);
                        }
                    },
                    'search': {
                        pattern: /search about it/i,
                        handler: async () => {
                            await this.clickElement('button[data-testid="send-button"]');
                        }
                    }
                }
            },
            'google.com': {
                searchBar: 'input[name="q"]',
                searchButton: 'input[name="btnK"]',
                actions: {
                    'type in search bar': {
                        pattern: /type in search bar (.*)/i,
                        handler: async (text) => {
                            await this.typeInElement('input[name="q"]', text);
                        }
                    },
                    'search': {
                        pattern: /now search/i,
                        handler: async () => {
                            await this.clickElement('input[name="btnK"]');
                        }
                    }
                }
            }
        };
    }

    // Inject content script into the current tab
    async injectContentScript(tabId) {
        try {
            await chrome.scripting.executeScript({
                target: { tabId },
                files: ['contentScript.js']
            });
        } catch (error) {
            console.error('Error injecting content script:', error);
        }
    }

    // Type text into an element
    async typeInElement(selector, text) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        await this.injectContentScript(tab.id);
        
        await chrome.tabs.sendMessage(tab.id, {
            action: 'typeInElement',
            selector,
            text
        });
    }

    // Click an element
    async clickElement(selector) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        await this.injectContentScript(tab.id);
        
        await chrome.tabs.sendMessage(tab.id, {
            action: 'clickElement',
            selector
        });
    }

    // Process website-specific commands
    async processWebsiteCommand(command) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const url = new URL(tab.url);
        const domain = url.hostname;

        // Find matching website config
        const websiteConfig = this.websiteConfigs[domain];
        if (!websiteConfig) return false;

        // Check each action pattern
        for (const [actionName, actionConfig] of Object.entries(websiteConfig.actions)) {
            const match = command.match(actionConfig.pattern);
            if (match) {
                await actionConfig.handler(match[1] || '');
                return true;
            }
        }

        return false;
    }
}

export default WebsiteInteractionHandler; 