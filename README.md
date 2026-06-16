# Google News CLI

A zero-dependency Python command-line interface (CLI) to fetch, search, filter, and view the latest news headlines from Google News right inside your terminal.

## Features

- **No external dependencies**: Built entirely using Python's standard library (`urllib`, `xml.etree.ElementTree`, etc.).
- **Interactive Mode**: Browse headlines, search for terms, filter by predefined topics, refresh feeds, and open articles directly in your system's default web browser.
- **CLI Options**: Run quick queries, specify topics, limit the number of articles displayed, and choose custom regions/languages.
- **Visual formatting**: Colorized terminal output using ANSI escape sequences.

## How to Run

Make the script executable:
```bash
chmod +x gnews.py
```

### 1. Interactive Mode
Run the script without any parameters to enter interactive mode with the top headlines:
```bash
./gnews.py
```
Or run with `python3`:
```bash
python3 gnews.py
```

### 2. Search
Search for a specific query and exit:
```bash
python3 gnews.py --search "artificial intelligence"
```

### 3. Topics
Filter headlines by topic (e.g., `world`, `nation`, `business`, `tech`, `sports`, `science`, `health`):
```bash
python3 gnews.py --topic technology
```

### 4. Limit Articles
Specify the number of articles to return (default is 10):
```bash
python3 gnews.py --limit 5
```

### 5. Interactive Mode with Search/Topic
Force interactive mode after performing a query or topic filter:
```bash
python3 gnews.py --search "space" --interactive
```

### 6. Country & Language Customization
Customize the language and region using standard two-letter codes:
```bash
python3 gnews.py --gl US --lang en
```

## Interactive Mode Commands

Once in the interactive menu:
- **`[1-N]`**: Enter the number of an article to open its URL in your default browser.
- **`s`**: Prompt for a new search query.
- **`t`**: List available topics and switch to a selected topic feed.
- **`r`**: Refresh the current view.
- **`q`**: Quit the application.
