// Application State
let state = {
    releases: [],
    categories: {},
    activeCategory: 'all',
    searchQuery: '',
    lastFetched: 0,
    source: 'live'
};

// DOM Elements
const refreshBtn = document.getElementById('refresh-btn');
const cacheStatusEl = document.getElementById('cache-status');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');
const categoryFiltersContainer = document.getElementById('category-filters');
const releasesContainer = document.getElementById('releases-container');
const loadingState = document.getElementById('loading-state');
const emptyState = document.getElementById('empty-state');
const resetFiltersBtn = document.getElementById('reset-filters-btn');

// Modal Elements
const shareModal = document.getElementById('share-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const tabBtnX = document.getElementById('tab-btn-x');
const tabBtnLinkedin = document.getElementById('tab-btn-linkedin');
const tabContentX = document.getElementById('tab-content-x');
const tabContentLinkedin = document.getElementById('tab-content-linkedin');

// Composer Inputs & Previews
const tweetTextarea = document.getElementById('tweet-textarea');
const linkedinTextarea = document.getElementById('linkedin-textarea');
const charCounter = document.getElementById('char-counter');
const linkedinCharCounter = document.getElementById('linkedin-char-counter');
const autoShortenBtn = document.getElementById('auto-shorten-btn');
const tweetWarning = document.getElementById('tweet-warning');
const tweetPreviewText = document.getElementById('tweet-preview-text');
const linkedinPreviewText = document.getElementById('linkedin-preview-text');

// Footer Actions
const copyShareBtn = document.getElementById('copy-share-btn');
const postShareBtn = document.getElementById('post-share-btn');
const btnShareText = document.getElementById('btn-share-text');

// Toast Element
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    fetchReleases();
    setupEventListeners();
});

// Event Listeners Setup
function setupEventListeners() {
    refreshBtn.addEventListener('click', () => fetchReleases(true));
    
    // Search input
    searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.toLowerCase().trim();
        clearSearchBtn.style.display = state.searchQuery ? 'block' : 'none';
        render();
    });
    
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        state.searchQuery = '';
        clearSearchBtn.style.display = 'none';
        searchInput.focus();
        render();
    });
    
    resetFiltersBtn.addEventListener('click', resetFilters);
    
    // Modal events
    closeModalBtn.addEventListener('click', closeShareModal);
    shareModal.addEventListener('click', (e) => {
        if (e.target === shareModal) closeShareModal();
    });
    
    // Tab switching events
    tabBtnX.addEventListener('click', () => switchTab('x'));
    tabBtnLinkedin.addEventListener('click', () => switchTab('linkedin'));
    
    // Text inputs events
    tweetTextarea.addEventListener('input', updateTweetStats);
    linkedinTextarea.addEventListener('input', updateLinkedinStats);
    
    autoShortenBtn.addEventListener('click', handleAutoShorten);
    copyShareBtn.addEventListener('click', copyActiveShareText);
    postShareBtn.addEventListener('click', shareOnActivePlatform);
}

