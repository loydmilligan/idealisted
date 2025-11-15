# Quick Reference: Animation Implementation

## One-Page Cheat Sheet

### Library Decision
**NO Framer Motion** - Use vanilla CSS + RequestAnimationFrame
- Reason: No existing dependency, native is performant, smaller bundle

---

## Flow Lines (Phase 2)

### Quick Setup
```tsx
// components/ui/FlowLine.tsx
export const FlowLine = ({ from, to, color, duration, onComplete }) => {
  // Calculate path: M x1,y1 Q cx,cy x2,y2
  // Animate: stroke-dashoffset from pathLength to 0
  // Duration: 1000ms default
}
```

### CSS Pattern
```css
.flow-line {
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
  animation: drawLine 1s ease-out forwards;
  filter: drop-shadow(0 0 4px currentColor);
}
```

### Retro Tweaks
- Colors: `var(--retro-primary)`, `var(--retro-accent-yellow)`
- Stepped: `animation-timing-function: steps(20)`
- Dotted: `stroke-dasharray: '5,3'`

---

## Particles (Phase 3)

### Quick Setup
```typescript
// lib/particles.ts
class ParticleSystem {
  particles: Particle[] = Array(50).fill(null).map(() => new Particle());
  animate = () => {
    ctx.clearRect(0, 0, width, height);
    particles.forEach(p => { p.update(); p.draw(ctx); });
    requestAnimationFrame(this.animate);
  }
}
```

### Performance Rules
- Max 100 particles
- Object pooling (reuse, don't create)
- Skip offscreen: `if (x < 0) return;`
- Separate canvas layer

### Retro Style
- Square pixels: `ctx.fillRect(x, y, 2, 2)`
- Small size: 2-4px
- Trail: Don't fully clear canvas
- Colors: Theme accents

---

## Visual Feedback

### Pulse Glow
```css
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 5px var(--retro-primary); }
  50% { box-shadow: 0 0 20px var(--retro-primary); }
}
.ai-processing { animation: pulse-glow 1.5s infinite; }
```

### Success Flash
```css
@keyframes success-flash {
  0%, 100% { background: transparent; }
  50% { background: rgba(140, 184, 17, 0.3); }
}
.success-feedback { animation: success-flash 0.5s; }
```

### Screen Flash
```javascript
const div = document.createElement('div');
div.className = 'screen-flash-overlay';
document.body.appendChild(div);
setTimeout(() => div.remove(), 400);
```

### Shake Error
```css
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
  20%, 40%, 60%, 80% { transform: translateX(4px); }
}
.error-shake { animation: shake 0.4s; }
```

---

## Performance

### GPU-Accelerated Properties
- ✅ `transform`, `opacity`
- ❌ `left`, `top`, `width`, `height`

### Optimization Checklist
```css
.animated-element {
  will-change: transform; /* GPU hint */
  contain: layout style;  /* Isolate reflows */
}
```

```javascript
// Debounce animations
if (el.classList.contains('animating')) return;
el.classList.add('animating');
setTimeout(() => el.classList.remove('animating'), 1000);
```

---

## Accessibility (CRITICAL!)

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
  .flow-line { animation: none !important; }
  .particle-canvas { display: none !important; }
}
```

### Screen Reader
```jsx
<div aria-live="polite" className="sr-only">
  Converting to task...
</div>
```

### Seizure Prevention
- Max 3 flashes per second
- No rapid red flashes

---

## Retro Enhancements

### CRT Effects
```css
/* Phosphor glow */
filter: drop-shadow(0 0 2px color) drop-shadow(0 0 8px color);

/* Color bleed */
filter: blur(0.5px) brightness(1.1);

/* Pixelation */
image-rendering: pixelated;
```

### Stepped Animations
```css
animation-timing-function: steps(5);
```

### Sound (Optional)
```javascript
const ctx = new AudioContext();
const osc = ctx.createOscillator();
osc.type = 'square';
osc.frequency.value = 440;
osc.connect(ctx.destination);
osc.start();
osc.stop(ctx.currentTime + 0.1);
```

---

## File Locations

```
/components/ui/FlowLine.tsx
/lib/particles.ts
/styles/animations.css
```

---

## Testing Commands

```bash
# Performance profiling
# Chrome DevTools > Performance > Record

# Accessibility test
# Enable: Accessibility > Reduce motion in OS settings

# FPS monitoring
# Chrome DevTools > Rendering > Frame Rendering Stats
```

---

## Common Pitfalls

1. ❌ Using `left`/`top` for animation (use `transform`)
2. ❌ Creating new particle objects in loop (use pooling)
3. ❌ Forgetting reduced motion support (breaks accessibility)
4. ❌ Too many particles (>100 = lag)
5. ❌ Not using `will-change` (misses GPU optimization)
6. ❌ Animating on every frame without checks (performance hit)

---

## Success Criteria

- ✅ 60fps on mid-range devices
- ✅ Reduced motion works correctly
- ✅ Screen reader announces state changes
- ✅ Retro aesthetic maintained
- ✅ Theme colors respected
- ✅ No layout thrashing
- ✅ Particle count < 100
- ✅ No seizure triggers

---

## Time Estimates

- Flow lines: 4-6 hours
- Particles: 8-10 hours
- Visual feedback: 2-3 hours
- Accessibility: 2-3 hours
- Testing: 4-6 hours
- **TOTAL: 20-28 hours**

---

## Example Usage

```tsx
import { FlowLine } from '@/components/ui/FlowLine';
import { ParticleSystem } from '@/lib/particles';

function MyComponent() {
  const [showFlow, setShowFlow] = useState(false);
  const sourceRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);

  const handleConvert = () => {
    setShowFlow(true);
    targetRef.current?.classList.add('success-feedback');

    // Screen flash
    const div = document.createElement('div');
    div.className = 'screen-flash-overlay';
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 400);
  };

  return (
    <>
      <div ref={sourceRef}>Source</div>
      <div ref={targetRef}>Target</div>
      <button onClick={handleConvert}>Convert</button>

      {showFlow && (
        <FlowLine from={sourceRef.current} to={targetRef.current} />
      )}
    </>
  );
}
```

---

## Key Resources

- Full code: `uiux-researcher.outputs.json`
- Detailed guide: `IMPLEMENTATION_GUIDE.md`
- MDN CSS Animations: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Animations
- CSS Triggers: https://csstriggers.com/
- Web.dev Performance: https://web.dev/rendering-performance/
