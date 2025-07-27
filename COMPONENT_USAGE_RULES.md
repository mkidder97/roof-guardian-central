# Component Usage Rules

## 🚨 CRITICAL: TooltipProvider Rules

### ❌ FORBIDDEN ACTIONS

1. **NEVER** add `<TooltipProvider>` to any component file
2. **NEVER** wrap components in TooltipProvider
3. **NEVER** import TooltipProvider in component files
4. **NEVER** copy shadcn/ui components that include TooltipProvider wrappers

### ✅ ALLOWED ACTIONS

1. **ONLY** use `<Tooltip>`, `<TooltipTrigger>`, `<TooltipContent>`
2. Global TooltipProvider exists **ONLY** in `src/App.tsx`
3. Test TooltipProvider exists **ONLY** in `src/test/utils/test-utils.tsx`

### 🔍 BEFORE ADDING ANY TOOLTIP

1. Search codebase for existing TooltipProvider instances
2. Verify **ONLY TWO** exist (App.tsx and test-utils.tsx)
3. Use individual tooltip components, not provider wrapper

### ⚠️ IF YOU CREATE NESTED TOOLTIPPROVIDER

- React will crash with dispatcher.useState error
- App becomes unusable requiring manual cache clear
- This breaks the entire application

### 📝 CORRECT USAGE PATTERNS

```tsx
// ✅ CORRECT - Individual tooltip components
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

function MyComponent() {
  return (
    <Tooltip>
      <TooltipTrigger>Hover me</TooltipTrigger>
      <TooltipContent>Tooltip content</TooltipContent>
    </Tooltip>
  )
}
```

```tsx
// ❌ WRONG - Adding TooltipProvider
import { TooltipProvider, Tooltip } from '@/components/ui/tooltip'

function MyComponent() {
  return (
    <TooltipProvider> {/* ❌ NEVER DO THIS */}
      <Tooltip>...</Tooltip>
    </TooltipProvider>
  )
}
```

### 🛠️ DEBUGGING TOOLTIP ISSUES

If you see errors like:
- `TypeError: null is not an object (evaluating 'dispatcher.useState')`
- `Invalid hook call`
- `Hooks can only be called inside the body of a function component`

**SOLUTION:**
1. Search for `TooltipProvider` in all component files
2. Remove any TooltipProvider outside of App.tsx and test-utils.tsx
3. Use only individual tooltip components

### 🔧 AUTOMATED DETECTION

The project includes automated protection:
- **Runtime Detection**: Development mode catches violations
- **Build-Time Validation**: Build fails with nested providers
- **ESLint Rules**: IDE warnings for violations

## Other UI Component Rules

### Dialog/Modal Components
- Always use the base Dialog components from shadcn/ui
- Don't wrap in additional providers unless explicitly needed
- Use consistent styling with design system tokens

### Form Components
- Use react-hook-form with zod validation
- Follow consistent error handling patterns
- Implement proper accessibility attributes

### Button Components
- Use design system variants from button.tsx
- Don't add custom styling - extend variants instead
- Ensure proper hover/focus states

### Navigation Components
- Use consistent routing patterns
- Implement proper keyboard navigation
- Follow accessibility guidelines for navigation landmarks

## Design System Compliance

### Color Usage
- **NEVER** use direct colors like `text-white`, `bg-black`
- **ALWAYS** use semantic tokens from index.css
- Use HSL color format in design system
- Check dark/light mode compatibility

### Typography
- Use semantic typography tokens
- Maintain consistent font hierarchy
- Ensure proper contrast ratios

### Spacing
- Use Tailwind spacing scale
- Maintain consistent layout patterns
- Use design system spacing tokens

## Accessibility Requirements

### Keyboard Navigation
- All interactive elements must be keyboard accessible
- Implement proper tab order
- Use appropriate ARIA attributes

### Screen Reader Support
- Provide meaningful alt text for images
- Use semantic HTML elements
- Include proper heading hierarchy

### Focus Management
- Visible focus indicators
- Proper focus trapping in modals
- Logical focus flow

## Performance Guidelines

### Component Optimization
- Use React.memo for expensive re-renders
- Implement proper dependency arrays in hooks
- Avoid inline object/function creation in render

### Bundle Optimization
- Dynamic imports for large components
- Tree-shake unused dependencies
- Optimize image loading

### Memory Management
- Clean up event listeners in useEffect
- Unsubscribe from subscriptions
- Proper cleanup in custom hooks

## Testing Requirements

### Unit Tests
- Test component behavior, not implementation
- Mock external dependencies properly
- Use test-utils.tsx for consistent test setup

### Integration Tests
- Test user workflows end-to-end
- Verify accessibility compliance
- Test error handling scenarios

### Performance Tests
- Monitor component render times
- Test with large datasets
- Verify memory usage patterns