// Fetch Releases from Backend API
async function fetchReleases(forceRefresh = false) {
    showLoading(true);
    
    // Animate spinner
    const spinner = refreshBtn.querySelector('.spinner-icon');
    if (spinner) spinner.classList.add('spinning');
    refreshBtn.disabled = true;
    
    try {
        const url = `/api/releases${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`API returned status ${response.status}`);
        }
        
        const data = await response.json();
        
        state.releases = data.releases || [];
        state.lastFetched = data.last_fetched;
        state.source = data.source;
        
        // Calculate categories counts
        processCategories();
        
        // Update header cache status display
        updateCacheStatusDisplay();
        
        // Render view
        render();
    } catch (error) {
        console.error('Error fetching release notes:', error);
        showToast(`Error: ${error.message || 'Failed to fetch release notes'}`);
        updateCacheStatusOnError();
    } finally {
        showLoading(false);
        if (spinner) spinner.classList.remove('spinning');
        refreshBtn.disabled = false;
    }
}

// Process Categories and Counts
function processCategories() {
    // Reset categories count
    const counts = { all: 0 };
    
    state.releases.forEach(release => {
        release.updates.forEach(update => {
            const cat = update.type || 'General';
            counts[cat] = (counts[cat] || 0) + 1;
            counts.all++;
        });
    });
    
    state.categories = counts;
}

// Update Cache Status Display
function updateCacheStatusDisplay() {
    const indicator = cacheStatusEl.querySelector('.pulse-indicator');
    const label = cacheStatusEl.querySelector('.status-label');
    
    indicator.className = 'pulse-indicator'; // clear
    
    if (state.source === 'live') {
        indicator.classList.add('live');
        label.textContent = 'Live Feed (Just Updated)';
    } else {
        indicator.classList.add('cache');
        
        // Calculate minutes ago
        const secondsAgo = Math.floor((Date.now() - (state.lastFetched * 1000)) / 1000);
        if (secondsAgo < 60) {
            label.textContent = `Cached (updated ${secondsAgo}s ago)`;
        } else {
            const minsAgo = Math.floor(secondsAgo / 60);
            label.textContent = `Cached (updated ${minsAgo}m ago)`;
        }
    }
}

function updateCacheStatusOnError() {
    const indicator = cacheStatusEl.querySelector('.pulse-indicator');
    const label = cacheStatusEl.querySelector('.status-label');
    indicator.className = 'pulse-indicator error';
    label.textContent = 'Connection Error';
}

// Show/Hide Loading State
function showLoading(isLoading) {
    if (isLoading) {
        loadingState.style.display = 'flex';
        releasesContainer.style.display = 'none';
        emptyState.style.display = 'none';
    } else {
        loadingState.style.display = 'none';
        releasesContainer.style.display = 'flex';
    }
}

// Reset all search and filters
function resetFilters() {
    searchInput.value = '';
    state.searchQuery = '';
    clearSearchBtn.style.display = 'none';
    state.activeCategory = 'all';
    
    // Update active class on filter tags
    const tags = categoryFiltersContainer.querySelectorAll('.category-tag');
    tags.forEach(tag => {
        if (tag.getAttribute('data-category') === 'all') {
            tag.classList.add('active');
        } else {
            tag.classList.remove('active');
        }
    });
    
    render();
}

// Render Filter Buttons and Release Updates
function render() {
    renderCategoryFilters();
    renderReleases();
}

// Render Category Filter Tags
function renderCategoryFilters() {
    // Generate markup for category filters
    // We want to sort categories: 'all', 'Feature', 'Issue', 'Changed', 'Deprecated', others alphabetically
    const order = ['all', 'Feature', 'Issue', 'Changed', 'Deprecated', 'Resolved', 'General'];
    const sortedCats = Object.keys(state.categories).sort((a, b) => {
        const idxA = order.indexOf(a);
        const idxB = order.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
    });
    
    categoryFiltersContainer.innerHTML = '';
    
    sortedCats.forEach(cat => {
        const count = state.categories[cat] || 0;
        if (count === 0 && cat !== 'all') return; // hide empty categories
        
        const button = document.createElement('button');
        button.className = `category-tag ${state.activeCategory === cat ? 'active' : ''}`;
        button.setAttribute('data-category', cat);
        
        // Display nice title
        const displayTitle = cat === 'all' ? 'All' : cat;
        button.innerHTML = `${displayTitle} <span class="tag-count">${count}</span>`;
        
        button.addEventListener('click', () => {
            state.activeCategory = cat;
            // Update active state visually
            categoryFiltersContainer.querySelectorAll('.category-tag').forEach(t => t.classList.remove('active'));
            button.classList.add('active');
            renderReleases();
        });
        
        categoryFiltersContainer.appendChild(button);
    });
}

// Render Release notes list
function renderReleases() {
    releasesContainer.innerHTML = '';
    let matchCount = 0;
    
    state.releases.forEach(release => {
        // Filter updates within this entry
        const filteredUpdates = release.updates.filter(update => {
            const categoryMatch = state.activeCategory === 'all' || (update.type || 'General') === state.activeCategory;
            const textMatch = !state.searchQuery || 
                (update.text && update.text.toLowerCase().includes(state.searchQuery)) ||
                (update.type && update.type.toLowerCase().includes(state.searchQuery));
            return categoryMatch && textMatch;
        });
        
        if (filteredUpdates.length > 0) {
            matchCount += filteredUpdates.length;
            
            // Create Date Group Container
            const dateGroup = document.createElement('section');
            dateGroup.className = 'date-group';
            
            // Date Header
            const dateHeader = document.createElement('div');
            dateHeader.className = 'date-header';
            
            const dateBubble = document.createElement('div');
            dateBubble.className = 'date-bubble';
            dateBubble.textContent = release.date;
            
            const line = document.createElement('div');
            line.className = 'date-line';
            
            const link = document.createElement('a');
            link.className = 'date-link';
            link.href = release.link || '#';
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = 'View Original';
            
            dateHeader.appendChild(dateBubble);
            dateHeader.appendChild(line);
            dateHeader.appendChild(link);
            dateGroup.appendChild(dateHeader);
            
            // Create cards for each update
            filteredUpdates.forEach(update => {
                const card = document.createElement('div');
                card.className = 'update-card';
                
                // Determine CSS custom property for color border
                const typeLower = (update.type || 'general').toLowerCase();
                let cardColor = 'var(--color-general)';
                if (typeLower === 'feature') cardColor = 'var(--color-feature)';
                else if (typeLower === 'issue') cardColor = 'var(--color-issue)';
                else if (typeLower === 'changed') cardColor = 'var(--color-changed)';
                else if (typeLower === 'deprecated') cardColor = 'var(--color-deprecated)';
                else if (typeLower === 'resolved') cardColor = 'var(--color-resolved)';
                
                card.style.setProperty('--badge-color', cardColor);
                
                // Card Header
                const cardHeader = document.createElement('div');
                cardHeader.className = 'card-header';
                
                const badge = document.createElement('span');
                badge.className = `badge badge-${typeLower === 'feature' || typeLower === 'issue' || typeLower === 'changed' || typeLower === 'deprecated' || typeLower === 'resolved' ? typeLower : 'general'}`;
                badge.textContent = update.type || 'General';
                
                // Actions container
                const actions = document.createElement('div');
                actions.className = 'card-actions';
                
                // Copy Action Button
                const copyBtn = document.createElement('button');
                copyBtn.className = 'action-btn';
                copyBtn.title = 'Copy text';
                copyBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" width="16" height="16">
                        <path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                    </svg>
                `;
                copyBtn.addEventListener('click', () => {
                    copyToClipboard(update.text, 'Update text copied to clipboard!');
                });
                
                // Tweet Action Button (X)
                const tweetBtn = document.createElement('button');
                tweetBtn.className = 'action-btn tweet-btn';
                tweetBtn.title = 'Prepare post for X / Twitter';
                tweetBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" width="16" height="16">
                        <path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                `;
                tweetBtn.addEventListener('click', () => {
                    openShareModal(release.date, update.type || 'General', update.text, release.link, 'x');
                });
                
                // LinkedIn Action Button
                const linkedinBtn = document.createElement('button');
                linkedinBtn.className = 'action-btn linkedin-btn';
                linkedinBtn.title = 'Prepare post for LinkedIn';
                linkedinBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" width="16" height="16">
                        <path fill="currentColor" d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                    </svg>
                `;
                linkedinBtn.addEventListener('click', () => {
                    openShareModal(release.date, update.type || 'General', update.text, release.link, 'linkedin');
                });
                
                actions.appendChild(copyBtn);
                actions.appendChild(tweetBtn);
                actions.appendChild(linkedinBtn);
                
                cardHeader.appendChild(badge);
                cardHeader.appendChild(actions);
                
                // Card Content (HTML)
                const cardContent = document.createElement('div');
                cardContent.className = 'card-content';
                cardContent.innerHTML = update.html || `<p>${update.text}</p>`;
                
                // Ensure all links open in a new tab
                cardContent.querySelectorAll('a').forEach(a => {
                    a.target = '_blank';
                    a.rel = 'noopener noreferrer';
                });
                
                card.appendChild(cardHeader);
                card.appendChild(cardContent);
                
                dateGroup.appendChild(card);
            });
            
            releasesContainer.appendChild(dateGroup);
        }
    });
    
    // Show empty state if no updates matched
    if (matchCount === 0) {
        emptyState.style.display = 'flex';
        releasesContainer.style.display = 'none';
    } else {
        emptyState.style.display = 'flex'; // Reset layout display mode
        releasesContainer.style.display = 'flex';
        emptyState.style.display = 'none';
    }
}

