# Claymorphism

Soft 3D "clay" for Ignite UI, built on the Material base. It uses theme tokens only.

**Rules followed** (the clay.css / Smashing Magazine recipe)
- **Clay shadow.** Every raised surface stacks a soft outer drop shadow, an inner highlight (top-left) and an
  inner shade (bottom-right). The insets are translucent white/black, so they read on any fill. That's what lets
  clay blocks have their own pastel colors, unlike neumorphism.
- **Squish on press.** The outer shadow disappears and the inner shade deepens (elevation level 20). Contained and
  fab buttons rest at level 6, lift to 10 on hover and squish when pressed.
- **Big, friendly shapes** (roundness 1) and a rounded typeface (Nunito).
- **Pastel containers, one saturated CTA.**
  - Cards are peach clay.
  - Headers, the navbar and chips are lilac clay.
  - Actions and selection are violet `#7c3aed`, with white text at 5.7:1.
- **States carry color, not only shadow.** Hover, focus and selection use violet tints (12% / 24% / 38%). Keyboard
  focus on a contained button turns it peach, so it's unmistakable.
- **Dense data stays flat.** The grid is one clay panel with a lilac header, a violet-tint hover and selection,
  and plain cells.

**Why not glassmorphism?** Frosted glass needs `backdrop-filter: blur()`, and no Ignite UI theme token exposes it
(only the snackbar and toast hardcode a blur). It also needs an app-supplied colorful background behind it. Without
both it's just translucent tint, so this repo ships clay instead. Real glass needs upstream blur tokens.
