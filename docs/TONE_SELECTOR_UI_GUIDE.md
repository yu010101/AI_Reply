# Tone Selector UI Guide

## Visual Components

### Tone Chips Layout
The tone selector displays 5 chips in a horizontal flexbox layout with wrapping:

```
┌─────────────────────────────────────────────────────────────┐
│ 返信のトーンを選択                                              │
├─────────────────────────────────────────────────────────────┤
│  ⭐ 丁寧    😊 フレンドリー   ✋ 謝罪   ❤️ 感謝   💼 プロフェッショナル  │
└─────────────────────────────────────────────────────────────┘
```

### States

#### Unselected State
```
┌───────────────────┐
│  😊 フレンドリー   │  ← Outlined, default color
└───────────────────┘
```

#### Selected State
```
┌───────────────────┐
│  ⭐ 丁寧         │  ← Filled, primary color, bold text
└───────────────────┘
```

#### Hover State
```
┌───────────────────┐
│  💼 プロフェッショナル │  ← Elevated (translateY -2px), shadow
└───────────────────┘
   with tooltip: "ビジネスライクで信頼感のある返信"
```

## Interaction Flow

### 1. Initial State (Before clicking AI返信生成)
```
┌────────────────────────────────────────────┐
│  Review Card                              │
│  ⭐⭐⭐⭐⭐ 5.0                             │
│  "素晴らしいサービスでした！"                 │
│                                           │
│        [✨ AI返信生成]  [💬 返信]         │
└────────────────────────────────────────────┘
```

### 2. After Clicking AI返信生成 (Tone Selector Expanded)
```
┌────────────────────────────────────────────┐
│  Review Card                              │
│  ⭐⭐⭐⭐⭐ 5.0                             │
│  "素晴らしいサービスでした！"                 │
│                                           │
│  返信のトーンを選択                          │
│  ⭐ 丁寧  😊 フレンドリー  ✋ 謝罪  ❤️ 感謝  💼 プロフェッショナル │
│                                           │
│              [キャンセル]  [生成する]       │
└────────────────────────────────────────────┘
```

### 3. Generating State
```
┌────────────────────────────────────────────┐
│  Review Card                              │
│  ⭐⭐⭐⭐⭐ 5.0                             │
│  "素晴らしいサービスでした！"                 │
│                                           │
│  返信のトーンを選択                          │
│  ⭐ 丁寧  😊 フレンドリー  ✋ 謝罪  ❤️ 感謝  💼 プロフェッショナル │
│                                           │
│              [キャンセル]  [⚪ 生成中...]   │
└────────────────────────────────────────────┘
```

### 4. After Generation (Reply Field Populated)
```
┌────────────────────────────────────────────┐
│  Review Card                              │
│  ⭐⭐⭐⭐⭐ 5.0                             │
│  "素晴らしいサービスでした！"                 │
│                                           │
│  ┌────────────────────────────────────┐  │
│  │ 田中太郎様                           │  │
│  │                                    │  │
│  │ この度は当店をご利用いただき、        │  │
│  │ 誠にありがとうございます。...        │  │
│  └────────────────────────────────────┘  │
│                                           │
│              [キャンセル]  [返信する]       │
└────────────────────────────────────────────┘
```

## Icon Reference

| Tone | Icon | Component | Description |
|------|------|-----------|-------------|
| 丁寧 | ⭐ | AutoAwesome | Sparkles/magic wand icon |
| フレンドリー | 😊 | SentimentSatisfiedAlt | Smiling face icon |
| 謝罪 | ✋ | PanTool | Raised hand icon |
| 感謝 | ❤️ | Favorite | Heart icon |
| プロフェッショナル | 💼 | BusinessCenter | Briefcase icon |

## Colors

### Theme Colors
- **Primary (Selected)**: MUI theme primary color (typically blue)
- **Default (Unselected)**: Grey/neutral color
- **Text**:
  - Selected: Bold (font-weight: 600)
  - Unselected: Normal (font-weight: 400)

### Hover Effects
```css
transition: all 0.2s ease
&:hover {
  transform: translateY(-2px)
  box-shadow: theme.shadows[2]
}
```

## Accessibility

### Tooltips
Every chip has a tooltip that displays the full description:
- Shows on hover
- Positioned above the chip (placement="top")
- Includes an arrow pointer
- Contains descriptive text about the tone

### Keyboard Navigation
- Chips are clickable elements
- Can be navigated with Tab key
- Can be activated with Enter/Space

## Responsive Behavior

### Desktop (≥960px)
All 5 chips displayed in a single row with wrapping if needed.

### Tablet (600px - 959px)
Chips wrap to multiple rows as needed.

### Mobile (<600px)
Chips stack vertically or wrap to 2-3 per row depending on screen width.

## Animation Details

### Collapse Animation
```typescript
<Collapse in={showToneSelector === review.id}>
  {/* Tone selector content */}
</Collapse>
```
- Smooth expand/collapse transition
- Duration: Default MUI transition (300ms)
- Easing: ease-in-out

### Chip Hover Animation
```typescript
sx={{
  transition: 'all 0.2s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: 2,
  },
}}
```
- Lifts up by 2px on hover
- Adds subtle shadow
- 200ms transition

## LocalStorage Persistence

### Storage Key
```
ai-reply-last-tone
```

### Valid Values
```typescript
'polite' | 'friendly' | 'apologetic' | 'grateful' | 'professional'
```

### Behavior
1. When user selects a tone, it's immediately saved
2. On next page load, saved tone is applied as default
3. Applied to all reviews until user changes it
4. Survives page refreshes and browser sessions