// Clipboard Helper
function copyToClipboard(text, message) {
    navigator.clipboard.writeText(text).then(() => {
        showToast(message);
    }).catch(err => {
        console.error('Failed to copy to clipboard:', err);
        showToast('Failed to copy to clipboard.');
    });
}

// Show Toast Notification
function showToast(message) {
    toastMessage.textContent = message;
    toast.style.display = 'block';
    // Small delay to trigger CSS transition
    setTimeout(() => {
        toast.classList.add('active');
    }, 10);
    
    // Clear existing timeouts
    if (window.toastTimeout) clearTimeout(window.toastTimeout);
    
    window.toastTimeout = setTimeout(() => {
        toast.classList.remove('active');
        setTimeout(() => {
            toast.style.display = 'none';
        }, 300);
    }, 3000);
}

// Share Composer Modal Logic
let currentOriginalTweetText = '';
let currentOriginalLinkedInText = '';
let currentShareLink = '';
let activeTab = 'x'; // 'x' or 'linkedin'

function openShareModal(date, type, text, link, initialTab = 'x') {
    currentShareLink = link || 'https://docs.cloud.google.com/bigquery/docs/release-notes';
    
    const cleanType = type.trim();
    const cleanText = text.trim();
    
    // 1. Format X/Twitter Post
    currentOriginalTweetText = `📢 BigQuery #CloudUpdate (${date})\n\n[${cleanType}] ${cleanText}\n\nDetails: ${currentShareLink}`;
    tweetTextarea.value = currentOriginalTweetText;
    
    // 2. Format LinkedIn Post
    currentOriginalLinkedInText = generateLinkedInText(date, cleanType, cleanText, currentShareLink);
    linkedinTextarea.value = currentOriginalLinkedInText;
    
    // Show modal
    shareModal.style.display = 'flex';
    setTimeout(() => {
        shareModal.classList.add('active');
        switchTab(initialTab);
    }, 10);
}

