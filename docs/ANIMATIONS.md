# Animation System Documentation

This document describes the comprehensive animation system implemented in the AI Reply application.

## Overview

The application uses a combination of:
- **Framer Motion** for complex React animations
- **CSS Animations** for simple, performant transitions
- **MUI Theme** customizations for component-level animations

## Features

### 1. Button Hover Effects

All buttons have subtle hover and active states:
- **Scale transform**: 1.02x on hover, 0.98x on active
- **Smooth color transitions**: 250ms
- **Ripple effects**: Native MUI ripple is enabled

**Implementation:**
```tsx
import AnimatedButton from '@/components/animations/AnimatedButton';

<AnimatedButton variant="contained" color="primary">
  Click Me
</AnimatedButton>
```

Or use CSS classes:
```tsx
<Button className="hover-scale transition-smooth">
  Click Me
</Button>
```

### 2. Card Animations

Cards feature:
- **Fade-in on load** with stagger effect
- **Subtle lift on hover** (4px translateY, enhanced shadow)
- **Smooth transitions** when filtering/sorting

**Implementation:**
```tsx
import AnimatedCard from '@/components/animations/AnimatedCard';

<AnimatedCard delay={0.1} enableHover={true}>
  <CardContent>
    Your content here
  </CardContent>
</AnimatedCard>
```

Or use CSS classes:
```tsx
<Card className="hover-lift transition-smooth">
  Content
</Card>
```

### 3. Page Transitions

Automatic fade transitions between pages using AnimatePresence:

**Setup in _app.tsx:**
```tsx
<AnimatePresence mode="wait" initial={false}>
  <Component {...pageProps} key={router.pathname} />
</AnimatePresence>
```

**Individual page animation:**
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  Page Content
</motion.div>
```

### 4. Success States

#### Checkmark Animation
```tsx
import SuccessCheckmark from '@/components/animations/SuccessCheckmark';

<SuccessCheckmark size={64} color="#10b981" />
```

#### Confetti Celebration
```tsx
import { useConfetti } from '@/hooks/useConfetti';

const { celebration, fire, fireworks } = useConfetti();

// For milestones
celebration('first'); // First reply
celebration(100);     // 100 replies
celebration(500);     // 500 replies

// Custom confetti
fire({ particleCount: 100, spread: 70 });

// Fireworks effect
fireworks();
```

#### Toast Notifications
```tsx
import { useToastContext } from '@/contexts/ToastContext';

const toast = useToastContext();

toast.success('Operation successful!');
toast.error('Something went wrong');
toast.warning('Please be careful');
toast.info('Here is some info');
```

### 5. Loading States

#### Skeleton Screens
```tsx
import SkeletonCard from '@/components/animations/SkeletonCard';

<SkeletonCard variant="review" />
<SkeletonCard variant="dashboard" />
<SkeletonCard variant="location" />
```

#### Typing Indicator (for AI generation)
```tsx
import TypingIndicator from '@/components/animations/TypingIndicator';

<TypingIndicator color="#6366f1" />
```

#### Pulse Animation
```tsx
<div className="animate-pulse">
  Loading content...
</div>
```

### 6. Form Feedback

#### Validation Errors
Errors appear with smooth fade-in and shake animation:

```tsx
// CSS approach
<div className="form-error-enter-active">
  Error message
</div>

// For shake on error
<div className="animate-shake">
  Invalid input
</div>
```

#### Success States
```tsx
import SuccessCheckmark from '@/components/animations/SuccessCheckmark';

{isValid && <SuccessCheckmark size={24} />}
```

## Animation Utilities

### Pre-defined Variants

Located in `/src/utils/animations.ts`:

```tsx
import {
  fadeVariants,
  slideUpVariants,
  slideDownVariants,
  scaleVariants,
  cardVariants,
  buttonVariants,
  staggerContainer,
  staggerItem,
} from '@/utils/animations';
```

### Stagger Lists

Animate list items with sequential delays:

```tsx
import StaggerList, { StaggerListItem } from '@/components/animations/StaggerList';

<StaggerList>
  {items.map(item => (
    <StaggerListItem key={item.id}>
      {item.content}
    </StaggerListItem>
  ))}
</StaggerList>
```

Or using variants directly:

```tsx
<motion.div
  variants={staggerContainer}
  initial="hidden"
  animate="visible"
>
  {items.map((item, i) => (
    <motion.div key={i} variants={staggerItem}>
      {item}
    </motion.div>
  ))}
