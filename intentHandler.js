// Intent understanding system
class IntentHandler {
    constructor() {
        // Enhanced website mappings with more variations and aliases
        this.websiteMappings = {
            'youtube': {
                url: 'https://www.youtube.com',
                aliases: ['yt', 'youtube.com', 'youtube', 'you tube', 'you-tube'],
                relatedTerms: ['video', 'videos', 'watch', 'streaming']
            },
            'netflix': {
                url: 'https://www.netflix.com',
                aliases: ['netflix.com', 'net flix', 'net-flix'],
                relatedTerms: ['movies', 'shows', 'streaming', 'watch']
            },
            'google': {
                url: 'https://www.google.com',
                aliases: ['google.com', 'goog', 'goo gle'],
                relatedTerms: ['search', 'find', 'look up']
            },
            'github': {
                url: 'https://github.com',
                aliases: ['github.com', 'git hub', 'git-hub'],
                relatedTerms: ['code', 'repository', 'developer']
            },
            'chatgpt': {
                url: 'https://chat.openai.com',
                aliases: ['chat.openai.com', 'openai', 'chat gpt', 'chat-gpt'],
                relatedTerms: ['ai', 'chatbot', 'assistant']
            }
        };

        // Intent patterns with confidence scoring
        this.intentPatterns = {
            openWebsite: {
                patterns: [
                    { regex: /open\s+(.+)/i, confidence: 0.9 },
                    { regex: /go\s+to\s+(.+)/i, confidence: 0.8 },
                    { regex: /navigate\s+to\s+(.+)/i, confidence: 0.7 },
                    { regex: /visit\s+(.+)/i, confidence: 0.7 }
                ]
            },
            search: {
                patterns: [
                    { regex: /search\s+for\s+(.+)/i, confidence: 0.9 },
                    { regex: /look\s+up\s+(.+)/i, confidence: 0.8 },
                    { regex: /find\s+(.+)/i, confidence: 0.7 }
                ]
            },
            browserAction: {
                patterns: [
                    { regex: /new\s+tab/i, confidence: 0.9, action: 'new tab' },
                    { regex: /close\s+tab/i, confidence: 0.9, action: 'close tab' },
                    { regex: /refresh|reload/i, confidence: 0.9, action: 'refresh' },
                    { regex: /next\s+tab/i, confidence: 0.9, action: 'next tab' },
                    { regex: /previous\s+tab/i, confidence: 0.9, action: 'previous tab' }
                ]
            }
        };
    }

    // Enhanced Levenshtein distance with normalization
    calculateSimilarity(str1, str2) {
        const m = str1.length;
        const n = str2.length;
        const dp = Array(m + 1).fill().map(() => Array(n + 1).fill(0));

        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;

        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (str1[i - 1] === str2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = Math.min(
                        dp[i - 1][j - 1] + 1,
                        dp[i][j - 1] + 1,
                        dp[i - 1][j] + 1
                    );
                }
            }
        }

        const maxLength = Math.max(m, n);
        return 1 - (dp[m][n] / maxLength);
    }

    // Enhanced website matching with context
    findBestWebsiteMatch(input) {
        let bestMatch = null;
        let highestScore = 0;

        // Clean and normalize input
        input = input.toLowerCase().trim();

        for (const [key, website] of Object.entries(this.websiteMappings)) {
            // Check direct matches
            if (website.aliases.includes(input)) {
                return { url: website.url, score: 1.0 };
            }

            // Calculate similarity scores
            const aliasScores = website.aliases.map(alias => 
                this.calculateSimilarity(input, alias)
            );
            const relatedScores = website.relatedTerms.map(term => 
                this.calculateSimilarity(input, term) * 0.5 // Lower weight for related terms
            );

            const maxScore = Math.max(...aliasScores, ...relatedScores);
            
            if (maxScore > highestScore && maxScore > 0.6) { // Threshold for matching
                highestScore = maxScore;
                bestMatch = { url: website.url, score: maxScore };
            }
        }

        return bestMatch;
    }

    // Enhanced intent detection with confidence scoring
    determineIntent(command) {
        let bestIntent = null;
        let highestConfidence = 0;

        for (const [intentType, patterns] of Object.entries(this.intentPatterns)) {
            for (const pattern of patterns.patterns) {
                const match = command.match(pattern.regex);
                if (match) {
                    const confidence = pattern.confidence;
                    if (confidence > highestConfidence) {
                        highestConfidence = confidence;
                        bestIntent = {
                            type: intentType,
                            confidence: confidence,
                            match: match[1] || pattern.action,
                            action: pattern.action
                        };
                    }
                }
            }
        }

        return bestIntent;
    }

    // Main command processing with enhanced error handling
    processCommand(command) {
        try {
            console.log('Processing command:', command);
            
            // Determine the intent
            const intent = this.determineIntent(command);
            if (!intent) {
                console.log('No specific intent detected, defaulting to search');
                return {
                    action: 'search',
                    query: command
                };
            }

            // Process based on intent type
            switch (intent.type) {
                case 'openWebsite':
                    const websiteMatch = this.findBestWebsiteMatch(intent.match);
                    if (websiteMatch) {
                        return {
                            action: 'openWebsite',
                            url: websiteMatch.url,
                            confidence: websiteMatch.score
                        };
                    }
                    // Fallback to search if website not found
                    return {
                        action: 'search',
                        query: `${intent.match} official website`
                    };

                case 'search':
                    return {
                        action: 'search',
                        query: intent.match
                    };

                case 'browserAction':
                    return {
                        action: intent.action
                    };

                default:
                    return {
                        action: 'search',
                        query: command
                    };
            }
        } catch (error) {
            console.error('Error processing command:', error);
            // Fallback to search
            return {
                action: 'search',
                query: command
            };
        }
    }
}

// Export the IntentHandler class
export default IntentHandler; 