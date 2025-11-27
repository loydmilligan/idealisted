// IdeaListed Capture Extension - Background Service Worker
// Handles AI processing and API communication

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureToIdeaListed') {
    handleCapture(request.pageData, request.config, request.taskOptions)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
});

// Main capture handler
async function handleCapture(pageData, config, taskOptions = {}) {
  try {
    // Step 1: Process with AI to generate structured note
    const processedNote = await processWithAI(pageData, config);

    // Step 2: Send to IdeaListed
    const noteResult = await sendToIdeaListed(processedNote, config);

    let taskResult = null;

    if (taskOptions?.createTask && noteResult?.item) {
      taskResult = await createStudyTask({
        pageData,
        config,
        note: processedNote,
        noteItem: noteResult.item,
        taskOptions
      });

      // Best-effort link back to the note with metadata/markdown
      if (taskResult?.item) {
        linkNoteToTask({
          noteItem: noteResult.item,
          taskItem: taskResult.item,
          note: processedNote,
          config
        }).catch(err => console.warn('Failed to link note/task:', err));
      }
    }

    return { success: true, data: { note: noteResult, task: taskResult } };
  } catch (error) {
    console.error('Capture error:', error);
    throw error;
  }
}

// Process page data with AI
async function processWithAI(pageData, config) {
  const noteType = pageData.detectedType;

  // Generate prompt based on content type
  const prompt = generatePrompt(pageData, noteType);

  // Call OpenRouter API
  const aiResponse = await callOpenRouter(prompt, config);

  // Parse AI response and create note structure
  const note = parseAIResponse(aiResponse, pageData, noteType);

  return note;
}

// Generate AI prompt based on content type
function generatePrompt(pageData, noteType) {
  const baseContext = `You are a note-taking assistant. Analyze the following web content and create a structured, detailed markdown note. Be thorough but concise. Extract key information, insights, and actionable items.`;

  let typeSpecificPrompt = '';

  if (noteType === 'video') {
    typeSpecificPrompt = `
This is a YouTube video. Create a comprehensive video note with:
1. A concise but descriptive title (not just the video title)
2. Key topics/themes covered
3. Main takeaways (3-5 bullet points)
4. Any actionable items or things to research further
5. Relevant tags (3-5 tags, lowercase, hyphenated)
6. A brief summary of why this video might be worth watching

Video Information:
- Title: ${pageData.title}
- Channel: ${pageData.channel || 'Unknown'}
- Duration: ${pageData.duration || 'Unknown'}
- Published: ${pageData.publishDate || 'Unknown'}
- Views: ${pageData.views || 'Unknown'}
- URL: ${pageData.url}

Description:
${pageData.description?.substring(0, 2000) || 'No description available'}

${pageData.hashtags?.length ? `Hashtags: ${pageData.hashtags.join(', ')}` : ''}
`;
  } else if (noteType === 'research') {
    typeSpecificPrompt = `
This is a research article/blog post. Create a comprehensive research note with:
1. A clear, descriptive title that captures the main topic
2. Author and source information
3. Key findings/main points (3-7 bullet points)
4. Important quotes or data points worth remembering
5. Questions this raises or topics to explore further
6. How this relates to other topics (if apparent)
7. Action items or next steps
8. Relevant tags (3-5 tags, lowercase, hyphenated)

Article Information:
- Title: ${pageData.title}
- Author: ${pageData.author || 'Unknown'}
- Site: ${pageData.siteName || pageData.domain}
- Published: ${pageData.publishDate || 'Unknown'}
- Reading Time: ${pageData.readingTime || 'Unknown'}
- URL: ${pageData.url}

Description: ${pageData.description || 'No description'}

${pageData.headings?.length ? `Article Structure:\n${pageData.headings.map(h => `${h.level}: ${h.text}`).join('\n')}` : ''}

Article Content (excerpt):
${pageData.articleContent?.substring(0, 4000) || 'No content extracted'}
`;
  } else {
    typeSpecificPrompt = `
This is a web link/resource. Create a useful link note with:
1. A clear, descriptive title
2. What this resource is about
3. Why it might be useful/when to reference it
4. Key information from the page
5. Relevant tags (3-5 tags, lowercase, hyphenated)

Link Information:
- Title: ${pageData.title}
- Domain: ${pageData.domain}
- Site: ${pageData.siteName || pageData.domain}
- Type: ${pageData.type || pageData.metaType || 'webpage'}
- URL: ${pageData.url}

Description: ${pageData.description || 'No description'}

${pageData.keywords?.length ? `Keywords: ${pageData.keywords.join(', ')}` : ''}
`;
  }

  const outputFormat = `
Respond in JSON format with the following structure:
{
  "title": "Note title (concise, descriptive)",
  "subtype": "${noteType}",
  "summary": "Brief 1-2 sentence summary",
  "content": "Full markdown content with sections",
  "tags": ["tag1", "tag2", "tag3"],
  "keyTakeaways": ["takeaway1", "takeaway2"],
  "actionItems": ["action1", "action2"],
  "metadata": {
    "source": "${pageData.domain}",
    "sourceUrl": "${pageData.url}",
    ${noteType === 'video' ? `"channel": "${pageData.channel || ''}", "duration": "${pageData.duration || ''}", "videoId": "${pageData.videoId || ''}",` : ''}
    ${noteType === 'research' ? `"author": "${pageData.author || ''}", "publishDate": "${pageData.publishDate || ''}", "wordCount": ${pageData.wordCount || 0},` : ''}
    "capturedAt": "${new Date().toISOString()}"
  }
}`;

  return `${baseContext}\n\n${typeSpecificPrompt}\n\n${outputFormat}`;
}

