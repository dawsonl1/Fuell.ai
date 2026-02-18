# CareerVine Chrome Extension

A Chrome extension that integrates LinkedIn profile scraping with the CareerVine CRM application.

## Features

- **LinkedIn Profile Scraping**: Extract name, headline, experience, education, and contact info
- **LinkedIn Company Scraping**: Extract company details, industry, size, and website
- **Smart Duplicate Detection**: Checks for existing contacts by LinkedIn URL, email, and name similarity
- **Student Profile Filtering**: Automatically filters work experience to only include after education start date
- **Real-time Import**: Import contacts directly to your CareerVine database
- **Material Design 3 UI**: Clean, modern interface matching the CareerVine app

## Development Setup

### Prerequisites

1. **CareerVine App**: Make sure your CareerVine Next.js app is running on `localhost:3000`
2. **Supabase**: Local Supabase instance should be running
3. **Node.js**: Version 18 or higher

### Installation

1. **Clone and Setup**:
   ```bash
   cd /Users/dawsonpitcher/Projects/Networking-Helper/chrome-extension
   ```

2. **Load Extension in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `chrome-extension` directory

3. **Configure Environment**:
   - The extension uses `env/development.json` by default
   - Make sure your CareerVine app is running on `localhost:3000`
   - Local Supabase should be running on `localhost:54321`

### Usage

1. **Sign In**:
   - Click the CareerVine extension icon
   - Sign in with your CareerVine credentials
   - If you don't have an account, click "Sign up on CareerVine"

2. **Import from LinkedIn**:
   - Navigate to a LinkedIn profile or company page
   - Look for the green CareerVine ribbon on the right side
   - Click the ribbon to expand the import panel
   - Review the extracted data
   - Click "Import to CareerVine"

3. **View Recent Imports**:
   - Open the extension popup
   - Click the "Recent" tab to see recently imported contacts

## Architecture

### Extension Structure

```
chrome-extension/
├── manifest.json                 # Extension configuration
├── src/
│   ├── content/
│   │   ├── linkedin-profile.js   # LinkedIn profile scraper
│   │   ├── linkedin-company.js   # LinkedIn company scraper
│   │   └── ribbon.js             # Floating ribbon UI
│   ├── popup/
│   │   ├── popup.html            # Extension popup
│   │   ├── popup.css             # M3 styling
│   │   └── popup.js              # Popup logic
│   ├── background/
│   │   └── background.js         # Service worker
│   └── utils/
│       ├── api.js                # API client
│       └── storage.js            # Chrome storage helpers
├── assets/icons/                 # Extension icons
└── env/
    ├── development.json          # Local development config
    └── production.json           # Production config
```

### API Integration

The extension communicates with your CareerVine app through these endpoints:

- `POST /api/contacts/import` - Import contact data
- `POST /api/contacts/check-duplicate` - Check for duplicates

### Data Flow

1. **Scraping**: Content scripts extract data from LinkedIn pages
2. **UI**: Floating ribbon displays extracted data and import options
3. **Authentication**: Extension uses Supabase auth through background script
4. **Import**: Data sent to CareerVine API for storage and duplicate detection

## Data Extraction

### LinkedIn Profiles

- **Basic Info**: Name, headline, location, profile image, URL
- **Experience**: Job titles, companies, dates (filtered for students)
- **Education**: School names, degrees, dates (most recent only)
- **Contact**: Email addresses (if available)

### LinkedIn Companies

- **Basic Info**: Company name, industry, size, website
- **Details**: Headquarters location, founded year, description
- **Specialties**: Company specialties and focus areas

## Security Considerations

- **Authentication**: Uses Supabase Auth with secure token storage
- **Permissions**: Minimal permissions required (storage, activeTab, scripting)
- **Data Privacy**: All data processed locally, only sent to your own CareerVine instance
- **CORS**: Extension origin whitelisted in your API

## Development Notes

### Testing

- Test on various LinkedIn profile layouts
- Verify duplicate detection with existing contacts
- Test student profile filtering
- Check error handling for network issues

### Debugging

- Extension popup: Right-click → Inspect
- Content scripts: LinkedIn page → DevTools → Console
- Background script: chrome://extensions/ → Service worker → inspect

### Common Issues

1. **Extension not loading**: Check manifest.json syntax
2. **Ribbon not appearing**: Verify content script injection
3. **Auth failures**: Check API endpoints and Supabase connection
4. **Import errors**: Check network tab for API responses

## Production Deployment

### Environment Configuration

Update `env/production.json` with your production URLs:

```json
{
  "apiBaseUrl": "https://careervine.app/api",
  "supabaseUrl": "https://your-project.supabase.co",
  "environment": "production"
}
```

### Chrome Web Store

1. **Build**: Create production build of extension
2. **Package**: Zip the extension directory
3. **Submit**: Upload to Chrome Web Store Developer Dashboard
4. **Review**: Wait for Google review and approval

## Contributing

1. Follow the existing code style
2. Test thoroughly with various LinkedIn pages
3. Update documentation for new features
4. Ensure Material Design 3 consistency

## Support

For issues or questions:
1. Check Chrome DevTools for error messages
2. Verify CareerVine app is running locally
3. Confirm Supabase connection
4. Review extension permissions
