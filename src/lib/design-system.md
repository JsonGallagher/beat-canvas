# Beat Canvas — Retro-Digital Design System

> **Authoritative style guide.** All UI decisions flow from this document.
> Last updated: 2026-02-18

---

## Concept

Beat Canvas is a deliberate cultural counterpoint: raw, fully-saturated CGA/EGA pixel-era colors from 1980s computing (IBM, Sierra, Tandy) paired against the restrained, classical serif typography used in 1980s business computer advertising. The tension between these two registers — pixel chaos vs. editorial grace — is the aesthetic identity.

**Two worlds, no compromise:**
- **Digital world** — pure CGA 4-bit palette at 100% saturation, always
- **Editorial world** — Playfair Display serif as the dignified frame around the pixel content

---

## 1. Color Philosophy

### Rule
Colors come from two opposing worlds that must coexist without compromise.

| World | Role | Principle |
|-------|------|-----------|
| Digital | CGA palette accents | Pure, fully-saturated. No tints, no opacity washes on backgrounds. 100% saturation only. |
| Hardware | IBM warm neutrals | Muted warm grays for contrast surfaces (bezels, captions) |
| Terminal | Off-white text | `#EBEBEB` — never pure white. IBM monochrome phosphor, slightly warm. |

### Prohibitions
- No pastels
- No gradients between unrelated hues
- No "brand blue" (use CGA blue `#5555FF` if blue is needed)
- No muted/desaturated versions of accent colors
- No opacity washes of CGA colors on backgrounds

---

## 2. Color Tokens

### CGA 4-bit Source Palette

| Token | Value | Name |
|-------|-------|------|
| `--cga-black` | `#000000` | CGA black |
| `--cga-white` | `#FFFFFF` | CGA white |
| `--cga-green` | `#00AA00` | Standard CGA green (darker) |
| `--cga-lime` | `#55FF55` | Bright CGA light green |
| `--cga-red` | `#FF5555` | Bright CGA red |
| `--cga-red-dark` | `#AA0000` | Standard CGA red |
| `--cga-yellow` | `#FFFF55` | Bright CGA yellow |
| `--cga-cyan` | `#55FFFF` | Bright CGA light cyan |
| `--cga-magenta` | `#FF55FF` | Bright CGA light magenta |
| `--cga-blue` | `#5555FF` | Bright CGA blue |

### Phosphor Terminal Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--phosphor` | `#00FF41` | IBM 5151 green phosphor — **primary accent** |
| `--phosphor-dim` | `#00662A` | Phosphor at ~40% — secondary/disabled states |
| `--amber-p7` | `#FFB000` | P7 amber phosphor — alternative terminal accent |

### 1980s Hardware Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--hw-beige` | `#C8BCA8` | IBM PC beige — outer bezel |
| `--hw-putty` | `#A89E8C` | Darker IBM housing tone — inner bezel |
| `--hw-cream` | `#F0EAD6` | Keyboard legend color — captions on warm bg |

### Semantic Tokens

| Token | Resolves to | Usage |
|-------|-------------|-------|
| `--accent` | `--phosphor` (via HSL) | Focused/selected elements |
| `--accent-foreground` | `#000000` | Text on phosphor green |
| `--destructive` | `#FF5555` | Errors, delete actions (CGA red) |
| `--cga-alert` | `#FF5555` | Alias for alert contexts |
| `--pixel-border` | `#242424` | Default sharp borders |
| `--ring` | `--phosphor` | Focus rings |

### Surface Hierarchy

| Token | Value | Level |
|-------|-------|-------|
| `--surface-0` | `#000000` | Base — page background |
| `--surface-1` | `#0A0A0A` | Cards, panels |
| `--surface-2` | `#111111` | Inputs, nested panels |
| `--surface-3` | `#1A1A1A` | Hover states |
| `--surface-4` | `#242424` | Active/selected states |

### Border Hierarchy

