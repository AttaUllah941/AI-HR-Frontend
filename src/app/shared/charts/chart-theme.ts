/**
 * Colours for ECharts, read from the app's CSS design tokens so charts follow the light/dark theme.
 * ECharts' canvas cannot parse `oklch()`, so every token is converted to rgb() through a 1px canvas.
 */
export interface ChartTheme {
  dark: boolean;
  fontFamily: string;
  /** Primary text (titles, values). */
  text: string;
  /** Secondary text (axis labels, legends). */
  muted: string;
  /** Grid lines and axis lines. */
  grid: string;
  /** Card surface (also used for the gap between donut slices). */
  surface: string;
  primary: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  /** Categorical series colours, distinguishable in both themes. */
  palette: string[];
}

// Brand orange first, then colours that stay distinguishable from it (and from each other).
const LIGHT_PALETTE = ['#f26a1b', '#0ea5e9', '#16a34a', '#eab308', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'];
const DARK_PALETTE = ['#fb8a4c', '#38bdf8', '#4ade80', '#facc15', '#a78bfa', '#f472b6', '#2dd4bf', '#94a3b8'];

let probe: CanvasRenderingContext2D | null = null;

/** Converts any CSS colour (including oklch) to rgb()/rgba(); returns `fallback` if the browser cannot. */
export function cssColorToRgb(css: string, fallback: string): string {
  if (!css) {
    return fallback;
  }
  try {
    if (!probe) {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      probe = canvas.getContext('2d', { willReadFrequently: true });
    }
    if (!probe) {
      return fallback;
    }
    const sentinel = '#010203';
    probe.clearRect(0, 0, 1, 1);
    probe.fillStyle = sentinel;
    probe.fillStyle = css;
    if (probe.fillStyle === sentinel) {
      return fallback; // the browser rejected the colour syntax
    }
    probe.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data;
    return a < 255 ? `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})` : `rgb(${r}, ${g}, ${b})`;
  } catch {
    return fallback;
  }
}

function luminance(rgb: string): number {
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(rgb);
  if (!m) {
    return 1;
  }
  return (0.2126 * Number(m[1]) + 0.7152 * Number(m[2]) + 0.0722 * Number(m[3])) / 255;
}

export function readChartTheme(): ChartTheme {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string, fallback: string) =>
    cssColorToRgb(style.getPropertyValue(name).trim(), fallback);

  const surface = token('--zh-card', '#ffffff');
  const dark = luminance(surface) < 0.4;
  const palette = dark ? DARK_PALETTE : LIGHT_PALETTE;

  return {
    dark,
    fontFamily: getComputedStyle(document.body).fontFamily || 'Inter, system-ui, sans-serif',
    text: token('--zh-foreground', dark ? '#e5e7eb' : '#1f2937'),
    muted: token('--zh-muted-foreground', dark ? '#9ca3af' : '#64748b'),
    grid: token('--zh-border', dark ? '#374151' : '#e5e7eb'),
    surface,
    primary: token('--zh-primary', palette[0]!),
    success: token('--zh-success', palette[2]!),
    warning: token('--zh-warning', palette[3]!),
    danger: token('--zh-destructive', palette[6]!),
    info: token('--zh-secondary', palette[1]!),
    palette,
  };
}

/** Adds opacity to an rgb()/rgba()/#hex colour (for gradients and soft fills). */
export function withAlpha(color: string, alpha: number): string {
  const rgb = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(color);
  if (rgb) {
    return `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, ${alpha})`;
  }
  const hex = /^#([0-9a-f]{6})$/i.exec(color);
  if (hex) {
    const n = parseInt(hex[1]!, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
  }
  return color;
}

/** Shared tooltip look so every chart's tooltip matches the cards. */
export function tooltipStyle(t: ChartTheme) {
  return {
    backgroundColor: t.surface,
    borderColor: t.grid,
    borderWidth: 1,
    padding: [10, 12],
    textStyle: { color: t.text, fontSize: 12, fontFamily: t.fontFamily },
    extraCssText: 'box-shadow: 0 8px 24px rgb(40 30 20 / 0.12); border-radius: 12px;',
  };
}

/** Escapes text placed into ECharts HTML tooltips (labels come from user-editable data). */
export function esc(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
