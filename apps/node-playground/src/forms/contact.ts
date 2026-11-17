import { defineForm, formField } from "@lucidcms/forms";

/** A code-defined form for the site's forms lab. Editors build others in the Forms collection. */
const contactForm = defineForm({
	key: "contact",
	name: "Contact",
	fields: [
		formField.text("name", { label: "Your name", required: true, width: 6 }),
		formField.email("email", { label: "Email", required: true, width: 6 }),
		formField.select("topic", {
			label: "Topic",
			placeholder: "Choose a topic",
			options: [
				{ label: "Sales", value: "sales" },
				{ label: "Support", value: "support" },
			],
		}),
		formField.textarea("message", { label: "Message", required: true }),
		formField.checkbox("terms", {
			label: "I agree to be contacted about my enquiry",
			required: true,
		}),
	],
	confirmation: {
		type: "message",
		message: "Thanks. We'll be in touch soon.",
	},
});

export default contactForm;
