# Facebook Login Page - Design Guidelines

## Design Approach
**Reference-Based Design**: Exact replication of Facebook's web login interface (facebook.com)

## Layout Structure

**Overall Composition**:
- Full-viewport height with centered content
- Two-column desktop layout: Left (60%) value proposition, Right (40%) login card
- Mobile: Single column, stacked layout
- Container: max-w-7xl with responsive padding

**Desktop Layout**:
- Left section: Facebook branding + tagline centered vertically
- Right section: Login card elevated with shadow, max-width ~400px
- Footer: Full-width, bottom-aligned

**Mobile Layout** (< 768px):
- Logo + tagline stacked at top
- Login card full-width with horizontal margins
- Footer condensed

## Typography

**Font Stack**: 
- Primary: system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif
- Weights: Regular (400), Medium (500), Semibold (600), Bold (700)

**Type Scale**:
- Hero tagline: 28px/32px, Regular weight
- Page title (mobile): 32px/36px, Bold
- Input labels: 12px/16px, Medium
- Input text: 17px/20px, Regular
- Button text: 20px/24px, Bold
- Link text: 14px/20px, Medium
- Footer links: 12px/16px, Regular

## Component Specifications

### Login Card
- Card padding: 16px (mobile), 20px (desktop)
- Background: White elevated surface
- Border-radius: 8px
- Shadow: Subtle elevation (0 2px 4px, 0 8px 16px)
- Gap between elements: 16px

### Input Fields
- Height: 52px
- Border-radius: 6px
- Border: 1px solid (neutral border treatment)
- Padding: 14px 16px
- Font-size: 17px
- Focus state: Enhanced border (2px)
- Placeholder text: Lighter weight

### Primary Button ("Log In")
- Height: 48px
- Border-radius: 6px
- Font-size: 20px, Bold
- Full-width
- Margin-top: 16px

### Links
- "Forgotten password?": Centered, 14px, hover underline
- "Create new account" button: Secondary style, 48px height, border-radius 6px

### Divider
- Horizontal rule between login and create account: 1px, margin 20px vertical

## Spacing System
Use tailwind units: **2, 3, 4, 5, 6** (e.g., p-4, mb-6, gap-5)

**Vertical Rhythm**:
- Between inputs: 16px (space-y-4)
- Between sections: 20-24px
- Card internal padding: 16-20px
- Footer top margin: 40px

## Navigation & Footer

**Language Selector**:
- Horizontal list of language links
- Font-size: 12px
- Gap between items: 12px
- Wrap on mobile

**Footer Links**:
- Multi-row grid layout
- Links organized by category
- Font-size: 12px
- Line-height: 28px
- Copyright text: 13px, lighter treatment

## Responsive Breakpoints
- Mobile: < 768px (single column)
- Tablet: 768px - 1024px (adjusted proportions)
- Desktop: > 1024px (two-column layout)

## Images
**Facebook Logo**: 
- SVG logo in header area (left section on desktop)
- Size: ~112px wide on desktop
- Centered horizontally within left section

**No hero image** - This is a functional login page with logo-based branding only.

## Visual Treatment Notes
- Match Facebook's exact visual hierarchy and proportions
- Card-based login form with elevated appearance
- Clean, minimal aesthetic focused on usability
- Subtle shadows for depth, not dramatic effects
- No animations or transitions beyond standard focus states

## Accessibility
- Proper label-input associations
- Tab navigation order: Email → Password → Log In → Forgotten Password → Create Account
- Focus indicators clearly visible
- Sufficient color contrast ratios
- Touch targets minimum 44x44px