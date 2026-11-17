/** How a site draws the form on the server, in a site plugin template or anywhere with the toolkit. */
export const drawExample = (key: string) =>
	`
// In a site plugin template, with formsSite() in its kiln.extensions
{{ form("${key}") }}

// Anywhere else on the server. Pass { script: false } to send it with your own script
const { data: html } = await toolkit.forms.render({ key: "${key}" });
`.trim();

/** How a site's own script sends the form in place, which the form's markup doesn't do by itself. */
export const sendExample = (key: string) =>
	`
const form = document.querySelector<HTMLFormElement>(
	'[data-form="${key}"]',
);

form?.addEventListener("submit", async (event) => {
	event.preventDefault();

	const response = await fetch(form.getAttribute("action") ?? "", {
		method: "POST",
		body: new FormData(form),
		// asks for JSON back, rather than a redirect to the page
		headers: { Accept: "application/json" },
	});
	const body = await response.json();

	if (response.ok) {
		// { type: "message", message } or { type: "redirect", url }
		const { confirmation } = body.data;
		if (confirmation.type === "redirect") location.assign(confirmation.url);
		else form.replaceChildren(confirmation.message);
		return;
	}

	// answers the server refused, by field name
	const errors: Record<string, { message: string }> = body.errors?.values ?? {};
	for (const [name, error] of Object.entries(errors)) {
		const element = form.querySelector<HTMLElement>(
			\`[data-error="\${name}"]\`,
		);
		if (!element) continue;
		element.textContent = error.message;
		element.hidden = false;
	}
});
`.trim();
