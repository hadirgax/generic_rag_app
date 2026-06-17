from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import httpx
import feedparser
from html.parser import HTMLParser
import time
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("bq-releases")

app = FastAPI(title="BigQuery Release Notes Viewer")

class BQReleaseNotesParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.updates = []
        self.current_type = None
        self.current_html = []
        self.current_text = []

    def handle_starttag(self, tag, attrs):
        if tag == 'h3':
            if self.current_type is not None:
                self.flush_current()
            self.current_type = '' # Signals we are expecting the type name in handle_data
        else:
            if self.current_type is None:
                self.current_type = 'General'
            attr_str = "".join([f' {k}="{v}"' for k, v in attrs])
            self.current_html.append(f'<{tag}{attr_str}>')

    def handle_endtag(self, tag):
        if tag == 'h3':
            pass
        else:
            if self.current_type is not None:
                self.current_html.append(f'</{tag}>')

    def handle_data(self, data):
        if self.current_type == '':
            self.current_type = data.strip()
        elif self.current_type is not None:
            self.current_html.append(data)
            self.current_text.append(data)
        else:
            self.current_type = 'General'
            self.current_html.append(data)
            self.current_text.append(data)

    def flush_current(self):
        if self.current_type:
            html_content = "".join(self.current_html).strip()
            text_content = "".join(self.current_text).strip()
            text_content = " ".join(text_content.split())
            if html_content or text_content:
                self.updates.append({
                    'type': self.current_type or 'General',
                    'html': html_content,
                    'text': text_content
                })
        self.current_html = []
        self.current_text = []

    def close(self):
        super().close()
        self.flush_current()

# Cache store
CACHE = {
    "data": None,
    "last_fetched": 0
}
CACHE_TTL = 300  # 5 minutes cache

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

async def fetch_and_parse_feed():
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(FEED_URL, timeout=15.0)
            response.raise_for_status()
    except Exception as e:
        logger.error(f"Error fetching feed: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch BigQuery release notes: {str(e)}")

    # Parse feed
    feed_data = feedparser.parse(response.text)
    
    parsed_entries = []
    
    for entry in feed_data.entries:
        entry_title = entry.get("title", "Unknown Date")
        entry_link = entry.get("link", "")
        entry_id = entry.get("id", "")
        updated_date = entry.get("updated", "")
        
        content_val = ""
        if "content" in entry and entry.content:
            content_val = entry.content[0].value
        elif "summary" in entry:
            content_val = entry.summary
            
        parser = BQReleaseNotesParser()
        parser.feed(content_val)
        parser.close()
        
        parsed_entries.append({
            "date": entry_title,
            "link": entry_link,
            "id": entry_id,
            "updated": updated_date,
            "updates": parser.updates
        })
        
    return parsed_entries

@app.get("/api/releases")
async def get_releases(refresh: bool = Query(False)):
    now = time.time()
    
    # Check cache
    if not refresh and CACHE["data"] is not None and (now - CACHE["last_fetched"] < CACHE_TTL):
        logger.info("Serving from cache")
        return {
            "source": "cache",
            "last_fetched": CACHE["last_fetched"],
            "releases": CACHE["data"]
        }
        
    logger.info("Fetching fresh release notes")
    releases = await fetch_and_parse_feed()
    
    # Update cache
    CACHE["data"] = releases
    CACHE["last_fetched"] = now
    
    return {
        "source": "live",
        "last_fetched": now,
        "releases": releases
    }

# Serve frontend files
# Make sure static directory exists
os.makedirs("static", exist_ok=True)

# Point the root path to serve index.html
@app.get("/")
async def get_index():
    return FileResponse("static/index.html")

app.mount("/", StaticFiles(directory="static"), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
