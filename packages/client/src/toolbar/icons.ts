const icon = (path: string): string =>
	`<svg class="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;

export const lucidIcon = `<svg class="lucid-icon" viewBox="0 0 512 512" fill="none" aria-hidden="true"><path fill="#739847" d="M335.722 196.752c32.62 0 59.064 26.444 59.064 59.064s-26.444 59.063-59.064 59.063h-3.575V196.752z"/><path fill="url(#lucid-toolbar-gradient)" d="M255.115 255.487s-26.046-27.373-29.9-30.458-13.288-14.193-40.47-15.376-40.772 6.231-53.758 19.797S118 255.487 118 255.487z"/><path fill="url(#lucid-toolbar-gradient)" d="M255.115 255.487s-26.046 27.372-29.9 30.457c-3.853 3.084-13.288 14.193-40.47 15.376s-40.772-6.231-53.758-19.797S118 255.487 118 255.487z"/><path fill="url(#lucid-toolbar-gradient)" d="M238.103 32.05c66.524 24.87 76.269 110.012 76.269 110.012v104.536s-9.745-.955-17.372-3.788-16.102-11.387-16.102-11.387l-126.692-125.19s-13.135-13.478-14.83-22.757-3.814-17.293 1.271-30.355c5.085-13.061 30.931-45.94 97.456-21.071"/><path fill="url(#lucid-toolbar-gradient)" d="M238.103 478.95c66.524-24.869 76.269-110.012 76.269-110.012V264.402s-9.745.955-17.372 3.788-16.102 11.387-16.102 11.387l-126.692 125.19s-13.135 13.478-14.83 22.757-3.814 17.293 1.271 30.355c5.085 13.061 30.931 45.94 97.456 21.071"/><defs><radialGradient id="lucid-toolbar-gradient" cx="0" cy="0" r="1" gradientTransform="matrix(197.524 0 0 352.347 134.738 255.126)" gradientUnits="userSpaceOnUse"><stop stop-color="#c1fe77"/><stop offset="1" stop-color="#739847"/></radialGradient></defs></svg>`;

export const editIcon = icon(
	'<path d="M9.8 3.2 12.8 6.2M2.75 13.25l.7-3.35 7.9-7.9a1.4 1.4 0 0 1 2 2l-7.9 7.9-3.35.7Z"/>',
);

export const exitIcon = icon(
	'<path d="M6.25 3H3.5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2.75M9.5 5l3 3-3 3M12.5 8H5.75"/>',
);
