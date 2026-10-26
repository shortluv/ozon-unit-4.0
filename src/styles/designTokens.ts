/**
 * Centralized Design Tokens for Ozon Analytics Hub
 * Inspired by Linear (minimalism & typography), Stripe (financial clarity), Vercel (clean technical density)
 */

export const designTokens = {
  // Surfaces
  surface: {
    base: 'bg-white dark:bg-[#0c101b]',
    card: 'bg-white dark:bg-[#111726] border border-slate-200/90 dark:border-white/[0.08]',
    cardHover: 'hover:border-slate-300 dark:hover:border-white/[0.14] transition-colors',
    subtle: 'bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06]',
    active: 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/30 text-emerald-800 dark:text-emerald-200',
    overlay: 'bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm',
  },

  // Typography
  text: {
    heading: 'font-semibold tracking-tight text-slate-900 dark:text-white',
    body: 'text-slate-600 dark:text-slate-300 text-xs sm:text-sm',
    muted: 'text-slate-400 dark:text-slate-500 text-xs',
    mono: 'font-mono text-xs tabular-nums',
    label: 'text-[11px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500',
  },

  // Semantic Badges & Statuses
  badge: {
    neutral: 'bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/[0.08]',
    success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25',
    danger: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/25',
    warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25',
    info: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/25',
  },

  // Interactive controls
  button: {
    primary:
      'bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-3.5 py-1.5 rounded-lg transition-all shadow-sm active:scale-[0.99] cursor-pointer inline-flex items-center gap-1.5',
    secondary:
      'bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.08] transition-all cursor-pointer inline-flex items-center gap-1.5',
    ghost:
      'hover:bg-slate-100 dark:hover:bg-white/[0.05] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5',
  },

  // Form inputs
  input: {
    base:
      'w-full text-xs bg-slate-50 dark:bg-[#0c101b] border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-1.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-500/80 transition-colors',
  },
};