| Token | Value | Usage |
|-------|-------|-------|
| `--border-dim` | `#1A1A1A` | Subtle dividers |
| `--border-base` | `#242424` | Standard borders |
| `--border-bright` | `#3A3A3A` | Emphasized borders |
| `--border-active` | `var(--phosphor)` | Focused/selected elements |

---

## 3. Typography System

### Philosophy

These were ads for expensive, serious machines sold to businesspeople. The typography is classical, authoritative, editorial — not playful. The digital content is the subject; the serif type is the dignified frame around it.

### Font Assignments

| Font | Role |
|------|------|
| **Playfair Display** | All headings and editorial display text |
| **IBM Plex Mono** | All body copy, labels, data, code, UI chrome |

### Type Scale

| Role | Font | Size | Weight | Tracking | Usage |
|------|------|------|--------|----------|-------|
| Display | Playfair Display | 72px / 4.5rem | 700 | -0.02em | Hero headlines |
| H1 | Playfair Display | 48px / 3rem | 700 | -0.01em | Page titles |
| H2 | Playfair Display | 36px / 2.25rem | 600 | 0 | Section headers |
| H3 | Playfair Display | 24px / 1.5rem | 600 | 0 | Card headings |
| H4 | Playfair Display | 18px / 1.125rem | 500 | 0 | Sub-headers |
| Body | IBM Plex Mono | 14px / 0.875rem | 400 | 0 | UI copy |
| Label | IBM Plex Mono | 12px / 0.75rem | 500 | 0.05em | Form labels, chips |
| Caption | IBM Plex Mono | 11px / 0.6875rem | 400 | 0 | Timestamps, metadata |
| Data | IBM Plex Mono | 11px / 0.6875rem | 400 | -0.01em | Numbers, hex values |

### Typography Rules

- Headings **never** use `text-transform: uppercase` — that is a monospace convention
- Serif italic (`font-style: italic`) for emphasis in editorial contexts
- Monospace text is always `font-variant-numeric: tabular-nums` for number alignment
- Line height: serif headings `1.1–1.2`, mono body `1.5–1.6`
- Headings use negative tracking at large sizes (`-0.01em` to `-0.02em`)
- Labels use slightly positive tracking (`0.05em`) for legibility at small sizes

---

## 4. Spacing & Grid System

**Base unit: 8px** (Tailwind default scale maintained)

Derived from the pixel-grid nature of CGA displays and the structured column layouts of the print ads.

| Size | px | Tailwind | Usage |
|------|----|----------|-------|
| `1` | 4px | `gap-1`, `p-1` | Tight pixel-level gaps (icon+label, data values) |
| `2` | 8px | `gap-2`, `p-2` | Base cell |
| `4` | 16px | `gap-4`, `p-4` | Standard component padding |
| `6` | 24px | `gap-6`, `p-6` | Card padding |
| `8` | 32px | `gap-8` | Section gaps |
| `12` | 48px | `gap-12` | Large section spacing |
| `16` | 64px | `gap-16` | Page section spacing |

---

## 5. Border Radius Philosophy

**Near-zero. This is a sharp, pixel-precise world.**

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `0rem` (0px) | Badges, chips — truly square |
| `--radius` / `--radius-md` | `0.125rem` (2px) | Base — almost square |
| `--radius-lg` | `0.25rem` (4px) | Maximum rounding allowed |

No element should feel "soft" or "pill-shaped". Rounding is a concession, not a feature.

---

## 6. Border Rules

**Borders are 1px solid, always.** No border gradients. No double borders. No box-shadow simulating borders.

- Use `--border-base` (`#242424`) as the default
- Use `--border-bright` on hover states
- Use `--border-active` (phosphor green) on focus/selected states
- Use `--border-dim` for decorative dividers and separators

---

## 7. CRT & Phosphor Effects

### Utility Classes

