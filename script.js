// Markdown to HTML Converter - Main JavaScript File
// Real-time conversion, copy to clipboard, and download functionality

class MarkdownConverter {
    constructor() {
        // DOM Elements
        this.markdownInput = document.getElementById('markdownInput');
        this.htmlOutput = document.getElementById('htmlOutput');
        this.copyBtn = document.getElementById('copyBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.easyModeBtn = document.getElementById('easyModeBtn');
        this.helpTooltip = document.getElementById('helpTooltip');

        // State
        this.lastConvertedHTML = '';
        this.easyModeEnabled = true; // Default ON for better UX
        this.conversionLog = []; // Track converted lines for debugging
        this.rawMarkdown = ''; // Store the actual Markdown after transformation

        // Initialize the application
        this.init();
    }

    init() {
        // Configure marked.js options for better output
        if (typeof marked !== 'undefined') {
            marked.setOptions({
                highlight: function(code, lang) {
                    // Basic syntax highlighting placeholder
                    return `<code class="language-${lang}">${this.escapeHtml(code)}</code>`;
                }.bind(this),
                breaks: true,
                gfm: true,
                tables: true,
                sanitize: false
            });
        }

        // Bind event listeners
        this.bindEvents();

        // Set initial placeholder for Easy Mode
        this.updatePlaceholderForEasyMode();

        // Update Easy Mode button state
        if (this.easyModeBtn) {
            this.easyModeBtn.textContent = this.easyModeEnabled ? '🎯 Easy Mode: ON' : '📝 Easy Mode: OFF';
            this.easyModeBtn.className = this.easyModeEnabled ? 'btn btn-success' : 'btn btn-secondary';
        }

        // Initial conversion with placeholder content
        this.convertMarkdown();

        // Show welcome message
        this.showNotification('🚀 Markdown Converter Ready! Easy Mode is ON - try natural language commands!', 'success');
    }

    bindEvents() {
        // Real-time conversion on input
        this.markdownInput.addEventListener('input', () => {
            this.convertMarkdown();
        });

        // Keyboard shortcuts
        this.markdownInput.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Button click events
        this.copyBtn.addEventListener('click', () => {
            this.copyToClipboard();
        });

        this.downloadBtn.addEventListener('click', () => {
            this.downloadHTML();
        });

        this.clearBtn.addEventListener('click', () => {
            this.clearContent();
        });

        // Easy Mode toggle button
        if (this.easyModeBtn) {
            this.easyModeBtn.addEventListener('click', () => {
                this.toggleEasyMode();
            });
        }

        // Help tooltip toggle
        if (this.helpTooltip) {
            this.helpTooltip.addEventListener('click', () => {
                this.toggleHelpModal();
            });
        }

        // Prevent default drag and drop, add custom handling
        this.markdownInput.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        this.markdownInput.addEventListener('drop', (e) => {
            e.preventDefault();
            this.handleFileDrop(e);
        });
    }

    convertMarkdown() {
        try {
            let markdownText = this.markdownInput.value;
            
            if (typeof marked === 'undefined') {
                this.htmlOutput.innerHTML = '<p style="color: #ff6b6b;">❌ Error: marked.js library not loaded. Please check your internet connection.</p>';
                return;
            }

            // Apply Easy Mode transformation if enabled
            if (this.easyModeEnabled) {
                markdownText = this.transformEasySyntaxToMarkdown(markdownText);
                this.rawMarkdown = markdownText; // Store transformed markdown
            } else {
                this.rawMarkdown = markdownText;
            }

            // Convert markdown to HTML
            const htmlContent = marked.parse(markdownText);
            this.lastConvertedHTML = htmlContent;

            // Update the preview
            this.htmlOutput.innerHTML = htmlContent;

            // Add syntax highlighting class if code blocks exist
            this.addSyntaxHighlighting();

            // Show conversion log if debug mode is enabled
            this.updateConversionLog();

        } catch (error) {
            console.error('Conversion error:', error);
            this.htmlOutput.innerHTML = `<p style="color: #ff6b6b;">❌ Conversion Error: ${error.message}</p>`;
        }
    }

    /**
     * Smart Markdown Input Parser
     * Transforms natural language commands into valid Markdown syntax
     * @param {string} inputText - Raw user input
     * @returns {string} - Transformed Markdown text
     */
    transformEasySyntaxToMarkdown(inputText) {
        if (!inputText || inputText.trim() === '') return inputText;

        const lines = inputText.split('\n');
        const transformedLines = [];
        this.conversionLog = []; // Reset conversion log

        lines.forEach((line, index) => {
            const originalLine = line;
            let transformedLine = line;
            let wasTransformed = false;

            // Skip empty lines and lines that are already valid Markdown
            if (line.trim() === '' || this.isAlreadyMarkdown(line)) {
                transformedLines.push(line);
                return;
            }

            // Transform natural language patterns to Markdown
            const transformations = [
                // Headings (must come first to avoid conflicts)
                { 
                    pattern: /^heading\s*([1-6]):\s*(.+)$/i, 
                    replacement: (match, level, text) => '#'.repeat(parseInt(level)) + ' ' + text.trim(),
                    description: 'Heading conversion'
                },
                
                // Bold text
                { 
                    pattern: /^bold\s*this:\s*(.+)$/i, 
                    replacement: (match, text) => '**' + text.trim() + '**',
                    description: 'Bold text conversion'
                },
                
                // Italic text
                { 
                    pattern: /^italic\s*this:\s*(.+)$/i, 
                    replacement: (match, text) => '*' + text.trim() + '*',
                    description: 'Italic text conversion'
                },
                
                // Blockquote
                { 
                    pattern: /^quote\s*this:\s*(.+)$/i, 
                    replacement: (match, text) => '> ' + text.trim(),
                    description: 'Blockquote conversion'
                },
                
                // Links with URL
                { 
                    pattern: /^link\s*this:\s*(.+?)\s*\|\s*(.+)$/i, 
                    replacement: (match, text, url) => '[' + text.trim() + '](' + url.trim() + ')',
                    description: 'Link with URL conversion'
                },
                
                // Simple links (just text, auto-detect URL)
                { 
                    pattern: /^link\s*this:\s*(https?:\/\/\S+)$/i, 
                    replacement: (match, url) => '[' + url + '](' + url + ')',
                    description: 'Auto-link conversion'
                },
                
                // Horizontal rule / line break
                { 
                    pattern: /^(break\s*line|new\s*line|horizontal\s*rule|line\s*break)$/i, 
                    replacement: () => '---',
                    description: 'Horizontal rule conversion'
                },
                
                // Code inline
                { 
                    pattern: /^code\s*this:\s*(.+)$/i, 
                    replacement: (match, text) => '`' + text.trim() + '`',
                    description: 'Inline code conversion'
                },
                
                // Unordered list item
                { 
                    pattern: /^list\s*item:\s*(.+)$/i, 
                    replacement: (match, text) => '- ' + text.trim(),
                    description: 'List item conversion'
                },
                
                // Numbered list item
                { 
                    pattern: /^number\s*item:\s*(.+)$/i, 
                    replacement: (match, text) => '1. ' + text.trim(),
                    description: 'Numbered list conversion'
                },
                
                // Strikethrough
                { 
                    pattern: /^strike\s*this:\s*(.+)$/i, 
                    replacement: (match, text) => '~~' + text.trim() + '~~',
                    description: 'Strikethrough conversion'
                },
                
                // Inline patterns within regular text
                { 
                    pattern: /\bmake\s*bold:\s*([^,\n]+)/gi, 
                    replacement: (match, text) => '**' + text.trim() + '**',
                    description: 'Inline bold conversion'
                },
                
                { 
                    pattern: /\bmake\s*italic:\s*([^,\n]+)/gi, 
                    replacement: (match, text) => '*' + text.trim() + '*',
                    description: 'Inline italic conversion'
                }
            ];

            // Apply transformations
            for (const transformation of transformations) {
                if (transformation.pattern.test(transformedLine)) {
                    transformedLine = transformedLine.replace(transformation.pattern, transformation.replacement);
                    wasTransformed = true;
                    
                    // Log the transformation
                    this.conversionLog.push({
                        lineNumber: index + 1,
                        original: originalLine,
                        transformed: transformedLine,
                        description: transformation.description
                    });
                    break; // Only apply first matching transformation per line
                }
            }

            transformedLines.push(transformedLine);
        });

        return transformedLines.join('\n');
    }

    /**
     * Check if a line is already valid Markdown syntax
     * @param {string} line - Line to check
     * @returns {boolean} - True if already Markdown
     */
    isAlreadyMarkdown(line) {
        const markdownPatterns = [
            /^#{1,6}\s+/, // Headers
            /^\*\*.*\*\*/, // Bold
            /^\*.*\*/, // Italic
            /^>\s+/, // Blockquotes
            /^\[.*\]\(.*\)/, // Links
            /^-{3,}$/, // Horizontal rules
            /^`.*`/, // Inline code
            /^```/, // Code blocks
            /^[-*+]\s+/, // Unordered lists
            /^\d+\.\s+/, // Ordered lists
            /^~~.*~~/, // Strikethrough
        ];

        return markdownPatterns.some(pattern => pattern.test(line.trim()));
    }

    /**
     * Update the conversion log display (for debugging)
     */
    updateConversionLog() {
        // Only show conversion log in console for now
        if (this.conversionLog.length > 0 && this.easyModeEnabled) {
            console.group('🔄 Easy Mode Conversions:');
            this.conversionLog.forEach(log => {
                console.log(`Line ${log.lineNumber}: ${log.description}`);
                console.log(`  Original: "${log.original}"`);
                console.log(`  Transformed: "${log.transformed}"`);
            });
            console.groupEnd();
        }
    }

    addSyntaxHighlighting() {
        // Add basic styling to code blocks
        const codeBlocks = this.htmlOutput.querySelectorAll('pre code');
        codeBlocks.forEach(block => {
            block.style.display = 'block';
            block.style.padding = '1rem';
            block.style.borderRadius = '6px';
            block.style.overflow = 'auto';
        });
    }

    async copyToClipboard() {
        try {
            if (!this.lastConvertedHTML.trim()) {
                this.showNotification('⚠️ No content to copy!', 'warning');
                return;
            }

            await navigator.clipboard.writeText(this.lastConvertedHTML);
            this.showNotification('📋 HTML copied to clipboard!', 'success');
            
            // Visual feedback
            this.copyBtn.textContent = '✅ Copied!';
            setTimeout(() => {
                this.copyBtn.textContent = '📋 Copy HTML';
            }, 2000);

        } catch (error) {
            console.error('Copy failed:', error);
            
            // Fallback for older browsers
            this.fallbackCopyToClipboard(this.lastConvertedHTML);
        }
    }

    fallbackCopyToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            document.execCommand('copy');
            this.showNotification('📋 HTML copied to clipboard!', 'success');
        } catch (error) {
            this.showNotification('❌ Copy failed. Please select and copy manually.', 'error');
        }

        document.body.removeChild(textArea);
    }

    downloadHTML() {
        try {
            if (!this.lastConvertedHTML.trim()) {
                this.showNotification('⚠️ No content to download!', 'warning');
                return;
            }

            // Create complete HTML document
            const completeHTML = this.createCompleteHTMLDocument(this.lastConvertedHTML);

            // Create blob and download
            const blob = new Blob([completeHTML], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);

            // Create download link
            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = `markdown-output-${this.getFormattedDate()}.html`;
            downloadLink.style.display = 'none';

            // Trigger download
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);

            // Clean up
            URL.revokeObjectURL(url);

            this.showNotification('⬇️ HTML file downloaded successfully!', 'success');

            // Visual feedback
            this.downloadBtn.textContent = '✅ Downloaded!';
            setTimeout(() => {
                this.downloadBtn.textContent = '⬇️ Download HTML';
            }, 2000);

        } catch (error) {
            console.error('Download failed:', error);
            this.showNotification('❌ Download failed. Please try again.', 'error');
        }
    }

    createCompleteHTMLDocument(htmlContent) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Markdown Output - ${this.getFormattedDate()}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #fff;
        }
        
        h1, h2, h3, h4, h5, h6 {
            color: #2c3e50;
            margin-top: 24px;
            margin-bottom: 16px;
            font-weight: 600;
        }
        
        h1 { font-size: 2rem; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
        h2 { font-size: 1.7rem; border-bottom: 1px solid #bdc3c7; padding-bottom: 8px; }
        h3 { font-size: 1.4rem; }
        h4 { font-size: 1.2rem; }
        h5 { font-size: 1.1rem; }
        h6 { font-size: 1rem; }
        
        p { margin: 16px 0; }
        
        ul, ol { margin: 16px 0; padding-left: 24px; }
        li { margin: 4px 0; }
        
        blockquote {
            border-left: 4px solid #3498db;
            margin: 20px 0;
            padding: 16px 20px;
            background: #f8f9fa;
            border-radius: 0 6px 6px 0;
            font-style: italic;
        }
        
        code {
            background: #f1f2f6;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
            font-size: 0.9em;
            color: #e74c3c;
        }
        
        pre {
            background: #2d3748;
            color: #e2e8f0;
            padding: 20px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 20px 0;
        }
        
        pre code {
            background: none;
            padding: 0;
            color: inherit;
            font-size: 0.9rem;
        }
        
        a {
            color: #3498db;
            text-decoration: none;
            border-bottom: 1px solid transparent;
            transition: border-color 0.3s ease;
        }
        
        a:hover { border-bottom-color: #3498db; }
        
        strong { color: #e74c3c; font-weight: 600; }
        em { color: #27ae60; font-style: italic; }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background: #fff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        th, td {
            padding: 12px 16px;
            text-align: left;
            border-bottom: 1px solid #e1e8ed;
        }
        
        th {
            background: #f8f9fa;
            font-weight: 600;
            color: #2c3e50;
        }
        
        hr {
            border: none;
            height: 2px;
            background: linear-gradient(45deg, #3498db, #2980b9);
            margin: 30px 0;
            border-radius: 1px;
        }
        
        img {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        @media (max-width: 768px) {
            body { padding: 15px; }
            h1 { font-size: 1.8rem; }
            h2 { font-size: 1.5rem; }
        }
    </style>
</head>
<body>
${htmlContent}

<footer style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #e1e8ed; text-align: center; color: #7f8c8d; font-size: 0.9rem;">
    <p>Generated by Markdown to HTML Converter on ${this.getFormattedDateTime()}</p>
</footer>
</body>
</html>`;
    }

    clearContent() {
        if (this.markdownInput.value.trim() === '') {
            this.showNotification('⚠️ Content is already empty!', 'warning');
            return;
        }

        if (confirm('🗑️ Are you sure you want to clear all content?')) {
            this.markdownInput.value = '';
            this.htmlOutput.innerHTML = '<p style="color: #8b8ba7; font-style: italic;">Start typing Markdown to see the live preview...</p>';
            this.lastConvertedHTML = '';
            this.markdownInput.focus();
            this.showNotification('🗑️ Content cleared!', 'success');
        }
    }

    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + S: Download
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            this.downloadHTML();
        }

        // Ctrl/Cmd + C: Copy (only when Ctrl+A was pressed before)
        if ((e.ctrlKey || e.metaKey) && e.key === 'c' && this.markdownInput.selectionStart === 0 && this.markdownInput.selectionEnd === this.markdownInput.value.length) {
            // Let default copy behavior happen, but also offer HTML copy
            setTimeout(() => {
                if (confirm('📋 Copy HTML instead of Markdown?')) {
                    this.copyToClipboard();
                }
            }, 100);
        }

        // Tab: Insert tab character (instead of focusing next element)
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = this.markdownInput.selectionStart;
            const end = this.markdownInput.selectionEnd;
            const value = this.markdownInput.value;
            
            this.markdownInput.value = value.substring(0, start) + '\t' + value.substring(end);
            this.markdownInput.selectionStart = this.markdownInput.selectionEnd = start + 1;
            
            // Trigger conversion after tab insertion
            this.convertMarkdown();
        }
    }

    handleFileDrop(e) {
        const files = Array.from(e.dataTransfer.files);
        const markdownFile = files.find(file => 
            file.name.endsWith('.md') || 
            file.name.endsWith('.markdown') || 
            file.name.endsWith('.txt')
        );

        if (markdownFile) {
            const reader = new FileReader();
            reader.onload = (event) => {
                this.markdownInput.value = event.target.result;
                this.convertMarkdown();
                this.showNotification(`📄 File "${markdownFile.name}" loaded successfully!`, 'success');
            };
            reader.readAsText(markdownFile);
        } else {
            this.showNotification('❌ Please drop a .md, .markdown, or .txt file!', 'error');
        }
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        // Styles
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '15px 20px',
            borderRadius: '8px',
            color: '#fff',
            fontWeight: '600',
            fontSize: '0.9rem',
            zIndex: '9999',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            transform: 'translateX(400px)',
            transition: 'all 0.3s ease',
            maxWidth: '300px',
            wordWrap: 'break-word'
        });

        // Type-specific colors
        const colors = {
            success: 'linear-gradient(45deg, #27ae60, #2ecc71)',
            error: 'linear-gradient(45deg, #e74c3c, #c0392b)',
            warning: 'linear-gradient(45deg, #f39c12, #e67e22)',
            info: 'linear-gradient(45deg, #3498db, #2980b9)'
        };
        
        notification.style.background = colors[type] || colors.info;

        // Add to DOM
        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Auto remove
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 3000);
    }

    getFormattedDate() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }

    getFormattedDateTime() {
        const now = new Date();
        return now.toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    /**
     * Toggle Easy Mode on/off
     */
    toggleEasyMode() {
        this.easyModeEnabled = !this.easyModeEnabled;
        
        // Update button text and styling
        if (this.easyModeBtn) {
            this.easyModeBtn.textContent = this.easyModeEnabled ? '🎯 Easy Mode: ON' : '📝 Easy Mode: OFF';
            this.easyModeBtn.className = this.easyModeEnabled ? 'btn btn-success' : 'btn btn-secondary';
        }

        // Re-convert with new mode
        this.convertMarkdown();

        // Show notification
        const message = this.easyModeEnabled 
            ? '🎯 Easy Mode ON! You can now use natural language commands.'
            : '📝 Easy Mode OFF! Using standard Markdown syntax only.';
        this.showNotification(message, this.easyModeEnabled ? 'success' : 'info');

        // Update placeholder text
        if (this.easyModeEnabled) {
            this.updatePlaceholderForEasyMode();
        } else {
            this.updatePlaceholderForMarkdown();
        }
    }

    /**
     * Update placeholder text for Easy Mode
     */
    updatePlaceholderForEasyMode() {
        this.markdownInput.placeholder = `🎯 Easy Mode is ON! Try these natural commands:

Heading 1: My Portfolio
Heading 2: About Me
bold this: Welcome to my website
italic this: This is emphasized text
quote this: Never give up on your dreams
link this: Visit GitHub | https://github.com
list item: First feature
list item: Second feature
number item: Step one
number item: Step two
code this: console.log('Hello')
break line

Or use regular Markdown syntax - both work!

## Traditional Markdown
- **Bold text**
- *Italic text*
- [Links](https://example.com)`;
    }

    /**
     * Update placeholder text for standard Markdown
     */
    updatePlaceholderForMarkdown() {
        this.markdownInput.placeholder = `# Welcome to Markdown to HTML Converter

Start typing your Markdown here...

## Features:
- **Real-time preview**
- Copy to clipboard
- Download as HTML file
- Responsive design

### Example Code:
\`\`\`javascript
console.log('Hello, World!');
\`\`\`

> This is a blockquote example

1. Ordered list item 1
2. Ordered list item 2

- Unordered list item
- Another item

[Link to GitHub](https://github.com)

*Italic text* and **bold text**`;
    }

    /**
     * Toggle help modal with command reference
     */
    toggleHelpModal() {
        // Remove existing modal if present
        const existingModal = document.querySelector('.help-modal');
        if (existingModal) {
            existingModal.remove();
            return;
        }

        // Create help modal
        const modal = document.createElement('div');
        modal.className = 'help-modal';
        
        modal.innerHTML = `
            <div class="help-modal-content">
                <div class="help-modal-header">
                    <h3>🎯 Easy Mode Commands Reference</h3>
                    <button class="help-close-btn" onclick="this.closest('.help-modal').remove()">✕</button>
                </div>
                <div class="help-modal-body">
                    <div class="help-section">
                        <h4>📝 Text Formatting</h4>
                        <div class="help-command">
                            <code>bold this: Your text</code> → <strong>Your text</strong>
                        </div>
                        <div class="help-command">
                            <code>italic this: Your text</code> → <em>Your text</em>
                        </div>
                        <div class="help-command">
                            <code>strike this: Your text</code> → <del>Your text</del>
                        </div>
                        <div class="help-command">
                            <code>code this: console.log()</code> → <code>console.log()</code>
                        </div>
                    </div>
                    
                    <div class="help-section">
                        <h4>📋 Headers & Structure</h4>
                        <div class="help-command">
                            <code>Heading 1: Title</code> → <h4 style="margin:5px 0">Title</h4>
                        </div>
                        <div class="help-command">
                            <code>Heading 2: Subtitle</code> → <h5 style="margin:5px 0">Subtitle</h5>
                        </div>
                        <div class="help-command">
                            <code>quote this: Wisdom</code> → <blockquote style="margin:5px 0;padding:5px 10px;border-left:3px solid #4ecdc4;background:rgba(78,205,196,0.1)">Wisdom</blockquote>
                        </div>
                        <div class="help-command">
                            <code>break line</code> → Horizontal rule (---)
                        </div>
                    </div>
                    
                    <div class="help-section">
                        <h4>🔗 Links & Lists</h4>
                        <div class="help-command">
                            <code>link this: GitHub | https://github.com</code> → <a href="#">GitHub</a>
                        </div>
                        <div class="help-command">
                            <code>list item: Feature one</code> → • Feature one
                        </div>
                        <div class="help-command">
                            <code>number item: Step one</code> → 1. Step one
                        </div>
                    </div>
                    
                    <div class="help-section">
                        <h4>💡 Pro Tips</h4>
                        <ul style="margin: 10px 0; padding-left: 20px;">
                            <li>Mix natural commands with regular Markdown syntax</li>
                            <li>Commands are case-insensitive</li>
                            <li>One command per line works best</li>
                            <li>Check browser console for conversion logs</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;

        // Add modal styles
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            backdrop-filter: blur(5px);
        `;

        document.body.appendChild(modal);

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.markdownConverter = new MarkdownConverter();
});

// Service Worker registration for PWA capabilities (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Note: Service worker file would need to be created separately
        // navigator.serviceWorker.register('/sw.js');
    });
}

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MarkdownConverter;
}