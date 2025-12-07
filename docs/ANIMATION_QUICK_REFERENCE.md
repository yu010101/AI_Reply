# Animation Quick Reference

Quick copy-paste examples for common animation patterns.

## Table of Contents
- [Buttons](#buttons)
- [Cards](#cards)
- [Lists](#lists)
- [Forms](#forms)
- [Toasts](#toasts)
- [Loading States](#loading-states)
- [Success States](#success-states)
- [Page Transitions](#page-transitions)

## Buttons

### Animated Button Component
```tsx
import { AnimatedButton } from '@/components/animations';

<AnimatedButton variant="contained" color="primary">
  Click Me
</AnimatedButton>
```

### CSS Hover Effect
```tsx
<Button className="hover-scale transition-smooth">
  Click Me
</Button>
```

## Cards

### Animated Card with Hover
```tsx
import { AnimatedCard } from '@/components/animations';

<AnimatedCard enableHover>
  <CardContent>Content</CardContent>
</AnimatedCard>
```

### CSS Hover Lift
```tsx
<Card className="hover-lift transition-smooth">
  <CardContent>Content</CardContent>
</Card>
```

### Card with Stagger Delay
```tsx
<AnimatedCard delay={0.1 * index}>
  <CardContent>Item {index}</CardContent>
</AnimatedCard>
```

## Lists

### Stagger List
```tsx
import StaggerList, { StaggerListItem } from '@/components/animations/StaggerList';

<StaggerList>
  {items.map(item => (
    <StaggerListItem key={item.id}>
      <Card>{item.name}</Card>
    </StaggerListItem>
  ))}
</StaggerList>
```

### Manual Stagger with Framer Motion
```tsx
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/utils/animations';

<motion.div variants={staggerContainer} initial="hidden" animate="visible">
  {items.map(item => (
    <motion.div key={item.id} variants={staggerItem}>
      <Card>{item.name}</Card>
    </motion.div>
  ))}
</motion.div>
```

### CSS Stagger Classes
```tsx
<div>
  {items.map((item, i) => (
    <div key={i} className="stagger-item">
      {item.name}
    </div>
  ))}
</div>
```

## Forms

### Error Message with Shake
```tsx
{error && (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1, x: [0, -4, 4, -4, 4, 0] }}
    transition={{ duration: 0.5 }}
  >
    <Alert severity="error">{error}</Alert>
  </motion.div>
)}
```

### Success Checkmark
```tsx
import { SuccessCheckmark } from '@/components/animations';

{isSuccess && <SuccessCheckmark size={48} />}
```

### Field Validation Feedback
```tsx
<TextField
  error={!!error}
  helperText={
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {error}
    </motion.div>
  }
/>
```

## Toasts

### Using Toast Context
```tsx
import { useToastContext } from '@/contexts/ToastContext';

const toast = useToastContext();

// Success
toast.success('Saved successfully!');

// Error
toast.error('Failed to save');

// Warning
toast.warning('Please check your input');

// Info
toast.info('New feature available');

// Custom duration (default: 5000ms)
toast.success('Quick message', 3000);
```

## Loading States

### Skeleton Cards
```tsx
import { SkeletonCard } from '@/components/animations';

{loading ? (
  <>
    <SkeletonCard variant="review" />
    <SkeletonCard variant="dashboard" />
    <SkeletonCard variant="location" />
  </>
) : (
  <ActualContent />
)}
```

### Typing Indicator (for AI)
```tsx
import { TypingIndicator } from '@/components/animations';

<Button disabled={isGenerating}>
  {isGenerating ? (
    <TypingIndicator />
  ) : (
    'Generate AI Reply'
  )}
</Button>
```

### Simple Spinner
```tsx
<div className="loading-spinner" />
```

### Pulse Animation
```tsx
<div className="animate-pulse">
  <Skeleton variant="rectangular" width="100%" height={60} />
</div>
```

## Success States

### Checkmark Animation
```tsx
import { SuccessCheckmark } from '@/components/animations';

<SuccessCheckmark size={64} color="#10b981" />
```

### Confetti Celebration
```tsx
import { useConfetti } from '@/hooks/useConfetti';

const { celebration, fire, fireworks } = useConfetti();

// Trigger on success
const handleSuccess = () => {
  celebration('first');  // or 100, 500
  toast.success('Congratulations!');
};
```

### Success with Checkmark and Toast
```tsx
const [showSuccess, setShowSuccess] = useState(false);

const handleSubmit = async () => {
  await saveData();

  setShowSuccess(true);
  toast.success('Saved successfully!');

  setTimeout(() => setShowSuccess(false), 2000);
};

return (
  <Card>
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
  </Card>
);
```

## Page Transitions

### Full Page Fade
```tsx
import { motion } from 'framer-motion';

export default function MyPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h1>Page Content</h1>
    </motion.div>
  );
}
```

### Section Reveal
```tsx
<motion.section
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ delay: 0.2 }}
>
  <SectionContent />
</motion.section>
```

### Modal/Dialog Animation
```tsx
import { motion, AnimatePresence } from 'framer-motion';
import { modalVariants, backdropVariants } from '@/utils/animations';

<AnimatePresence>
  {open && (
    <>
      <motion.div
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="backdrop"
      />
      <motion.div
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <Dialog>{content}</Dialog>
      </motion.div>
    </>
  )}
</AnimatePresence>
```

## Common Patterns

### Fade In On Mount
```tsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
>
  Content
</motion.div>
```

### Slide In From Bottom
```tsx
<motion.div
  initial={{ opacity: 0, y: 50 }}
  animate={{ opacity: 1, y: 0 }}
>
  Content
</motion.div>
```

### Scale Pop-In
```tsx
<motion.div
  initial={{ opacity: 0, scale: 0.8 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
>
  Content
</motion.div>
```

### Conditional Animation
```tsx
<AnimatePresence>
  {show && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      Content
    </motion.div>
  )}
</AnimatePresence>
```

### Hover Scale Button
```tsx
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
>
  Click Me
</motion.button>
```

### Loading Transition
```tsx
{loading ? (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
  >
    <SkeletonCard />
  </motion.div>
) : (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
  >
    <ActualCard />
  </motion.div>
)}
```

## CSS-Only Alternatives

For better performance on simple animations:

### Fade In
```tsx
<div className="animate-fade-in">Content</div>
```

### Slide In Up
```tsx
<div className="animate-fade-in-up">Content</div>
```

### Hover Lift
```tsx
<div className="hover-lift">Content</div>
```

### Shake (Error)
```tsx
<div className="animate-shake">Error message</div>
```

### Pulse (Loading)
```tsx
<div className="animate-pulse">Loading...</div>
```

## Tips

1. **Always wrap conditional animations in `AnimatePresence`**
2. **Use CSS for simple hover effects** (better performance)
3. **Use Framer Motion for complex orchestrations**
4. **Keep animation durations short** (150-350ms)
5. **Stagger delays should be 50-100ms** between items
6. **Test on slower devices** to ensure smooth performance
7. **Respect `prefers-reduced-motion`** (automatically handled)
8. **Avoid animating `width` and `height`** (use `transform: scale` instead)
9. **Use `will-change` sparingly** (Framer Motion handles this)
10. **Clean up animations on unmount** (Framer Motion handles this)