function closeShareModal() {
    shareModal.classList.remove('active');
    setTimeout(() => {
        shareModal.style.display = 'none';
    }, 300);
}

// Tab Switching
function switchTab(tab) {
    activeTab = tab;
    
    // Toggle active buttons
    if (tab === 'x') {
        tabBtnX.classList.add('active');
        tabBtnLinkedin.classList.remove('active');
        
        tabContentX.classList.add('active');
        tabContentLinkedin.classList.remove('active');
        
        // Update footer actions
        btnShareText.textContent = 'Post to X';
        postShareBtn.querySelector('.btn-share-icon').innerHTML = `
            <path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        `;
        
        updateTweetStats();
        setTimeout(() => tweetTextarea.focus(), 10);
    } else {
        tabBtnX.classList.remove('active');
        tabBtnLinkedin.classList.add('active');
        
        tabContentX.classList.remove('active');
        tabContentLinkedin.classList.add('active');
        
        // Update footer actions
        btnShareText.textContent = 'Share on LinkedIn';
        postShareBtn.querySelector('.btn-share-icon').innerHTML = `
            <path fill="currentColor" d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
        `;
        
        updateLinkedinStats();
        setTimeout(() => linkedinTextarea.focus(), 10);
    }
}

// Generate professional LinkedIn Post
function generateLinkedInText(date, type, text, link) {
    let hashtags = ['#GoogleCloud', '#BigQuery'];
    const textLower = text.toLowerCase();
    
    if (textLower.includes('gemini') || textLower.includes('ai') || textLower.includes('generative')) {
        hashtags.push('#GenerativeAI');
        hashtags.push('#Gemini');
    }
    if (textLower.includes('performance') || textLower.includes('optimize') || textLower.includes('tuning') || textLower.includes('partition')) {
        hashtags.push('#DataEngineering');
        hashtags.push('#Performance');
    }
    if (textLower.includes('security') || textLower.includes('policy') || textLower.includes('iam') || textLower.includes('encrypt')) {
        hashtags.push('#CloudSecurity');
    }
    if (textLower.includes('cost') || textLower.includes('billing') || textLower.includes('price')) {
        hashtags.push('#FinOps');
    }
    if (textLower.includes('studio') || textLower.includes('console') || textLower.includes('editor')) {
        hashtags.push('#DataOps');
    }
    
    return `🚀 BigQuery Update Announcement: ${type} (${date})\n\nGoogle Cloud has announced the following update:\n\n"${text}"\n\n🔗 View full release notes and details here: ${link}\n\n${hashtags.join(' ')}`;
}

