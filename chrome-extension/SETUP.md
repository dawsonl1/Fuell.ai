# Chrome Extension Setup Instructions

## Quick Start

1. **Start CareerVine App**:
   ```bash
   cd /Users/dawsonpitcher/Projects/Networking-Helper/careervine
   npm run dev
   ```

2. **Start Supabase**:
   ```bash
   cd /Users/dawsonpitcher/Projects/Networking-Helper
   supabase start
   ```

3. **Load Extension**:
   - Open Chrome
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select `/Users/dawsonpitcher/Projects/Networking-Helper/chrome-extension`

## Usage

1. **Sign In**: Click the CareerVine extension icon and sign in with your CareerVine credentials
2. **Navigate**: Go to a LinkedIn profile or company page
3. **Import**: Click the green CareerVine ribbon on the right side
4. **Review**: Check the extracted data and click "Import to CareerVine"

## What's Been Built

### ✅ Extension Core
- [x] Manifest v3 configuration
- [x] LinkedIn profile scraper
- [x] LinkedIn company scraper  
- [x] Floating ribbon UI
- [x] Material Design 3 styling
- [x] Background service worker
- [x] Chrome storage utilities

### ✅ API Integration
- [x] `/api/contacts/import` - Import contacts with duplicate detection
- [x] `/api/contacts/check-duplicate` - Check for potential duplicates
- [x] Supabase authentication integration
- [x] Student profile filtering (experience after education start)

### ✅ Features
- [x] Real-time duplicate detection (LinkedIn URL, email, name similarity)
- [x] Automatic company/school creation and linking
- [x] Experience filtering for student profiles
- [x] Material Design 3 UI matching CareerVine app
- [x] Recent imports tracking
- [x] Error handling and validation

### ✅ Development Setup
- [x] Environment configuration (dev/prod)
- [x] TypeScript compilation
- [x] Build verification
- [x] Documentation

## Next Steps

### Week 2: Integration & Testing
- Test with various LinkedIn profile layouts
- Improve scraper robustness
- Add more error handling
- Test duplicate detection scenarios

### Week 3: Features & Polish
- Add company page import functionality
- Improve duplicate detection UI
- Add import success notifications
- Optimize performance

### Week 4: Production
- Create production PNG icons
- Configure production environment
- Prepare Chrome Web Store listing
- Test production deployment

## Troubleshooting

**Extension not loading**: Check manifest.json syntax and reload extension

**Ribbon not appearing**: Verify you're on a LinkedIn profile/company page

**Authentication errors**: Ensure CareerVine app is running on localhost:3000

**Import failures**: Check browser DevTools Network tab for API errors

**Build errors**: Run `npm run build` in careervine directory to verify API routes
