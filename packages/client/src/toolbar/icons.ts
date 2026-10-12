const icon = (path: string): string =>
	`<svg class="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;

export const lucidIcon = `<svg class="lucid-icon" viewBox="0 0 31 31" fill="none" aria-hidden="true"><path fill="#f5f5f5" d="M22.04 7.801a4.16 4.16 0 0 1 8.317 0v14.056a8.5 8.5 0 0 1-8.5 8.5h-4.706a.486.486 0 0 1-.383-.784 4.554 4.554 0 0 0 0-5.596.485.485 0 0 1 .383-.785h.031a4.857 4.857 0 0 0 4.857-4.857z"/><path fill="#97f85f" d="M4.159 0a4.16 4.16 0 0 1 4.159 4.159v14.177a4.857 4.857 0 0 0 4.857 4.857 3.582 3.582 0 1 1 0 7.164H8.5a8.5 8.5 0 0 1-8.5-8.5V4.159A4.16 4.16 0 0 1 4.159 0"/><path fill="#97f85f" d="M16.636 11.597h-2.914a1.82 1.82 0 0 0-1.822 1.821v2.914c0 1.006.816 1.822 1.822 1.822h2.914a1.82 1.82 0 0 0 1.822-1.822v-2.914a1.82 1.82 0 0 0-1.822-1.821"/></svg>`;

export const editIcon = icon(
	'<path d="M9.8 3.2 12.8 6.2M2.75 13.25l.7-3.35 7.9-7.9a1.4 1.4 0 0 1 2 2l-7.9 7.9-3.35.7Z"/>',
);

export const exitIcon = icon(
	'<path d="M6.25 3H3.5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2.75M9.5 5l3 3-3 3M12.5 8H5.75"/>',
);
