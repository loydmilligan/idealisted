# IdeaListed Capture - Chrome Extension

Capture web content, YouTube videos, and articles to IdeaListed as structured markdown notes.

## Features

- **YouTube Videos**: Extracts channel, duration, description, and generates structured video notes
- **Research/Articles**: Extracts author, publish date, content, and creates research notes
- **Links/URLs**: Captures metadata and creates link reference notes
- **AI-Powered**: Uses OpenRouter for intelligent content analysis and summarization
- **Retro UI**: Matches IdeaListed's nostalgic terminal aesthetic

## Installation

### 1. Generate Icons

Before loading the extension, you need to create the icon files:

1. Open `generate-icons.html` in a browser
2. Right-click each icon and "Save image as..."
3. Save them to the `icons/` folder as:
   - `icon16.png`
   - `icon48.png`
   - `icon128.png`

### 2. Load the Extension

**Chrome:**
1. Go to `chrome://extensions`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `chrome-extension` folder

**Vivaldi:**
1. Go to `vivaldi://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `chrome-extension` folder

### 3. Configure Settings

1. Click the extension icon in the toolbar
2. Click "⚙ Settings" at the bottom
3. Enter your IdeaListed server URL (e.g., `http://localhost:3000`)
4. (Optional) Add your OpenRouter API key for AI-powered notes

## Usage

1. Navigate to any web page, YouTube video, or article
2. Click the IdeaListed extension icon
3. Review the detected content type and preview
4. Optionally override the note type
5. Click "Capture" to send to IdeaListed

## Note Types

| Type | Trigger | Fields Extracted |
|------|---------|------------------|
| 🎥 Video | YouTube URLs | Channel, duration, description, timestamps |
| 🔬 Research | Articles, blog posts | Author, publish date, key points, quotes |
| 🔗 Link | All other URLs | Domain, description, metadata |

## AI Processing

When an OpenRouter API key is configured, the extension will:

1. Analyze page content using AI
2. Generate a descriptive title
3. Extract key takeaways and action items
4. Suggest relevant tags
5. Create structured markdown with proper sections

Without AI, basic extraction is used with template-based note generation.

### Recommended Models

**Free:**
- `google/gemini-2.0-flash-exp:free` - Fast, good quality (default)
- `meta-llama/llama-3.2-3b-instruct:free` - Lightweight option

**Paid (better quality):**
- `anthropic/claude-3.5-sonnet` - Best for detailed analysis
- `openai/gpt-4o-mini` - Fast and capable

## API Integration

The extension sends notes to IdeaListed via the `/api/items` endpoint:

```json
{
  "type": "note",
  "text": "Note title",
  "tags": ["video", "learning"],
  "note": {
    "subtype": "video",
    "url": "https://youtube.com/watch?v=...",
    "content": "Markdown content...",
    "media_type": "video/youtube"
  },
  "metadata": {
    "source": "youtube.com",
    "capturedVia": "chrome-extension"
  }
}
```

## Development

### File Structure

```
chrome-extension/
├── manifest.json      # Extension configuration
├── popup.html/js      # Popup UI
├── content.js         # Page content extraction
├── background.js      # AI processing & API calls
├── options.html/js    # Settings page
├── icons/             # Extension icons
└── generate-icons.html # Icon generator utility
```

### Testing

1. Make changes to the source files
2. Go to `chrome://extensions`
3. Click the refresh icon on the extension card
4. Test on various page types

### Debugging

- **Popup**: Right-click extension icon → "Inspect popup"
- **Background**: Extensions page → "service worker" link
- **Content script**: Regular DevTools on the page (Console)

## Troubleshooting

**"Could not analyze page" error:**
- Refresh the page and try again
- Some sites block content scripts

**Connection failed:**
- Verify IdeaListed server is running
- Check the server URL in settings
- Ensure no CORS issues (localhost should work)

**AI processing not working:**
- Verify OpenRouter API key is correct
- Check API quota at openrouter.ai
- Try a different model

## License

Part of the IdeaListed project.
