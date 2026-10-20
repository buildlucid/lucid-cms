import createErrorDocument from "../http/create-error-document.js";

const createPreviewErrorPage = () =>
	createErrorDocument({
		title: "Preview unavailable",
		body: `<h1>This preview isn't available</h1>
			<p>The preview link has expired or isn't valid. Open a new preview from Lucid.</p>
			<p><a href="?preview=exit">View the published page</a></p>`,
	});

export default createPreviewErrorPage;
