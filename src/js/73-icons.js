/**
 * Optional emoji icons for tasks, goals and habits, and the icon picker used in the edit dialog.
 * (All src/js files are joined, in filename order, into one shared scope. See src/README.md.)
 */

/* ---------- Icons: an optional emoji shown before a task, goal or habit name ---------- */
const ICONS = [
  '🎯',
  '📚',
  '✍️',
  '💻',
  '🧠',
  '🔬',
  '➗',
  '🌍',
  '🗣️',
  '🎧',
  '🎨',
  '🎸',
  '💪',
  '🏃',
  '🚴',
  '🏊',
  '⚽',
  '🧘',
  '🙏',
  '💧',
  '🍎',
  '🥗',
  '💊',
  '🦷',
  '😴',
  '☀️',
  '🌙',
  '🧹',
  '🛒',
  '🏠',
  '🚗',
  '💰',
  '📞',
  '✉️',
  '📱',
  '⏰',
  '📝',
  '❤️',
  '👨‍👩‍👧',
  '🌱',
  '⭐',
  '🏆',
  '🔥',
  '🚭',
  '🍬',
  '🎮',
  '📖',
  '✈️',
];

/** Prefix for a title: the item's icon followed by a space, or nothing. Safe to place inside HTML. */
const iconPrefix = (item) => (item && item.icon ? esc(item.icon) + ' ' : '');

/** The "Icon" field of the edit dialog: a button that opens a grid of choices. The value travels in a hidden input. */
function iconField(icon) {
  const cur = icon || '＋';
  const cells = ICONS.map((i) => `<button type="button" data-action="icon-pick" data-i="${i}">${i}</button>`).join('');
  return `<label>${L2('Icon', 'الأيقونة')}</label>
    <div class="iconpick"><input type="hidden" name="icon" value="${esc(icon || '')}">
      <button type="button" class="ghost icon-cur" data-action="icon-toggle" aria-label="${L2('Choose an icon', 'اختر أيقونة')}">${cur}</button>
      <div class="icon-grid" hidden>${cells}<button type="button" data-action="icon-pick" data-i="" aria-label="${L2('No icon', 'بدون أيقونة')}">✕</button></div></div>`;
}
