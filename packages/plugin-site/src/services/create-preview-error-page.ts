const createPreviewErrorPage = () => `<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8">
		<meta name="referrer" content="no-referrer">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<title>Preview unavailable</title>
		<style>body{font:16px/1.5 system-ui,sans-serif;margin:3rem auto;max-width:32rem;padding:0 1rem;color:#1c1c1c}</style>
	</head>
	<body>
		<h1>This preview isn't available</h1>
		<p>The preview link has expired or isn't valid. Open a new preview from Lucid.</p>
		<p><a href="?preview=exit">View the published page</a></p>
	</body>
</html>`;

export default createPreviewErrorPage;
