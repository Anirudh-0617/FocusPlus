# FocusPlus Internationalization (i18n) Guide

## Overview

FocusPlus supports multiple languages with a lightweight, custom i18n implementation. Currently supported languages:

- **English (en)** - Default language
- **Hindi (hi)** - हिंदी
- **Telugu (te)** - తెలుగు
- **Tamil (ta)** - தமிழ்

## File Structure

```
src/i18n/
├── index.ts      # i18n configuration and utilities
├── en.json       # English translations (default/fallback)
├── hi.json       # Hindi translations
├── te.json       # Telugu translations
└── ta.json       # Tamil translations
```

## How Translation Fallback Works

1. When a translation key is requested, the system first looks in the user's selected language file
2. If the key is not found (returns the key path itself), it falls back to English (`en.json`)
3. If still not found, the raw key path is returned (e.g., `"nav.dashboard"`)

This ensures the UI always displays meaningful text, even if a translation is missing.

## Adding a New Language

### Step 1: Create the Translation File

Create a new JSON file in `src/i18n/` (e.g., `kn.json` for Kannada):

```json
{
  "common": {
    "loading": "ಲೋಡ್ ಆಗುತ್ತಿದೆ...",
    "save": "ಉಳಿಸಿ",
    ...
  },
  ...
}
```

Use `en.json` as a template - copy all keys and translate the values.

### Step 2: Register the Language

Update `src/i18n/index.ts`:

```typescript
import kn from './kn.json';

export type Language = 'en' | 'hi' | 'te' | 'ta' | 'kn';

export const translations: Record<Language, typeof en> = {
  en,
  hi,
  te,
  ta,
  kn,  // Add new language
};

export const languageNames: Record<Language, string> = {
  en: 'English',
  hi: 'हिंदी (Hindi)',
  te: 'తెలుగు (Telugu)',
  ta: 'தமிழ் (Tamil)',
  kn: 'ಕನ್ನಡ (Kannada)',  // Add display name
};
```

### Step 3: Update Database (Optional)

If you want to persist the preference, no changes needed - the `language_preference` column accepts any string value.

## Using Translations in Components

### Basic Usage

```tsx
import { useLanguage } from '@/hooks/useLanguage';

function MyComponent() {
  const { t } = useLanguage();
  
  return (
    <h1>{t('dashboard.title')}</h1>
  );
}
```

### Changing Language

```tsx
import { useLanguage } from '@/hooks/useLanguage';

function LanguageSelector() {
  const { language, setLanguage, languageNames } = useLanguage();
  
  return (
    <select 
      value={language} 
      onChange={(e) => setLanguage(e.target.value as Language)}
    >
      {Object.entries(languageNames).map(([code, name]) => (
        <option key={code} value={code}>{name}</option>
      ))}
    </select>
  );
}
```

## Translation Key Naming Convention

Use dot notation to organize keys hierarchically:

- `common.*` - Shared UI elements (buttons, labels)
- `nav.*` - Navigation items
- `auth.*` - Authentication pages
- `dashboard.*` - Dashboard page
- `planner.*` - Study planner
- `tasks.*` - Tasks/Quests page
- `notes.*` - Notes page
- `chat.*` - AI Chat
- `achievements.*` - Achievements page
- `settings.*` - Settings page
- `languages.*` - Language names

## Best Practices

1. **Always use translation keys** - Never hardcode visible text in components
2. **Keep English updated** - `en.json` is the source of truth and fallback
3. **Test all languages** - Switch languages to verify translations display correctly
4. **Escape special characters** - Use proper JSON escaping for quotes, etc.
5. **Maintain consistency** - Use the same terms for the same concepts across languages

## Adding More Indian Languages

Common Indian languages you might want to add:

- Kannada (kn) - ಕನ್ನಡ
- Malayalam (ml) - മലയാളം
- Bengali (bn) - বাংলা
- Marathi (mr) - मराठी
- Gujarati (gu) - ગુજરાતી
- Punjabi (pa) - ਪੰਜਾਬੀ
- Odia (or) - ଓଡ଼ିଆ

Follow the same steps outlined above to add any of these languages.
