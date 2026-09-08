// sprightly (the templating engine) does no HTML escaping of its own, so a value meant for a quoted HTML
// attribute needs to be escaped by the caller before it ever reaches a template. `&` first, so it doesn't
// double-escape the entities produced by the other replacements.
export function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
