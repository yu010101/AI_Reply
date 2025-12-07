# Tone Selector Usage Examples

## Basic Integration

### Example 1: Adding to a Review Component

```tsx
import { useState } from 'react';
import ToneSelector from '@/components/ai-reply/ToneSelector';
import { Tone, DEFAULT_TONE } from '@/constants/tone';

function MyReviewComponent() {
  const [selectedTone, setSelectedTone] = useState<Tone>(DEFAULT_TONE);

  const handleToneChange = (tone: Tone) => {
    setSelectedTone(tone);
    // Optionally save to localStorage
    localStorage.setItem('ai-reply-last-tone', tone);
  };

  const generateReply = async () => {
    const response = await fetch('/api/ai-reply/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reviewId: '123',
        tone: selectedTone,
      }),
    });
    // Handle response...
  };

  return (
    <div>
      <ToneSelector
        selectedTone={selectedTone}
        onToneChange={handleToneChange}
      />
      <button onClick={generateReply}>Generate Reply</button>
    </div>
  );
}
```

### Example 2: With Dialog/Modal

```tsx
import { useState } from 'react';
import { Dialog, DialogContent, Button } from '@mui/material';
import ToneSelector from '@/components/ai-reply/ToneSelector';
import { Tone, DEFAULT_TONE } from '@/constants/tone';

function AIReplyDialog({ reviewId, open, onClose }) {
  const [selectedTone, setSelectedTone] = useState<Tone>(DEFAULT_TONE);
  const [generatedReply, setGeneratedReply] = useState('');

  const handleGenerate = async () => {
    const res = await fetch('/api/ai-reply/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewId, tone: selectedTone }),
    });
    const data = await res.json();
    setGeneratedReply(data.reply);
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent>
        <ToneSelector
          selectedTone={selectedTone}
          onToneChange={setSelectedTone}
        />
        <Button onClick={handleGenerate}>Generate</Button>
        <div>{generatedReply}</div>
      </DialogContent>
    </Dialog>
  );
}
```

### Example 3: With LocalStorage Persistence

```tsx
import { useState, useEffect } from 'react';
import ToneSelector from '@/components/ai-reply/ToneSelector';
import { Tone, DEFAULT_TONE } from '@/constants/tone';

function PersistentToneSelector() {
  const [selectedTone, setSelectedTone] = useState<Tone>(DEFAULT_TONE);

  // Load saved tone on mount
  useEffect(() => {
    const savedTone = localStorage.getItem('ai-reply-last-tone');
    if (savedTone && isValidTone(savedTone)) {
      setSelectedTone(savedTone as Tone);
    }
  }, []);

  const handleToneChange = (tone: Tone) => {
    setSelectedTone(tone);
    localStorage.setItem('ai-reply-last-tone', tone);
  };

  return (
    <ToneSelector
      selectedTone={selectedTone}
      onToneChange={handleToneChange}
    />
  );
}

function isValidTone(tone: string): boolean {
  return ['polite', 'friendly', 'apologetic', 'grateful', 'professional'].includes(tone);
}
```

### Example 4: Bulk Reply Generation

```tsx
import { useState } from 'react';
import ToneSelector from '@/components/ai-reply/ToneSelector';
import { Tone, DEFAULT_TONE } from '@/constants/tone';

function BulkReplyGenerator({ reviewIds }: { reviewIds: string[] }) {
  const [selectedTone, setSelectedTone] = useState<Tone>(DEFAULT_TONE);
  const [generating, setGenerating] = useState(false);

  const generateBulkReplies = async () => {
    setGenerating(true);
    try {
      const promises = reviewIds.map(reviewId =>
        fetch('/api/ai-reply/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reviewId, tone: selectedTone }),
        })
      );
      await Promise.all(promises);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <h2>Generate replies for {reviewIds.length} reviews</h2>
      <ToneSelector
        selectedTone={selectedTone}
        onToneChange={setSelectedTone}
      />
      <button onClick={generateBulkReplies} disabled={generating}>
        {generating ? 'Generating...' : 'Generate All'}
      </button>
    </div>
  );
}
```

## Advanced Examples

### Example 5: Custom Tone Descriptions

```tsx
import { Box, Chip, Tooltip } from '@mui/material';
import { TONE_OPTIONS } from '@/constants/tone';

function CustomToneDisplay() {
  return (
    <Box>
      {TONE_OPTIONS.map(option => {
        const Icon = option.icon;
        return (
          <Tooltip key={option.value} title={option.description}>
            <Chip
              icon={<Icon />}
              label={`${option.label} - ${option.value}`}
            />
          </Tooltip>
        );
      })}
    </Box>
  );
}
```

### Example 6: Conditional Tone Recommendations

