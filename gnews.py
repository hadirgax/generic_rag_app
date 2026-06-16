#!/usr/bin/env python3
import sys
import os
import argparse
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
import datetime
import webbrowser
import html
from email.utils import parsedate_to_datetime

# Enable ANSI escape sequences on Windows
if os.name == 'nt':
    try:
        import ctypes
        kernel32 = ctypes.windll.kernel32
        # Enable virtual terminal processing (ENABLE_VIRTUAL_TERMINAL_PROCESSING = 0x0004)
        kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)
    except Exception:
        try:
            os.system('')
        except Exception:
            pass

class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'
    DIM = '\033[2m'
    END = '\033[0m'

# Check if stdout is a TTY to support coloring
if not sys.stdout.isatty():
    for attr in dir(Colors):
        if not attr.startswith('__'):
            setattr(Colors, attr, '')

# Standard topic mappings in Google News
TOPICS = {
    'world': 'WORLD',
    'nation': 'NATION',
    'business': 'BUSINESS',
    'tech': 'TECHNOLOGY',
    'technology': 'TECHNOLOGY',
    'entertainment': 'ENTERTAINMENT',
    'sports': 'SPORTS',
    'science': 'SCIENCE',
    'health': 'HEALTH'
}

def get_relative_time(pub_date_str):
    """Parses standard pubDate from RSS and returns a human-friendly relative time."""
    try:
        dt = parsedate_to_datetime(pub_date_str)
        now = datetime.datetime.now(datetime.timezone.utc)
        diff = now - dt
        
        seconds = diff.total_seconds()
        if seconds < 0:
            return "just now"
        
        minutes = int(seconds // 60)
        hours = int(minutes // 60)
        days = int(hours // 24)
        
        if days > 0:
            if days == 1:
                return "1 day ago"
            return f"{days} days ago"
        elif hours > 0:
            if hours == 1:
                return "1 hour ago"
            return f"{hours} hours ago"
        elif minutes > 0:
            if minutes == 1:
                return "1 minute ago"
            return f"{minutes} minutes ago"
        else:
            return "just now"
    except Exception:
        return pub_date_str

def clean_html(text):
    """Decodes HTML entities and strips whitespace."""
    if not text:
        return ""
    return html.unescape(text).strip()

def fetch_rss(url):
    """Fetches raw RSS feed from the given URL."""
    req = urllib.request.Request(
        url,
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'}
    )
    with urllib.request.urlopen(req, timeout=10) as response:
        return response.read()

def parse_rss(xml_data):
    """Parses XML data from Google News RSS feed and extracts article list."""
    try:
        root = ET.fromstring(xml_data)
    except ET.ParseError as e:
        raise ValueError(f"Failed to parse XML: {e}")
        
    channel = root.find('channel')
    if channel is None:
        return []
        
    items = []
    for item_node in channel.findall('item'):
        title = clean_html(item_node.findtext('title', ''))
        link = item_node.findtext('link', '')
        pub_date = item_node.findtext('pubDate', '')
        source = clean_html(item_node.findtext('source', ''))
        
        # Strip source from end of title to keep title clean
        clean_title = title
        if source and clean_title.endswith(f" - {source}"):
            clean_title = clean_title[:-len(f" - {source}")].strip()
            
        items.append({
            'title': clean_title,
            'link': link,
            'pub_date': pub_date,
            'source': source
        })
    return items

def build_url(query=None, topic=None, gl='US', hl='en', ceid='US:en'):
    """Constructs the appropriate Google News RSS URL based on parameters."""
    base_url = "https://news.google.com/rss"
    params = {
        'hl': hl,
        'gl': gl,
        'ceid': ceid
    }
    
    if query:
        url = f"{base_url}/search?q={urllib.parse.quote_plus(query)}"
    elif topic:
        topic_code = TOPICS.get(topic.lower(), topic.upper())
        url = f"{base_url}/headlines/section/topic/{topic_code}"
    else:
        url = base_url
        
    query_str = urllib.parse.urlencode(params)
    if '?' in url:
        return f"{url}&{query_str}"
    return f"{url}?{query_str}"

def print_header(title):
    """Prints a beautiful title header."""
    width = 80
    border = "=" * width
    print(f"\n{Colors.BLUE}{Colors.BOLD}{border}")
    print(f" {title.upper().center(width - 2)}")
    print(f"{border}{Colors.END}\n")

def fetch_and_display(url, limit, header_title):
    """Fetches news from the URL, formats and displays it, and returns the items list."""
    print(f"{Colors.DIM}Fetching news from Google News RSS...{Colors.END}")
    try:
        xml_data = fetch_rss(url)
        items = parse_rss(xml_data)
    except Exception as e:
        print(f"\n{Colors.RED}{Colors.BOLD}Error fetching news:{Colors.END} {e}")
        return []

    if not items:
        print(f"\n{Colors.YELLOW}No articles found.{Colors.END}")
        return []

    print_header(header_title)
    
    display_items = items[:limit]
    for idx, item in enumerate(display_items, 1):
        rel_time = get_relative_time(item['pub_date'])
        source_str = f"{Colors.GREEN}{item['source']}{Colors.END}" if item['source'] else f"{Colors.DIM}Unknown Source{Colors.END}"
        
        print(f" {Colors.CYAN}{Colors.BOLD}[{idx}]{Colors.END} {Colors.BOLD}{item['title']}{Colors.END}")
        print(f"     {source_str}  •  {Colors.DIM}{rel_time}{Colors.END}")
        print()
        
    return display_items

def interactive_loop(items, current_url, limit, current_title, gl, hl, ceid):
    """Runs the main interactive CLI loop."""
    active_items = items
    while True:
        prompt = (
            f"{Colors.YELLOW}{Colors.BOLD}Commands:{Colors.END} "
            f"[1-{len(active_items)}] Open Article  |  "
            f"[s] Search  |  "
            f"[t] Topics  |  "
            f"[r] Refresh  |  "
            f"[q] Quit\n"
            f"{Colors.BOLD}Choose an action: {Colors.END}"
        )
        try:
            choice = input(prompt).strip()
        except (KeyboardInterrupt, EOFError):
            print(f"\n\n{Colors.BLUE}Goodbye!{Colors.END}")
            break

        if not choice:
            continue

        if choice.lower() in ('q', 'quit', 'exit'):
            print(f"\n{Colors.BLUE}Goodbye!{Colors.END}")
            break

        # Check if selection is a number
        if choice.isdigit():
            idx = int(choice)
            if 1 <= idx <= len(active_items):
                item = active_items[idx - 1]
                print(f"\n{Colors.DIM}Opening in browser: {item['link']}{Colors.END}")
                try:
                    webbrowser.open(item['link'])
                    print(f"{Colors.GREEN}Opened!{Colors.END}\n")
                except Exception as e:
                    print(f"{Colors.RED}Could not open browser: {e}{Colors.END}\n")
            else:
                print(f"\n{Colors.RED}Invalid index. Enter a number between 1 and {len(active_items)}.{Colors.END}\n")
            continue

        if choice.lower() in ('r', 'refresh'):
            active_items = fetch_and_display(current_url, limit, current_title)
            continue

        if choice.lower() in ('s', 'search'):
            try:
                query = input(f"{Colors.BOLD}Enter search query: {Colors.END}").strip()
            except (KeyboardInterrupt, EOFError):
                print()
                continue
            if query:
                current_title = f"Search: {query}"
                current_url = build_url(query=query, gl=gl, hl=hl, ceid=ceid)
                active_items = fetch_and_display(current_url, limit, current_title)
            continue

        if choice.lower() in ('t', 'topic', 'topics'):
            print(f"\n{Colors.BOLD}Available Topics:{Colors.END}")
            for t_alias in sorted(TOPICS.keys()):
                # List friendly topic keys
                print(f" - {Colors.CYAN}{t_alias}{Colors.END}")
            print()
            try:
                topic = input(f"{Colors.BOLD}Enter topic name: {Colors.END}").strip().lower()
            except (KeyboardInterrupt, EOFError):
                print()
                continue
            if topic in TOPICS or topic.upper() in TOPICS.values():
                current_title = f"Topic: {topic.title()}"
                current_url = build_url(topic=topic, gl=gl, hl=hl, ceid=ceid)
                active_items = fetch_and_display(current_url, limit, current_title)
            elif topic:
                print(f"\n{Colors.RED}Unknown topic: {topic}.{Colors.END}\n")
            continue

        print(f"\n{Colors.RED}Unknown command: '{choice}'{Colors.END}\n")

def main():
    parser = argparse.ArgumentParser(
        description="Google News CLI - Fetch and view Google News right from your terminal.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python gnews.py                        # Start in interactive mode with top headlines
  python gnews.py -s "artificial intelligence" # Search and print headlines, then exit
  python gnews.py -t technology -l 5      # Show top 5 technology stories and exit
  python gnews.py -s "space" -i          # Search and enter interactive mode
"""
    )
    parser.add_argument('-s', '--search', help="Search query to lookup")
    parser.add_argument('-t', '--topic', help="Google News topic (e.g. world, business, tech, sports, science, health)")
    parser.add_argument('-l', '--limit', type=int, default=10, help="Number of articles to display (default: 10)")
    parser.add_argument('-g', '--gl', default='US', help="Region code (default: US)")
    parser.add_argument('-hl', '--lang', default='en', help="Language code (default: en)")
    parser.add_argument('--ceid', help="Google News ceid parameter (default: gl:lang)")
    parser.add_argument('-i', '--interactive', action='store_true', help="Force interactive mode after printing results")

    args = parser.parse_args()

    gl = args.gl
    hl = args.lang
    ceid = args.ceid if args.ceid else f"{gl}:{hl}"
    limit = args.limit

    # Determine titles and request url
    if args.search:
        title = f"Search: {args.search}"
        url = build_url(query=args.search, gl=gl, hl=hl, ceid=ceid)
    elif args.topic:
        title = f"Topic: {args.topic.title()}"
        url = build_url(topic=args.topic, gl=gl, hl=hl, ceid=ceid)
    else:
        title = "Google News - Top Headlines"
        url = build_url(gl=gl, hl=hl, ceid=ceid)

    # Fetch and show
    items = fetch_and_display(url, limit, title)

    # Run interactive mode if explicitly requested, OR if no search/topic parameters were given
    is_interactive = args.interactive or (not args.search and not args.topic)
    if is_interactive and items:
        interactive_loop(items, url, limit, title, gl, hl, ceid)

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n{Colors.BLUE}Goodbye!{Colors.END}")
        sys.exit(0)
