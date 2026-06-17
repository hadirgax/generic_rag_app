# BigQuery Release Notes Tracker

A sleek, modern, glassmorphic web application built with **FastAPI** (Python) and plain vanilla **HTML/CSS/JS** that fetches Google BigQuery release notes from the official RSS feed, parses individual updates by category, and provides a custom composer for sharing updates directly to **X/Twitter** and **LinkedIn**.

---

## 📋 Table of Contents
1. [System Architecture](#-system-architecture)
2. [Prerequisites](#-prerequisites)
3. [Installation & Setup](#-installation--setup)
4. [Running the Application](#-running-the-application)
5. [Usage Guide](#-usage-guide)
6. [Detailed Code Walkthrough](#-detailed-code-walkthrough)
7. [API Documentation](#-api-documentation)

---

## 🏗 System Architecture

The application has a split-responsibility design:
```
┌────────────────────────────────────────────────────────┐
│                        BACKEND                         │
│                                                        │
│  ┌──────────────┐      ┌─────────────┐   ┌──────────┐  │
│  │ Google RSS   │ ───> │ HTMLParser  │ ─>│ Memory   │  │
│  │ (Atom Feed)  │      │ (Sub-items) │   │ Cache    │  │
│  └──────────────┘      └─────────────┘   └──────────┘  │
└───────────────────────────────┬────────────────────────┘
                                │ JSON API
                                ▼
┌────────────────────────────────────────────────────────┐
│                        FRONTEND                        │
│                                                        │
│  ┌──────────────┐      ┌─────────────┐   ┌──────────┐  │
│  │ Search &     │ ───> │ Glassmorphic│ ─>│ Custom   │  │
│  │ Filter Pills │      │ Card List   │   │ Share    │  │
│  │              │      │             │   │ Modal    │  │
│  └──────────────┘      └─────────────┘   └──────────┘  │
└────────────────────────────────────────────────────────┘
```

---

## 🛠 Prerequisites

- Python 3.8 or higher
- `pip` (Python package installer) or a Conda package manager

---

## ⚙️ Installation & Setup

1. **Activate the Environment** (if using the configured Conda environment):
   ```bash
   conda activate generic_rag_app
   ```

2. **Install Dependencies**:
   Install the required libraries using `pip`:
   ```bash
   pip install fastapi uvicorn httpx feedparser
   ```
   - **`fastapi`**: The web framework for creating the API and serving static files.
   - **`uvicorn`**: High-performance ASGI server to run the FastAPI app.
   - **`httpx`**: Asynchronous HTTP client to download the XML feed.
   - **`feedparser`**: Robust library to parse Atom/RSS feeds.

---

## 🚀 Running the Application

To start the backend server, run the following command from the root of the project directory:

```bash
python main.py
```

*Alternatively, you can run it via Uvicorn directly:*
```bash
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

Once the console outputs `Application startup complete`, open your browser and go to:
👉 **[http://localhost:8000](http://localhost:8000)**

---

## 📖 Usage Guide

### 1. View Release Notes
The application automatically pulls release notes from the Google Cloud feed upon loading.
- Releases are grouped by **Date**.
- Each card has a visual accent indicator colored according to its category.

### 2. Pull-to-Refresh & Caching
- **Caching**: Feed data is stored in memory for **5 minutes** to keep loads instant.
- **Cache indicator**: A colored status pill in the header indicates the source (`Live Feed` or `Cached x minutes ago`).
- **Force Refresh**: Click the **Refresh** button in the header. The spinner icon will rotate, forcing the backend to bypass the cache and fetch the feed fresh.

### 3. Searching & Filtering
- **Keyword Search**: Type terms (e.g., `Gemini`, `Partitioning`, `Billing`) in the search bar. The list will update instantly as you type.
- **Category Filter Pills**: Click on category buttons (*Feature*, *Issue*, *Changed*, etc.) to isolate specific classes of updates. The number of matching items is shown on each pill.

### 4. Social Sharing (X/Twitter & LinkedIn)
- **Select Platform**: Each release card has dedicated buttons for **X/Twitter** and **LinkedIn**. Clicking either launches the **Social Share Composer** modal opened directly to the chosen platform's tab.
- **X / Twitter Tab**:
  - **Smart Counter**: Character counter tracks usage. URLs are counted as exactly 23 characters (matching X's link-shortening standard).
  - **Auto-Shorten**: Trims the description body to fit the 280-character limit, appending `...` and keeping the hashtag and link intact.
  - **Live Preview**: Simulates a dark-theme X post preview with highlighted tags/URLs.
  - **Post**: Clicking **Post to X** redirects to the X Compose intent page.
- **LinkedIn Tab**:
  - **Professional Format**: Generates a long-form professional update with a title and paragraph.
  - **Dynamic Hashtags**: Automatically extracts keywords from the description to suggest relevant hashtags (e.g. `#Gemini`, `#Performance`, `#FinOps`, `#CloudSecurity`) in addition to `#GoogleCloud` and `#BigQuery`.
  - **Clipboard Auto-Copy**: Because LinkedIn's share intent doesn't support pre-filling text via query parameters, clicking **Share on LinkedIn** automatically copies the formatted text to your clipboard and opens the share page in a new window so you can easily paste it.
  - **Live Preview**: Simulates a dark-theme LinkedIn feed post preview.

---

## 🔍 Detailed Code Walkthrough

The project consists of four files:

### 1. [main.py](file:///home/hadirgax/workspace/dev/generic_rag_app/bq-releases-notes/main.py) (FastAPI Backend)
- **`BQReleaseNotesParser`**: Extends Python's native `html.parser.HTMLParser`. Since Google structures its release notes under alternating `<h3>` headers (defining update categories) and HTML blocks, this class groups tags and texts into structured dictionaries:
  ```python
  {
      'type': 'Feature', 
      'html': '<p>Details...</p>', 
      'text': 'Details...'
  }
  ```
- **Caching**: The `/api/releases` endpoint handles data caching. If the cache is stale or if the query string contains `?refresh=true`, the cache is bypassed.
- **Static Mounting**: Mounts the `./static` folder to serve frontend assets.

### 2. [index.html](file:///home/hadirgax/workspace/dev/generic_rag_app/bq-releases-notes/static/index.html) (Frontend Skeleton)
- Implements semantic HTML structure.
- Incorporates dynamic UI containers (`#category-filters`, `#releases-container`) and SVG icons.
- Includes the Backdrop-Blur Share Composer Modal (`#share-modal`) with support for tabbed sub-contents.

### 3. [styles.css](file:///home/hadirgax/workspace/dev/generic_rag_app/bq-releases-notes/static/styles.css) (Design System & Aesthetics)
- Uses modern CSS variable tokens for styling.
- Features glassmorphism panels using backdrop filters:
  ```css
  background: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.07);
  ```
- Includes styling for category badges and glow orbs floating in the background.

### 4. [app.js](file:///home/hadirgax/workspace/dev/generic_rag_app/bq-releases-notes/static/app.js) (Frontend Controller)
- Manages application states (active search query, active category, active sharing tab).
- Implements the in-memory search and category filter.
- Generates platform-specific content (concise tags for X, professional summaries and keyword-derived hashtags for LinkedIn).
- Handles character counts (X-specific 23-char URL standard vs LinkedIn 3000-char limit).
- Handles Clipboard copying and Web Intents.

---

## 📡 API Documentation

### Get Release Notes
Fetches the parsed and cached release notes.

- **URL**: `/api/releases`
- **Method**: `GET`
- **Query Parameters**:
  - `refresh` (optional): `true` to force bypass cache and request live feed.
- **Response Example**:
  ```json
  {
    "source": "live",
    "last_fetched": 1781657503.83,
    "releases": [
      {
        "date": "June 16, 2026",
        "link": "https://docs.cloud.google.com/bigquery/docs/release-notes#June_16_2026",
        "id": "tag:google.com,2016:bigquery-release-notes#June_16_2026",
        "updated": "2026-06-16T00:00:00-07:00",
        "updates": [
          {
            "type": "Feature",
            "html": "<p>Use Gemini Cloud Assist...</p>",
            "text": "Use Gemini Cloud Assist to..."
          }
        ]
      }
    ]
  }
  ```
