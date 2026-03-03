# Contributing to MEFAI

Thank you for your interest in contributing to MEFAI. This guide explains how to add new panels, fix bugs, and improve the terminal.

## Adding a New Panel

The easiest way to contribute is by adding a new panel. Each panel is a single file.

### Step 1: Create the File

Create `frontend/js/panels/my-panel.js`:

```javascript
import { BasePanel } from '../components/base-panel.js';

export class MyPanel extends BasePanel {
  static skill = 'Skill X: Name';
  static defaultTitle = 'My Panel';

  constructor() {
    super();
    this._refreshRate = 10000; // 10s refresh
  }

  async fetchData() {
    // Use window.mefaiApi to fetch data
    return window.mefaiApi.token.search('BTC');
  }

  renderContent(data) {
    // Return HTML string
    const items = data?.data || [];
    return window.mefaiTable.renderTable(
      [
        { key: 'symbol', label: 'Symbol' },
        { key: 'price', label: 'Price', align: 'right' },
      ],
      items
    );
  }

  afterRender(body) {
    // Bind click events, etc.
    window.mefaiTable.bindTableEvents(body, [], [], {
      onRowClick: (row) => this.emitTokenFocus(row),
    });
  }
}

customElements.define('my-panel-panel', MyPanel);
```

### Step 2: Register It

Add to `frontend/js/app.js`:
```javascript
// In panelRegistry
'my-panel': 'my-panel-panel',
```

### Step 3: Add to a Layout (Optional)

Add your panel to a layout in `frontend/js/app.js` layouts object.

## Development Setup

```bash
make install
make dev
```

## Code Style

- **Frontend:** Vanilla JS, no frameworks, no build step
- **Backend:** Python, ruff for formatting
- **CSS:** Minimal, Apple-like, no colors for market data
- **Design:** Black & white, bold/dim for up/down, no red/green

## Pull Request Process

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally with `make dev`
5. Submit a PR with a clear description

## Reporting Bugs

Use the GitHub issue template for bug reports. Include:
- Steps to reproduce
- Expected vs actual behavior
- Browser and OS info
