# Tone Selector Implementation

## Overview
Added a tone selection UI for AI reply generation that allows users to choose the tone/style of AI-generated responses to reviews.

## Features Implemented

### 1. Tone Options
Five tone options are now available:
- **丁寧 (Polite)** - Default -礼儀正しく、フォーマルな印象を与える返信
- **フレンドリー (Friendly)** - 親しみやすく、温かみのある返信
- **謝罪 (Apologetic)** - 誠実に謝罪の気持ちを伝える返信
- **感謝 (Grateful)** - 感謝の気持ちを強調する返信
- **プロフェッショナル (Professional)** - ビジネスライクで信頼感のある返信

### 2. Visual Design
- Uses MUI Chip components with Material Icons
- Each tone has its own distinctive icon:
  - 丁寧: AutoAwesome icon
  - フレンドリー: SentimentSatisfiedAlt icon
  - 謝罪: PanTool icon
  - 感謝: Favorite icon
  - プロフェッショナル: BusinessCenter icon
- Selected tone highlighted with primary color and filled variant
- Hover effects with smooth animations (translateY and boxShadow)
- Tooltips showing tone descriptions on hover

### 3. User Experience
- Click "AI返信生成" button to reveal tone selector
- Tone selector expands using Collapse animation
- Select desired tone from chips
- Click "生成する" to generate reply with selected tone
- Click "キャンセル" to close tone selector
- Tone selector automatically closes after successful generation

### 4. Integration
- Tone passed to `/api/ai-reply/generate` API endpoint
- API processes tone and applies appropriate instructions to OpenAI prompt
- Default tone is "丁寧" (polite) if not selected

### 5. Persistence
- User's last selected tone saved to localStorage
- Key: `ai-reply-last-tone`
- Automatically applied as default for subsequent reviews

## Files Modified

### `/src/constants/tone.ts`
- Updated TONE_OPTIONS to include new tones (polite, friendly, apologetic, grateful, professional)
- Added icon imports from @mui/icons-material
- Added description field for each tone
- Added DEFAULT_TONE constant ('polite')

### `/src/components/ai-reply/ToneSelector.tsx` (NEW)
- Created reusable ToneSelector component
- Accepts selectedTone and onToneChange props
- Renders chips with icons and tooltips
- Smooth hover animations

### `/src/components/review/ReviewList.tsx`
- Imported ToneSelector component
- Added state management for selectedTones and showToneSelector
- Implemented handleToneChange to update tone and persist to localStorage
- Implemented handleAIReplyClick to toggle tone selector
- Modified UI to show/hide tone selector with Collapse animation
- Updated generateAIReply to use selected tone

### `/pages/api/ai-reply/generate.ts`
- Updated tone switch statement to handle 'polite' tone
- Changed default tone from 'friendly' to 'polite'
- Tone instructions properly applied to OpenAI prompts

## Usage

1. Navigate to the Reviews page
2. Find a review you want to reply to
3. Click the "AI返信生成" button
4. A tone selector will expand showing 5 tone options
5. Select your desired tone by clicking the chip
6. Click "生成する" to generate the AI reply
7. The generated reply will appear in the reply text field
8. Edit if needed and submit

## Technical Details

### Tone State Management
```typescript
const [selectedTones, setSelectedTones] = useState<Record<string, Tone>>({});
const [showToneSelector, setShowToneSelector] = useState<string | null>(null);
```

### LocalStorage Integration
```typescript
// Save to localStorage on tone change
localStorage.setItem('ai-reply-last-tone', tone);

// Load from localStorage on component mount
const savedTone = localStorage.getItem('ai-reply-last-tone');
```

### API Integration
```typescript
const response = await fetch('/api/ai-reply/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    reviewId,
    tone, // Selected tone passed to API
  }),
});
```

## Future Enhancements
- Add custom tone options for users to define their own
- A/B testing to show which tones generate better customer engagement
- Analytics to track most-used tones
- Tone recommendations based on review sentiment
- Multi-language tone support