| Class | Effect |
|-------|--------|
| `.text-glow-phosphor` | Green phosphor text glow |
| `.text-glow-amber` | Amber phosphor text glow |
| `.text-glow-cyan` | CGA cyan text glow |
| `.text-glow-red` | CGA red text glow |
| `.text-glow-magenta` | CGA magenta text glow |
| `.glow-phosphor` | Green phosphor box-shadow |
| `.glow-magenta` | Magenta box-shadow |
| `.glow-cyan` | Cyan box-shadow |
| `.glow-amber` | Amber box-shadow |
| `.glow-red` | Red box-shadow |
| `.crt-glow` | Full text glow stack (legacy, kept) |
| `.crt-scanlines` | Scanline overlay texture |
| `.crt-vignette` | Radial vignette overlay |
| `.crt-bezel` | Hardware bezel with hw-putty/hw-beige |
| `.pixel-grid` | 8px phosphor grid texture |
| `.flicker` | Phosphor flicker animation (8s cycle) |
| `.scan-in` | Text scan-in reveal (0.4s stepped) |
| `.cursor` | Blinking block cursor via `::after` |

### Animation Reference

| Animation | Duration | Usage |
|-----------|----------|-------|
| `phosphor-flicker` | 8s infinite | Applied via `.flicker` |
| `scan-in` | 0.4s, steps(20) | Applied via `.scan-in` |
| `cursor-blink` | 1s step-end | Applied internally via `.cursor::after` |
| `breathe-glow` | — | Keyframe available for custom use |
| `pulse-glow` | — | Keyframe available for custom use |
| `shimmer` | — | Keyframe available for custom use |

---

## 8. Component Design Rules

### Buttons

| Variant | Background | Text | Border | Border-radius |
|---------|------------|------|--------|---------------|
| Primary | `--phosphor` | `#000000` | none | 0 |
| Secondary | transparent | foreground | `1px solid --border-bright` | 0 |
| Destructive | `--cga-red` | `#000000` | none | 0 |
| Ghost | transparent | foreground | none | 0 |

- **Hover:** add glow shadow in the button's accent color
- **No border-radius on any button** — square corners, always
- Active/pressed state: `--surface-4` background shift

### Cards

```
background:  var(--surface-1)   → #0A0A0A
border:      1px solid var(--border-base)  → #242424
border-radius: 0.125rem
```

- No shadow — only border defines the card edge
- Hover: border → `--border-bright` + subtle phosphor box-shadow
- Selected: border → `--border-active` (phosphor)

### Inputs

```
background:  var(--surface-2)   → #111111
border:      1px solid var(--border-base)
font:        IBM Plex Mono
```

- Focus: border → `--phosphor`, ring: `0 0 0 1px var(--phosphor)` (1px, not 2px)
- All input values use monospace font
- No border-radius

### Labels

- IBM Plex Mono, 12px, weight 500, tracking 0.05em
- Color: `--muted-foreground` by default, `--foreground` when active
- Never serif

### Separators

- 1px solid `--border-dim`

### Badges / Chips

- Square (0 border-radius)
- IBM Plex Mono, 11px
- Padding: 2px 4px

### Progress Bars

- 1px outer border (`--border-base`)
- Inner fill: `--phosphor`
- No rounded ends (`border-radius: 0`)

---

## 9. Dark Mode

**This app is dark-only.** There is no light mode. The `@layer base { :root { } }` block is the only theme definition. Do not add `.dark` overrides or `@media (prefers-color-scheme)` blocks.

---

## 10. What NOT to Do

- Do not use `text-transform: uppercase` on serif headings
- Do not use opacity washes of CGA colors as backgrounds (`rgba(0,255,65,0.1)` on a large bg = no)
- Do not use border-radius > 4px on any element
- Do not use gradients between two unrelated hues
- Do not use shadow as a substitute for border
- Do not use pure white (`#FFFFFF`) for body text — use `--foreground` (`#EBEBEB`)
- Do not add a light mode
- Do not use the CGA palette colors at reduced saturation as "soft" versions