// Call OpenRouter API
async function callOpenRouter(prompt, config) {
  if (!config.apiKey) {
    // Return basic processing without AI
    return null;
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'chrome-extension://idealisted-capture',
        'X-Title': 'IdeaListed Capture'
      },
      body: JSON.stringify({
        model: config.aiModel || 'x-ai/grok-code-fast-1',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenRouter error:', error);
      return null;
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || null;
  } catch (error) {
    console.error('AI processing error:', error);
    return null;
  }
}

// Map note types to template IDs
function getTemplateId(noteType) {
  const templateMap = {
    video: 'note-youtube',
    research: 'note-research',
    link: 'note-generic'
  };
  return templateMap[noteType] || 'note-generic';
}

// Parse AI response into note structure
function parseAIResponse(aiResponse, pageData, noteType) {
  let parsedData = null;

  if (aiResponse) {
    try {
      // Try to extract JSON from response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Error parsing AI response:', error);
    }
  }

  // Generate the markdown content
  const markdownContent = parsedData?.content || generateFallbackContent(pageData, noteType);
  const title = parsedData?.title || generateFallbackTitle(pageData, noteType);

  // Map noteType to note subtype (video -> youtube, research -> research, link -> generic)
  const subtypeMap = {
    video: 'youtube',  // YouTube videos get subtype 'youtube' (matches note-youtube template)
    research: 'research',
    link: 'generic'  // Generic links get subtype 'generic' (matches note-generic template)
  };
  const subtype = subtypeMap[noteType] || 'generic';

  // Build note with markdown_content and template_id for new markdown viewer
  const note = {
    type: 'note',
    text: title,
    tags: parsedData?.tags || generateFallbackTags(pageData, noteType),
    // NEW: markdown_content triggers the markdown viewer
    markdown_content: markdownContent,
    // NEW: template_id tells the viewer which template to use
    template_id: getTemplateId(noteType),
    // Mark as parsed for proper handling
    parsed: true,
    entity_type: 'note',
    note: {
      subtype: subtype,
      url: pageData.url,
      content: markdownContent,
      media_type: noteType === 'video' ? 'video/youtube' : undefined
    },
    metadata: {
      ...parsedData?.metadata,
      subtype: subtype,
      source: pageData.domain,
      sourceUrl: pageData.url,
      capturedVia: 'chrome-extension',
      aiProcessed: !!parsedData
    }
  };

  return note;
}

// Fallback title generation
function generateFallbackTitle(pageData, noteType) {
  const prefix = {
    video: '🎥',
    research: '🔬',
    link: '🔗'
  }[noteType] || '📝';

  return `${prefix} ${pageData.title || 'Untitled'}`;
}

// Fallback tags generation
function generateFallbackTags(pageData, noteType) {
  const tags = [noteType];

  if (pageData.domain) {
    const domainTag = pageData.domain
      .replace('www.', '')
      .split('.')[0]
      .toLowerCase();
    if (domainTag && domainTag.length > 2) {
      tags.push(domainTag);
    }
  }

  if (noteType === 'video' && pageData.hashtags) {
    tags.push(...pageData.hashtags.slice(0, 3).map(t => t.replace('#', '')));
  }

  if (pageData.keywords) {
    tags.push(...pageData.keywords.slice(0, 2));
  }

  return [...new Set(tags)].slice(0, 5);
}

// Fallback content generation
function generateFallbackContent(pageData, noteType) {
  if (noteType === 'video') {
    // Match the note-youtube template format exactly
    return `# ${pageData.title}

**URL**: ${pageData.url}
**Duration**: ${pageData.duration || 'Unknown'}
**Status**: Not Watched

## Key Concepts

- **Channel**: ${pageData.channel || 'Unknown'}
- **Published**: ${pageData.publishDate || 'Unknown'}
- **Views**: ${pageData.views || 'Unknown'}

## Timestamps



## AI Summary



## My Notes

**Why I Saved This:**

${pageData.description?.substring(0, 500) || 'No description available'}
`;
  }

  if (noteType === 'research') {
    return `---
type: research
created: ${now}
url: ${pageData.url}
author: ${pageData.author || 'Unknown'}
source: ${pageData.siteName || pageData.domain}
status: to-read
---

# ${pageData.title}

## Source
- **Author**: ${pageData.author || 'Unknown'}
- **Site**: ${pageData.siteName || pageData.domain}
- **Published**: ${pageData.publishDate || 'Unknown'}
- **Reading Time**: ${pageData.readingTime || 'Unknown'}

## Summary
${pageData.description || 'No description available'}

## Key Points
-

## Notable Quotes
>

## Questions / Topics to Explore
-

## Action Items
- [ ]

## Content Excerpt
${pageData.articleContent?.substring(0, 2000) || 'No content extracted'}
`;
  }

  // Link fallback
  return `---
type: link
created: ${now}
url: ${pageData.url}
domain: ${pageData.domain}
status: saved
---

# ${pageData.title}

## Source
- **Domain**: ${pageData.domain}
- **Site**: ${pageData.siteName || pageData.domain}

## Why I Saved This
- [ ] Add your notes here

## Summary
${pageData.description || 'No description available'}

## Key Information
-

## Related Links
-
`;
}

function parseDateOnly(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return isNaN(date.getTime()) ? null : date.getTime();
}

function parseDateTime(value) {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date.getTime();
}

function formatDateForMarkdown(timestamp, includeTime = false) {
  if (!timestamp) return 'Not set';
  try {
    const date = new Date(timestamp);
    if (includeTime) {
      return date.toLocaleString();
    }
    return date.toISOString().split('T')[0];
  } catch (e) {
    return 'Not set';
  }
}

function buildItemLink(serverUrl, itemId) {
  if (!serverUrl || !itemId) return null;
  const base = serverUrl.replace(/\/$/, '');
  return `${base}/api/items/${itemId}`;
}

async function createStudyTask({ pageData, config, note, noteItem, taskOptions }) {
  const dueDateMs = parseDateOnly(taskOptions?.dueDate);
  const reminderMs = parseDateTime(taskOptions?.reminder);
  const noteTitle = noteItem?.text || pageData.title || 'Captured note';
  const noteLink = buildItemLink(config.serverUrl, noteItem?.id);

  const taskPayload = {
    type: 'task',
    text: `Study: ${noteTitle}`,
    tags: note?.tags || [],
    markdown_content: generateTaskMarkdown({
      noteTitle,
      noteLink,
      noteId: noteItem?.id,
      sourceUrl: pageData.url,
      dueDateMs,
      reminderMs
    }),
    template_id: 'task',
    entity_type: 'task',
    parsed: true,
    metadata: {
      related_note_id: noteItem?.id,
      related_note_link: noteLink,
      source_url: pageData.url
    },
    task: {
      status: 'pending',
      priority: 1,
      due_date: dueDateMs,
      reminder_datetime: reminderMs
    }
  };

  return await sendToIdeaListed(taskPayload, config);
}

function generateTaskMarkdown({ noteTitle, noteLink, noteId, sourceUrl, dueDateMs, reminderMs }) {
  const noteReference = noteLink
    ? `[${noteTitle}](${noteLink})`
    : `${noteTitle}${noteId ? ` (ID: ${noteId})` : ''}`;

  return `# Study: ${noteTitle}

**Status**: Not Started
**Priority**: Medium
**Due Date**: ${formatDateForMarkdown(dueDateMs)}
**Reminder**: ${formatDateForMarkdown(reminderMs, true)}
**Related Note**: ${noteReference}
**Source**: [Open source](${sourceUrl})

## Plan
- [ ] Read the saved note
- [ ] Revisit the source material
- [ ] Summarize key takeaways inside the note
`;
}

async function linkNoteToTask({ noteItem, taskItem, note, config }) {
  if (!noteItem?.id || !taskItem?.id) return;

  const taskLink = buildItemLink(config.serverUrl, taskItem.id);
  const noteMetadata = safeParseMetadata(noteItem.metadata);

  const updatedMetadata = {
    ...noteMetadata,
    related_task_id: taskItem.id,
    related_task_link: taskLink
  };

  const existingMarkdown = noteItem.markdown_content || note?.markdown_content || '';
  const linkLine = taskLink
    ? `[${taskItem.text || 'Related task'}](${taskLink})`
    : (taskItem.text || 'Related task');
  const updatedMarkdown = existingMarkdown
    ? `${existingMarkdown.trim()}\n\n---\n**Related Task:** ${linkLine}\n`
    : `**Related Task:** ${linkLine}\n`;

  await fetch(`${config.serverUrl}/api/items/${noteItem.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      markdown_content: updatedMarkdown,
      metadata: updatedMetadata
    })
  });
}

function safeParseMetadata(metadata) {
  if (!metadata) return {};
  if (typeof metadata === 'object') return { ...metadata };
  try {
    return JSON.parse(metadata);
  } catch (e) {
    return {};
  }
}

// Send note to IdeaListed API
async function sendToIdeaListed(note, config) {
  const response = await fetch(`${config.serverUrl}/api/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(note)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`IdeaListed API error: ${error}`);
  }

  const data = await response.json();
  return data;
}
