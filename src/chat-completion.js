/**
 * Convert a prompt from the ChatML objects to the format used by Claude.
 * @param {object[]} messages Array of messages
 * @param {boolean} addHumanPrefix Add Human prefix
 * @param {boolean} addAssistantPostfix Add Assistant postfix
 * @param {boolean} withSystemPrompt Build system prompt before "\n\nHuman: "
 * @returns {string} Prompt for Claude
 * @copyright Prompt Conversion script taken from RisuAI by kwaroran (GPLv3).
 */
function convertClaudePrompt(messages, addHumanPrefix, addAssistantPostfix, withSystemPrompt) {
    // Claude doesn't support message names, so we'll just add them to the message content.
    for (const message of messages) {
        if (message.name && message.role !== 'system') {
            message.content = message.name + ': ' + message.content;
            delete message.name;
        }
    }

    let systemPrompt = '';
    if (withSystemPrompt) {
        let lastSystemIdx = -1;

        for (let i = 0; i < messages.length - 1; i++) {
            const message = messages[i];
            if (message.role === 'system' && !message.name) {
                systemPrompt += message.content + '\n\n';
            } else {
                lastSystemIdx = i - 1;
                break;
            }
        }
        if (lastSystemIdx >= 0) {
            messages.splice(0, lastSystemIdx + 1);
        }
    }

    let requestPrompt = messages.map((v) => {
        let prefix = '';
        switch (v.role) {
            case 'assistant':
                prefix = '\n\nAssistant: ';
                break;
            case 'user':
                prefix = '\n\nHuman: ';
                break;
            case 'system':
                // According to the Claude docs, H: and A: should be used for example conversations.
                if (v.name === 'example_assistant') {
                    prefix = '\n\nA: ';
                } else if (v.name === 'example_user') {
                    prefix = '\n\nH: ';
                } else {
                    prefix = '\n\n';
                }
                break;
        }
        return prefix + v.content;
    }).join('');

    if (addHumanPrefix) {
        requestPrompt = '\n\nHuman: ' + requestPrompt;
    }

    if (addAssistantPostfix) {
        requestPrompt = requestPrompt + '\n\nAssistant: ';
    }

    if (withSystemPrompt) {
        requestPrompt = systemPrompt + requestPrompt;
    }

    return requestPrompt;
}

function convertGooglePrompt(messages, type) {
    const contents = [];
    let lastRole = '';
    let currentText = '';

    const isMultimodal = type === 'gemini-pro-vision';

    if (isMultimodal) {
        const combinedText = messages.map((message) => {
            const role = message.role === 'assistant' ? 'MODEL: ' : 'USER: ';
            return role + message.content;
        }).join('\n\n').trim();

        const imageEntry = messages.find((message) => message.content[1]?.image_url);
        contents.push({
            parts: [
                { text: combinedText },
                {
                    inlineData: {
                        mimeType: 'image/png',
                        data: imageEntry.content[1].image_url.url ?? '',
                    },
                },
            ],
            role: 'user',
        });
    } else {
        messages.forEach((message, index) => {
            const role = message.role === 'assistant' ? 'model' : 'user';
            if (lastRole === role) {
                currentText += '\n\n' + message.content;
            } else {
                if (currentText !== '') {
                    contents.push({
                        parts: [{ text: currentText.trim() }],
                        role: lastRole,
                    });
                }
                currentText = message.content;
                lastRole = role;
            }
            if (index === messages.length - 1) {
                contents.push({
                    parts: [{ text: currentText.trim() }],
                    role: lastRole,
                });
            }
        });
    }

    return contents;
}

module.exports = {
    convertClaudePrompt,
    convertGooglePrompt,
};
