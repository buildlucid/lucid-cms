import { defineRoute } from "@lucidcms/core";

const sendTestEmailRoute = defineRoute({
	method: "post",
	path: "/send-test-email",
	openAPI: {
		summary: "Send playground test email",
		description:
			"Sends the playground attachment test email via the Lucid toolkit.",
		tags: ["Playground"],
	},
	handler: async ({ hono, toolkit }) => {
		const result = await toolkit.email.send({
			to: "hello@williamyallop.com",
			subject: "Lucid playground attachment test",
			template: "attachment-test",
			attachments: [
				{
					type: "url",
					url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
					filename: "dummy.pdf",
					contentType: "application/pdf",
				},
				{
					type: "url",
					url: "https://www.w3.org/assets/logos/w3c/w3c-no-bars.svg",
					filename: "inline-logo.svg",
					contentType: "image/svg+xml",
					disposition: "inline",
					contentId: "playground-inline-logo",
				},
			],
			data: {
				name: "William",
				attachmentName: "dummy.pdf",
			},
		});

		if (result.error) {
			return hono.json(
				{
					error: {
						name: result.error.name,
						message: result.error.message,
					},
				},
				result.error.status === 400 ? 400 : 500,
			);
		}

		return hono.json({
			data: result.data,
		});
	},
});

export default sendTestEmailRoute;
