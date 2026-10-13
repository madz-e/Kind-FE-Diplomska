// One source of truth for the Thought Record look.
// Plain hex values, no imports, so this file can never cause a circular import.
const HERO_PURPLE = '#9B6EF0';
const SOFT_PURPLE = '#C8A8FF';
const HERO_BLUE = '#5FA0EE';
const HERO_PINK = '#FF6FA3';

// The CBT hero card / modal header: see-through, like the Journal card
export const CBT_GRADIENT = [HERO_PURPLE + 'DD', SOFT_PURPLE + 'BB', HERO_BLUE + '99'];

// Solid version for buttons
export const CBT_SOLID = [HERO_PURPLE, SOFT_PURPLE, HERO_BLUE];

// "Where you were" (cooler, heavier) vs "where you are now" (softer, warmer)
export const BEFORE = HERO_PURPLE;
export const NOW = HERO_PINK;
export const BEFORE_GRAD = [HERO_BLUE, HERO_PURPLE];
export const NOW_GRAD = [SOFT_PURPLE, HERO_PINK];