// X / Twitter character counting
function getTwitterCharCount(text) {
    const urlRegex = /https?:\/\/[^\s]+/g;
    const matches = text.match(urlRegex) || [];
    let lengthWithoutUrls = text.replace(urlRegex, '').length;
    return lengthWithoutUrls + (matches.length * 23);
}

function updateTweetStats() {
    const text = tweetTextarea.value;
    const count = getTwitterCharCount(text);
    const remaining = 280 - count;
    
    charCounter.textContent = remaining;
    charCounter.className = 'char-counter';
    
    if (remaining < 0) {
        charCounter.classList.add('error');
        tweetWarning.style.display = 'flex';
    } else if (remaining <= 30) {
        charCounter.classList.add('warning');
        tweetWarning.style.display = 'none';
    } else {
        tweetWarning.style.display = 'none';
    }
    
    tweetPreviewText.innerHTML = formatPreviewText(text);
}

// LinkedIn Stats and Character Counting
function updateLinkedinStats() {
    const text = linkedinTextarea.value;
    const remaining = 3000 - text.length;
    
    linkedinCharCounter.textContent = remaining;
    linkedinCharCounter.className = 'char-counter';
    
    if (remaining < 0) {
        linkedinCharCounter.classList.add('error');
    } else if (remaining <= 200) {
        linkedinCharCounter.classList.add('warning');
    }
    
    linkedinPreviewText.innerHTML = formatPreviewText(text);
}

// Highlight Hashtags and URLs in Live Preview
function formatPreviewText(text) {
    if (!text) return '<i>No text entered</i>';
    
    let escaped = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
        
    escaped = escaped.replace(/(#[a-zA-Z0-9_]+)/g, '<span class="hashtag">$1</span>');
    escaped = escaped.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" class="url-link" target="_blank" rel="noopener noreferrer">$1</a>');
    
    return escaped;
}

// Auto-Shorten Algorithm for X / Twitter
function handleAutoShorten() {
    const text = tweetTextarea.value;
    const count = getTwitterCharCount(text);
    
    if (count <= 280) {
        showToast('Text is already within the 280 character limit!');
        return;
    }
    
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlRegex) || [];
    const urlPart = urls.length > 0 ? urls[urls.length - 1] : '';
    
    let baseText = text;
    if (urlPart) {
        baseText = text.replace(urlPart, '').trim();
    }
    
    const urlAllowance = urlPart ? 25 : 0;
    const maxBaseLen = 280 - urlAllowance;
    
    if (baseText.length > maxBaseLen) {
        baseText = baseText.substring(0, maxBaseLen - 3).trim() + '...';
    }
    
    const shortenedText = urlPart ? `${baseText}\n\n${urlPart}` : baseText;
    
    tweetTextarea.value = shortenedText;
    updateTweetStats();
    showToast('Text auto-shortened to fit character limit!');
}

// Copy Action based on active tab
function copyActiveShareText() {
    const activeTextarea = activeTab === 'x' ? tweetTextarea : linkedinTextarea;
    const platformName = activeTab === 'x' ? 'X / Twitter' : 'LinkedIn';
    copyToClipboard(activeTextarea.value, `${platformName} post copied to clipboard!`);
}

// Share Action based on active tab
function shareOnActivePlatform() {
    if (activeTab === 'x') {
        const text = tweetTextarea.value;
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(twitterUrl, '_blank', 'noopener,noreferrer');
    } else {
        const text = linkedinTextarea.value;
        
        // 1. Copy to clipboard automatically since LinkedIn web intent does not accept pre-populated text parameters
        navigator.clipboard.writeText(text).then(() => {
            showToast('Post copied to clipboard! Paste it in the LinkedIn window.');
            
            // 2. Open LinkedIn share offsite window
            const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentShareLink)}`;
            window.open(linkedinUrl, '_blank', 'noopener,noreferrer');
        }).catch(err => {
            console.error('Failed to copy to clipboard:', err);
            showToast('Failed to copy text. Opening LinkedIn share anyway.');
            
            const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentShareLink)}`;
            window.open(linkedinUrl, '_blank', 'noopener,noreferrer');
        });
    }
}