</motion.div>
```

## CSS Animation Classes

Available global classes in `/src/styles/globals.css`:

### Fade Animations
- `.animate-fade-in` - Simple fade in
- `.animate-fade-in-up` - Fade in with upward motion
- `.animate-fade-in-down` - Fade in with downward motion

### Slide Animations
- `.animate-slide-in-right` - Slide in from right
- `.animate-slide-in-left` - Slide in from left

### Scale Animations
- `.animate-scale-in` - Scale up fade in
- `.hover-scale` - Scale on hover

### Utility Animations
- `.animate-shake` - Shake for errors
- `.animate-pulse` - Pulse effect
- `.animate-bounce` - Bounce effect
- `.animate-spin` - Spinning loader

### Hover Effects
- `.hover-lift` - Lift card on hover
- `.hover-scale` - Scale slightly on hover
- `.hover-glow` - Add glow shadow on hover

### Loading States
- `.skeleton` - Shimmer loading skeleton
- `.loading-spinner` - Spinning loader
- `.typing-indicator` - Three-dot typing animation

### Transitions
- `.transition-smooth` - Smooth all transitions
- `.transition-colors-smooth` - Smooth color transitions only

## Performance Considerations

### Best Practices

1. **Use CSS animations for simple transitions** (opacity, transform)
2. **Use Framer Motion for complex orchestrations** (stagger, gestures)
3. **Limit simultaneous animations** to avoid jank
4. **Use `will-change` sparingly** and only during animation
5. **Prefer `transform` and `opacity`** for 60fps animations

### Reduced Motion

The system respects user preferences:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Duration Standards

```css
--animation-duration-fast: 150ms;
--animation-duration-normal: 250ms;
--animation-duration-slow: 350ms;
```

**When to use:**
- **Fast (150ms)**: Hover effects, button presses
- **Normal (250ms)**: Card animations, fades, most transitions
- **Slow (350ms)**: Page transitions, modal open/close

## Easing Functions

```css
--animation-easing: cubic-bezier(0.4, 0, 0.2, 1);        /* Default */
--animation-easing-smooth: cubic-bezier(0.25, 0.46, 0.45, 0.94);  /* Smooth */
--animation-easing-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55); /* Bounce */
```

## Examples

### Dashboard Cards with Stagger

```tsx
<motion.div
  variants={staggerContainer}
  initial="hidden"
  animate="visible"
>
  <Grid container spacing={3}>
    {stats.map((stat, i) => (
      <Grid item xs={12} sm={6} lg={3} key={i}>
        <motion.div variants={staggerItem}>
          <StatCard {...stat} />
        </motion.div>
      </Grid>
    ))}
  </Grid>
</motion.div>
```

### Review Cards with Hover and Success

```tsx
<Card className="hover-lift transition-smooth">
  <CardContent>
    {/* Card content */}

    <AnimatePresence>
      {showSuccess && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
        >
          <SuccessCheckmark />
        </motion.div>
      )}
    </AnimatePresence>
  </CardContent>
</Card>
```

### AI Reply Generation with Typing Indicator

```tsx
<Button
  onClick={generateReply}
  disabled={isGenerating}
>
  {isGenerating ? (
    <TypingIndicator />
  ) : (
    'AI返信生成'
  )}
</Button>
```

## MUI Theme Customizations

All MUI components have been customized with animations. See `/src/theme/muiTheme.ts` for details.

Notable customizations:
- **Buttons**: Scale on hover/active, enhanced shadows
- **Cards**: Lift on hover, smooth transitions
- **Chips**: Scale on hover/active
- **TextField**: Smooth focus transitions
- **IconButtons**: Scale on hover/active
- **ListItemButtons**: Background color transitions

## Milestone Celebrations

The system automatically triggers celebrations for:
- **First reply**: 50 confetti particles
- **100 replies**: 100 confetti particles, multiple bursts
- **500 replies**: 150 confetti particles, extended celebration

```tsx
// Automatically triggered in ReviewListEnhanced
if (totalReplies === 1) {
  celebration('first');
  toast.success('初めての返信おめでとうございます！', 5000);
}
```

## Testing Animations

To test animations without affecting production:

```tsx
// Temporarily disable for debugging
import { AnimatePresence, motion } from 'framer-motion';

// Use static prop for testing
<motion.div animate={false}>
  Content
</motion.div>
```

## Browser Support

Animations are tested and supported on:
- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)

## Troubleshooting

### Animations Not Working

1. Check if `framer-motion` is installed: `npm list framer-motion`
2. Verify CSS classes are imported: Check `globals.css` in `_app.tsx`
3. Check browser console for errors
4. Ensure AnimatePresence wraps animated components

### Performance Issues

1. Reduce number of simultaneous animations
2. Use CSS animations instead of Framer Motion for simple effects
3. Check for layout thrashing (reading then writing to DOM)
4. Use Chrome DevTools Performance tab to profile

### Reduced Motion Not Working

Verify the media query is included in `globals.css` and test with:
```js
window.matchMedia('(prefers-reduced-motion: reduce)').matches
```

## Future Enhancements

Potential improvements:
- [ ] Page transition variants based on navigation direction
- [ ] Loading progress indicators with animated progress bars
- [ ] Micro-interactions on data refresh
- [ ] Animated charts and graphs
- [ ] Gesture-based interactions (swipe, drag)
