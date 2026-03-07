// Brand color palette for all benchmark charts
export const BRAND = {
  primary: "#1B2A4A",
  accent: "#00B4D8",
  highlight: "#ABFF40",
  secondary: "#8F4CFF",
  // Extended palette for multi-series
  teal: "#48CAE4",
  navy: "#0077B6",
  deepNavy: "#023E8A",
  lightTeal: "#90E0EF",
  paleTeal: "#ADE8F4",
  slate: "#94A3B8",
  amber: "#F59E0B",
  emerald: "#10B981",
  rose: "#EF4444",
} as const;

// Donut / Pie chart palette (ordered for visual distinction)
export const DONUT_COLORS = [
  BRAND.accent,
  BRAND.primary,
  BRAND.secondary,
  BRAND.highlight,
  BRAND.teal,
  BRAND.amber,
  BRAND.emerald,
  BRAND.rose,
  BRAND.navy,
  BRAND.slate,
];

// Chart font sizes
export const CHART_FONT = {
  title: 16,
  axis: 12,
  label: 11,
  tick: 11,
} as const;

// Common chart grid style
export const GRID_STYLE = {
  strokeDasharray: "3 3",
  stroke: "#e2e8f0",
} as const;

// Animation config
export const ANIMATION = {
  duration: 800,
  easing: "ease-out" as const,
};