```tsx
import { useState, useEffect } from 'react';
import ToneSelector from '@/components/ai-reply/ToneSelector';
import { Tone, DEFAULT_TONE } from '@/constants/tone';

function SmartToneSelector({ reviewRating }: { reviewRating: number }) {
  const [selectedTone, setSelectedTone] = useState<Tone>(DEFAULT_TONE);
  const [recommendedTone, setRecommendedTone] = useState<Tone | null>(null);

  useEffect(() => {
    // Recommend tone based on rating
    if (reviewRating <= 2) {
      setRecommendedTone('apologetic');
    } else if (reviewRating >= 4) {
      setRecommendedTone('grateful');
    } else {
      setRecommendedTone('polite');
    }
  }, [reviewRating]);

  return (
    <div>
      {recommendedTone && (
        <p>Recommended tone: {recommendedTone}</p>
      )}
      <ToneSelector
        selectedTone={selectedTone}
        onToneChange={setSelectedTone}
      />
    </div>
  );
}
```

### Example 7: Analytics Tracking

```tsx
import { useState } from 'react';
import ToneSelector from '@/components/ai-reply/ToneSelector';
import { Tone, DEFAULT_TONE } from '@/constants/tone';

function AnalyticsToneSelector() {
  const [selectedTone, setSelectedTone] = useState<Tone>(DEFAULT_TONE);

  const handleToneChange = (tone: Tone) => {
    setSelectedTone(tone);

    // Track tone selection in analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'tone_selected', {
        event_category: 'ai_reply',
        event_label: tone,
      });
    }

    // Track in custom analytics
    trackEvent('AI Reply - Tone Selected', { tone });
  };

  return (
    <ToneSelector
      selectedTone={selectedTone}
      onToneChange={handleToneChange}
    />
  );
}

function trackEvent(eventName: string, properties: Record<string, any>) {
  // Your analytics implementation
  console.log('Event:', eventName, properties);
}
```

## API Integration Examples

### Example 8: API Route with Tone

```typescript
// pages/api/ai-reply/generate.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { Tone } from '@/constants/tone';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { reviewId, tone } = req.body as { reviewId: string; tone: Tone };

  // Validate tone
  const validTones: Tone[] = ['polite', 'friendly', 'apologetic', 'grateful', 'professional'];
  if (tone && !validTones.includes(tone)) {
    return res.status(400).json({ error: 'Invalid tone' });
  }

  // Generate reply with tone...
  const reply = await generateReplyWithTone(reviewId, tone || 'polite');

  return res.status(200).json({ reply });
}
```

### Example 9: Using Tone Options Programmatically

```typescript
import { TONE_OPTIONS, Tone } from '@/constants/tone';

function getToneLabel(tone: Tone): string {
  const option = TONE_OPTIONS.find(opt => opt.value === tone);
  return option?.label || 'Unknown';
}

function getToneDescription(tone: Tone): string {
  const option = TONE_OPTIONS.find(opt => opt.value === tone);
  return option?.description || '';
}

function getToneIcon(tone: Tone) {
  const option = TONE_OPTIONS.find(opt => opt.value === tone);
  return option?.icon;
}

// Usage
const label = getToneLabel('polite'); // "丁寧"
const description = getToneDescription('friendly'); // "親しみやすく、温かみのある返信"
const Icon = getToneIcon('professional'); // BusinessCenterIcon
```

## Testing Examples

### Example 10: Unit Test

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import ToneSelector from '@/components/ai-reply/ToneSelector';

describe('ToneSelector', () => {
  it('should call onToneChange when a tone is selected', () => {
    const handleChange = jest.fn();
    render(
      <ToneSelector
        selectedTone="polite"
        onToneChange={handleChange}
      />
    );

    const friendlyChip = screen.getByText('フレンドリー');
    fireEvent.click(friendlyChip);

    expect(handleChange).toHaveBeenCalledWith('friendly');
  });

  it('should highlight the selected tone', () => {
    render(
      <ToneSelector
        selectedTone="grateful"
        onToneChange={() => {}}
      />
    );

    const gratefulChip = screen.getByText('感謝');
    expect(gratefulChip).toHaveClass('MuiChip-filled');
  });
});
```

## Best Practices

1. **Always provide a default tone**
   ```tsx
   const [tone, setTone] = useState<Tone>(DEFAULT_TONE);
   ```

2. **Validate tone from user input/API**
   ```tsx
   const isValidTone = (tone: string): tone is Tone => {
     return ['polite', 'friendly', 'apologetic', 'grateful', 'professional'].includes(tone);
   };
   ```

3. **Persist user preferences**
   ```tsx
   localStorage.setItem('ai-reply-last-tone', tone);
   ```

4. **Provide visual feedback**
   ```tsx
   <Chip
     color={selected ? 'primary' : 'default'}
     variant={selected ? 'filled' : 'outlined'}
   />
   ```

5. **Include accessibility features**
   ```tsx
   <Tooltip title={description} arrow>
     <Chip label={label} />
   </Tooltip>
   ```
