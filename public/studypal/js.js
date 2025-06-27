
    document.addEventListener('DOMContentLoaded', function() {
            const welcomeScreen = document.getElementById('welcomeScreen');
    const startButton = document.getElementById('startButton');
    const chatMessages = document.getElementById('chat-messages');
    const conceptInput = document.getElementById('conceptInput');
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    const modelSelect = document.getElementById('modelSelect');
    const initialMessage = document.getElementById('initialMessage');

    // API configuration
    const OPENROUTER_API_KEY = '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';
    const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
    const MAX_TOKENS = 1024; // Safe token limit

    // Hide welcome screen on start
    startButton.addEventListener('click', function() {
        welcomeScreen.classList.add('hidden');
    conceptInput.focus();

    // Track the start event with Meta Pixel
    fbq('track', 'StartLearning');
            });

    // Scroll to bottom of chat
    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
            }

    // Add message to chat
    function addMessage(content, isUser, tokenInfo = null) {
                // Remove initial message when user sends first message
                if (initialMessage && isUser) {
        initialMessage.remove();

    // Track first message event with Meta Pixel
    fbq('track', 'FirstMessage');
                }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'study-pal-message'}`;

    let footer = '';
    if (tokenInfo) {
        footer = `<div class="message-footer">
                        <span>Model: ${tokenInfo.model}</span>
                        <span>Tokens: ${tokenInfo.prompt_tokens} + ${tokenInfo.completion_tokens} = ${tokenInfo.total_tokens}</span>
                    </div>`;
                }

    messageDiv.innerHTML = `
    <div class="message-avatar ${isUser ? 'user-avatar' : 'study-pal-avatar'}">
        <i class="fas ${isUser ? 'fa-user' : 'fa-robot'}"></i>
    </div>
    <div class="message-bubble ${isUser ? 'user-bubble' : 'study-pal-bubble'}">
        <div class="message-content">${content}</div>
        ${footer}
    </div>
    `;

    chatMessages.appendChild(messageDiv);
    scrollToBottom();
            }

    // Add error message
    function addErrorMessage(content) {
                const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${content}`;
    chatMessages.appendChild(errorDiv);
    scrollToBottom();
            }

    // Add typing indicator
    function showTypingIndicator() {
                const messageDiv = document.createElement('div');
    messageDiv.className = 'message study-pal-message';
    messageDiv.id = 'typing-indicator';

    messageDiv.innerHTML = `
    <div class="message-avatar study-pal-avatar">
        <i class="fas fa-robot"></i>
    </div>
    <div class="message-bubble study-pal-bubble">
        <div class="typing-indicator">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
    </div>
    `;

    chatMessages.appendChild(messageDiv);
    scrollToBottom();
            }

    // Remove typing indicator
    function hideTypingIndicator() {
                const indicator = document.getElementById('typing-indicator');
    if (indicator) {
        indicator.remove();
                }
            }

    // Format response with code blocks and images
    function formatResponse(content) {
        // Format code blocks
        let formattedContent = content.replace(/```(\w+)?\s*([\s\S]*?)```/g, (match, lang, code) => {
                    return `<div class="code-block">
        <div class="code-header">
            <span class="code-lang">${lang || 'code'}</span>
            <button class="copy-btn">Copy</button>
        </div>
        <pre>${code.trim()}</pre>
    </div>`;
                });

                // Format images (if any)
                formattedContent = formattedContent.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, url) => {
                    return `<img src="${url}" alt="${alt}" class="message-image" style="max-width:100%;border-radius:8px;margin-top:10px;">`;
                });

        return formattedContent;
            }

        // Handle copy button click
        chatMessages.addEventListener('click', function(e) {
                if (e.target.classList.contains('copy-btn')) {
                    const codeBlock = e.target.closest('.code-block');
        const code = codeBlock.querySelector('pre').textContent;

        navigator.clipboard.writeText(code)
                        .then(() => {
            e.target.textContent = 'Copied!';
                            setTimeout(() => {
            e.target.textContent = 'Copy';
                            }, 2000);

        // Track copy event with Meta Pixel
        fbq('track', 'CopyCode');
                        });
                }
            });

        // Send message to OpenRouter API
        async function sendMessage() {
                const message = conceptInput.value.trim();
        if (!message) return;

        // Track message event with Meta Pixel
        fbq('track', 'SendMessage');

        // Add user message to chat
        addMessage(message, true);
        conceptInput.value = '';

        // Show typing indicator
        showTypingIndicator();

        try {
                    // Prepare the request to OpenRouter
                    const response = await fetch(OPENROUTER_ENDPOINT, {
            method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://studypal.zm',
        'X-Title': 'StudyPal'
                        },
        body: JSON.stringify({
            model: modelSelect.value,
        max_tokens: MAX_TOKENS,
        messages: [
        {
            role: "system",
        content: "You are StudyPal, a helpful AI study companion. Explain concepts clearly and provide examples. Format code responses properly with syntax highlighting. Keep responses concise."
                                },
        {role: "user", content: message }
        ]
                        })
                    });

        // Handle API errors
        if (!response.ok) {
                        const errorData = await response.json();
        let errorMessage = `API request failed: ${response.status}`;

        if (errorData.error && errorData.error.message) {
            errorMessage += ` - ${errorData.error.message}`;
                        }

        throw new Error(errorMessage);
                    }

        const data = await response.json();
        const aiResponse = data.choices[0].message.content;
        const tokenUsage = data.usage;
        const model = data.model;

        // Remove typing indicator
        hideTypingIndicator();

        // Add formatted AI response
        addMessage(formatResponse(aiResponse), false, {
            model: model,
        prompt_tokens: tokenUsage.prompt_tokens,
        completion_tokens: tokenUsage.completion_tokens,
        total_tokens: tokenUsage.total_tokens
                    });

        // Track successful response with Meta Pixel
        fbq('track', 'ReceiveResponse');
                } catch (error) {
            hideTypingIndicator();
        addErrorMessage(error.message);
        console.error('API Error:', error);

        // Track error event with Meta Pixel
        fbq('track', 'APIError');
                }
            }

        // Event listeners
        sendMessageBtn.addEventListener('click', sendMessage);

        conceptInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
        sendMessage();
                }

        // Auto-resize textarea
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
            });

        // Initial scroll to bottom
        scrollToBottom();
        });
