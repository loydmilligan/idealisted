// IdeaListed Capture Extension - Content Script
// Extracts page data for capture

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractPageData') {
    const pageData = extractPageData();
    sendResponse(pageData);
  }
  return true; // Keep channel open for async response
});

// Main extraction function
function extractPageData() {
  const url = window.location.href;
  const domain = window.location.hostname;

  // Basic page info
  const data = {
    url: url,
    domain: domain,
    title: document.title,
    timestamp: new Date().toISOString()
  };

  // Check if YouTube
  if (isYouTube()) {
    Object.assign(data, extractYouTubeData());
  }
  // Check if article/research
  else if (isArticle()) {
    Object.assign(data, extractArticleData());
  }
  // Generic link extraction
  else {
    Object.assign(data, extractGenericData());
  }

  return data;
}

// ============================================
// YouTube Extraction
// ============================================

function isYouTube() {
  const url = window.location.href;
  return url.includes('youtube.com/watch') || url.includes('youtu.be/');
}

function extractYouTubeData() {
  const data = {
    isYouTube: true,
    channel: '',
    channelUrl: '',
    duration: '',
    views: '',
    publishDate: '',
    description: '',
    thumbnailUrl: '',
    videoId: ''
  };

  // Extract video ID
  const urlParams = new URLSearchParams(window.location.search);
  data.videoId = urlParams.get('v') || '';

  // Try to get channel name
  const channelLink = document.querySelector(
    'ytd-channel-name a, ' +
    '#channel-name a, ' +
    '.ytd-channel-name a, ' +
    'a.yt-simple-endpoint.style-scope.yt-formatted-string'
  );
  if (channelLink) {
    data.channel = channelLink.textContent?.trim() || '';
    data.channelUrl = channelLink.href || '';
  }

  // Alternative channel extraction
  if (!data.channel) {
    const channelMeta = document.querySelector('span[itemprop="author"] link[itemprop="name"]');
    if (channelMeta) {
      data.channel = channelMeta.getAttribute('content') || '';
    }
  }

  // Get video duration from player or meta
  const durationMeta = document.querySelector('meta[itemprop="duration"]');
  if (durationMeta) {
    data.duration = parseDuration(durationMeta.getAttribute('content') || '');
  }

  // Try to get duration from video element
  if (!data.duration) {
    const video = document.querySelector('video');
    if (video && video.duration) {
      data.duration = formatDuration(video.duration);
    }
  }

  // Get view count
  const viewCount = document.querySelector(
    'ytd-video-view-count-renderer span, ' +
    '.view-count, ' +
    '#count .ytd-video-view-count-renderer'
  );
  if (viewCount) {
    data.views = viewCount.textContent?.trim() || '';
  }

  // Get publish date
  const publishDate = document.querySelector(
    '#info-strings yt-formatted-string, ' +
    '.date, ' +
    'meta[itemprop="uploadDate"]'
  );
  if (publishDate) {
    data.publishDate = publishDate.getAttribute?.('content') ||
                       publishDate.textContent?.trim() || '';
  }

  // Get description
  const description = document.querySelector(
    'ytd-text-inline-expander #content, ' +
    '#description-inline-expander, ' +
    '#description, ' +
    'meta[name="description"]'
  );
  if (description) {
    data.description = description.getAttribute?.('content') ||
                       description.textContent?.trim().substring(0, 2000) || '';
  }

  // Get thumbnail
  const thumbnail = document.querySelector(
    'meta[property="og:image"]'
  );
  if (thumbnail) {
    data.thumbnailUrl = thumbnail.getAttribute('content') || '';
  }

  // Get hashtags from description
  const hashtagMatches = data.description.match(/#[\w-]+/g);
  if (hashtagMatches) {
    data.hashtags = [...new Set(hashtagMatches)].slice(0, 10);
  }

  return data;
}

function parseDuration(isoDuration) {
  // Parse ISO 8601 duration (PT1H30M45S)
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return isoDuration;

  const hours = match[1] ? parseInt(match[1]) : 0;
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const seconds = match[3] ? parseInt(match[3]) : 0;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ============================================
// Article/Research Extraction
// ============================================

function isArticle() {
  // Check for article schema
  const articleSchema = document.querySelector(
    'article, ' +
    '[itemtype*="Article"], ' +
    '[itemtype*="NewsArticle"], ' +
    '[itemtype*="BlogPosting"]'
  );

  // Check meta tags
  const ogType = document.querySelector('meta[property="og:type"]');
  const isArticleType = ogType?.getAttribute('content')?.includes('article');

  // Check content length
  const mainContent = getMainContent();
  const wordCount = mainContent.split(/\s+/).length;

  return articleSchema !== null || isArticleType || wordCount > 500;
}

function extractArticleData() {
  const data = {
    isArticle: true,
    hasArticleTag: document.querySelector('article') !== null,
    author: '',
    authorUrl: '',
    publishDate: '',
    modifiedDate: '',
    siteName: '',
    description: '',
    articleContent: '',
    readingTime: '',
    wordCount: 0,
    images: [],
    headings: []
  };

  // Get author
  const authorSelectors = [
    'meta[name="author"]',
    'meta[property="article:author"]',
    '[rel="author"]',
    '.author-name',
    '.byline',
    '[itemprop="author"]'
  ];

  for (const selector of authorSelectors) {
    const el = document.querySelector(selector);
    if (el) {
      data.author = el.getAttribute?.('content') || el.textContent?.trim() || '';
      if (el.href) data.authorUrl = el.href;
      if (data.author) break;
    }
  }

  // Get publish date
  const dateSelectors = [
    'meta[property="article:published_time"]',
    'meta[name="publish-date"]',
    'time[datetime]',
    '[itemprop="datePublished"]',
    '.publish-date',
    '.date'
  ];

  for (const selector of dateSelectors) {
    const el = document.querySelector(selector);
    if (el) {
      data.publishDate = el.getAttribute?.('content') ||
                         el.getAttribute?.('datetime') ||
                         el.textContent?.trim() || '';
      if (data.publishDate) break;
    }
  }

  // Get modified date
  const modifiedMeta = document.querySelector('meta[property="article:modified_time"]');
  if (modifiedMeta) {
    data.modifiedDate = modifiedMeta.getAttribute('content') || '';
  }

  // Get site name
  const siteNameMeta = document.querySelector('meta[property="og:site_name"]');
  if (siteNameMeta) {
    data.siteName = siteNameMeta.getAttribute('content') || '';
  }

  // Get description
  const descMeta = document.querySelector(
    'meta[property="og:description"], ' +
    'meta[name="description"]'
  );
  if (descMeta) {
    data.description = descMeta.getAttribute('content') || '';
  }

  // Get main content
  data.articleContent = getMainContent();
  data.wordCount = data.articleContent.split(/\s+/).length;
  data.readingTime = Math.ceil(data.wordCount / 200) + ' min read';

  // Get headings for structure
  const headings = document.querySelectorAll('article h1, article h2, article h3, main h1, main h2, main h3');
  data.headings = Array.from(headings).slice(0, 10).map(h => ({
    level: h.tagName,
    text: h.textContent?.trim().substring(0, 100) || ''
  }));

  // Get images
  const images = document.querySelectorAll('article img, main img, .content img');
  data.images = Array.from(images).slice(0, 5).map(img => ({
    src: img.src,
    alt: img.alt || ''
  })).filter(img => img.src && !img.src.includes('avatar') && !img.src.includes('icon'));

  return data;
}

function getMainContent() {
  // Try to find main article content
  const contentSelectors = [
    'article',
    '[role="main"]',
    'main',
    '.post-content',
    '.article-content',
    '.entry-content',
    '.content',
    '#content'
  ];

  for (const selector of contentSelectors) {
    const el = document.querySelector(selector);
    if (el) {
      // Clone and clean
      const clone = el.cloneNode(true);

      // Remove unwanted elements
      const removeSelectors = [
        'script', 'style', 'nav', 'header', 'footer',
        '.comments', '.sidebar', '.advertisement', '.ads',
        '.social-share', '.related-posts', '[role="complementary"]'
      ];

      removeSelectors.forEach(sel => {
        clone.querySelectorAll(sel).forEach(e => e.remove());
      });

      const text = clone.textContent?.trim() || '';
      if (text.length > 200) {
        return text.substring(0, 10000); // Limit to 10k chars
      }
    }
  }

  // Fallback to body
  return document.body.textContent?.trim().substring(0, 5000) || '';
}

// ============================================
// Generic Link Extraction
// ============================================

function extractGenericData() {
  const data = {
    isGeneric: true,
    siteName: '',
    description: '',
    imageUrl: '',
    type: '',
    keywords: []
  };

  // Get Open Graph data
  const ogTags = {
    'og:site_name': 'siteName',
    'og:description': 'description',
    'og:image': 'imageUrl',
    'og:type': 'type'
  };

  for (const [property, key] of Object.entries(ogTags)) {
    const meta = document.querySelector(`meta[property="${property}"]`);
    if (meta) {
      data[key] = meta.getAttribute('content') || '';
    }
  }

  // Fallback description
  if (!data.description) {
    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta) {
      data.description = descMeta.getAttribute('content') || '';
    }
  }

  // Get keywords
  const keywordsMeta = document.querySelector('meta[name="keywords"]');
  if (keywordsMeta) {
    const keywords = keywordsMeta.getAttribute('content') || '';
    data.keywords = keywords.split(',').map(k => k.trim()).filter(k => k).slice(0, 10);
  }

  // Get meta type
  const typeMeta = document.querySelector('meta[property="og:type"]');
  if (typeMeta) {
    data.metaType = typeMeta.getAttribute('content') || '';
  }

  return data;
}
