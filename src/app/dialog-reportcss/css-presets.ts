/**
 * Catalogue backing the preset gallery.
 *
 * The swatch colours are duplicated from the stylesheets in
 * src/assets/report-css/ on purpose: the gallery has to paint every card
 * before any of them is chosen, and fetching ten stylesheets just to read a
 * handful of hex values would make opening the dialog slower for no gain.
 * Keep a card's swatch in step with its stylesheet's dark `:root` block.
 */
export interface CssPreset {
  /** Value used in markup and lookups. */
  id: string;
  /** File under /assets/report-css/, or null for "no stylesheet". */
  file: string | null;
  name: string;
  desc: string;
  /** Which report theme the stylesheet actually covers. */
  support: 'both' | 'dark' | 'light';
  swatch: {
    bg: string;
    panel: string;
    text: string;
    accent: string;
    /** critical, high, medium, low, info */
    sev: [string, string, string, string, string];
  };
}

export const CSS_PRESETS: CssPreset[] = [
  {
    id: 'none',
    file: null,
    name: 'Default',
    desc: 'The report’s built-in theme — no extra CSS',
    support: 'both',
    swatch: {
      bg: '#09090c', panel: '#111116', text: '#eeeef2', accent: '#00e87a',
      sev: ['#ff2d55', '#ff6820', '#f0c000', '#00e87a', '#4a9eff']
    }
  },
  {
    id: 'corporate',
    file: 'corporate.css',
    name: 'Corporate',
    desc: 'Navy with serif headings — client-ready',
    support: 'both',
    swatch: {
      bg: '#0b1220', panel: '#111a2c', text: '#e6edf8', accent: '#5b9bf0',
      sev: ['#ff5f78', '#ff8f4d', '#f2c544', '#3ddc97', '#5b9bf0']
    }
  },
  {
    id: 'slate',
    file: 'slate.css',
    name: 'Slate',
    desc: 'Neutral graphite with an indigo accent',
    support: 'both',
    swatch: {
      bg: '#101114', panel: '#17181d', text: '#eceef3', accent: '#8b8cf7',
      sev: ['#f4566d', '#f3873f', '#e8bb3c', '#45c98a', '#5aa6f0']
    }
  },
  {
    id: 'nord',
    file: 'nord.css',
    name: 'Nord',
    desc: 'Arctic blues, muted aurora severities',
    support: 'both',
    swatch: {
      bg: '#242933', panel: '#2e3440', text: '#eceff4', accent: '#88c0d0',
      sev: ['#bf616a', '#d08770', '#ebcb8b', '#a3be8c', '#81a1c1']
    }
  },
  {
    id: 'solarized',
    file: 'solarized.css',
    name: 'Solarized',
    desc: 'The precision palette, dark and light',
    support: 'both',
    swatch: {
      bg: '#002b36', panel: '#073642', text: '#fdf6e3', accent: '#2aa198',
      sev: ['#dc322f', '#cb4b16', '#b58900', '#859900', '#268bd2']
    }
  },
  {
    id: 'dracula',
    file: 'dracula.css',
    name: 'Dracula',
    desc: 'Purple and pink on deep charcoal',
    support: 'both',
    swatch: {
      bg: '#1a1b26', panel: '#282a36', text: '#f8f8f2', accent: '#bd93f9',
      sev: ['#ff5555', '#ffb86c', '#f1fa8c', '#50fa7b', '#8be9fd']
    }
  },
  {
    id: 'crimson',
    file: 'crimson.css',
    name: 'Crimson',
    desc: 'Red team — crimson on near-black',
    support: 'both',
    swatch: {
      bg: '#0a0708', panel: '#130d0f', text: '#f6eaec', accent: '#ff3355',
      sev: ['#ff3355', '#ff7a2f', '#ffc939', '#2fd98a', '#5fa8ff']
    }
  },
  {
    id: 'terminal',
    file: 'terminal.css',
    name: 'Terminal',
    desc: 'Phosphor green, monospace, square corners',
    support: 'dark',
    swatch: {
      bg: '#000000', panel: '#070a07', text: '#c8ffd4', accent: '#33ff66',
      sev: ['#ff3b4e', '#ff9a3c', '#ffe14d', '#33ff66', '#46d8ff']
    }
  },
  {
    id: 'paper',
    file: 'paper.css',
    name: 'Paper',
    desc: 'Grayscale serif, tuned for print and PDF',
    support: 'light',
    swatch: {
      bg: '#ffffff', panel: '#f4f4f2', text: '#111111', accent: '#1a1a1a',
      sev: ['#a81228', '#8a4300', '#6b5000', '#0d5c3a', '#10418f']
    }
  },
  {
    id: 'cypher',
    file: 'cypher.css',
    name: 'Midnight',
    desc: 'Deep blue with a cyan accent',
    support: 'dark',
    swatch: {
      bg: '#070b14', panel: '#0d1220', text: '#e8f0ff', accent: '#3b9eff',
      sev: ['#ff4d6a', '#ff8b3d', '#f0c040', '#3bffa0', '#3b9eff']
    }
  },
  {
    id: 'monospace',
    file: 'monospace.css',
    name: 'Monospace',
    desc: 'Plain white page, monospace body text',
    support: 'light',
    swatch: {
      bg: '#ffffff', panel: '#f4f4f6', text: '#000000', accent: '#064d96',
      sev: ['#ff2d55', '#ff6820', '#f0c000', '#00e87a', '#4a9eff']
    }
  }
];

export const SUPPORT_LABEL: { [k in CssPreset['support']]: string } = {
  both: 'Dark + Light',
  dark: 'Dark only',
  light: 'Light only'
};
