/** URLs of the admin's icons, which differ between the dev server and a build. */
export type AdminDocumentIcons = {
	ico: string;
	svg: string;
	appleTouch: string;
};

/** The theme runs before the app so the first paint already uses the reader's colour scheme. */
const themeScript = `<script>
      (() => {
        const storageKey = "lucid_theme_preference";
        let preference = "system";

        try {
          const stored = localStorage.getItem(storageKey);
          if (stored === "light" || stored === "dark") preference = stored;
        } catch {
          // System mode remains available when storage is unavailable.
        }

        const systemPrefersDark =
          window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
        const theme =
          preference === "light" || preference === "dark"
            ? preference
            : systemPrefersDark
              ? "dark"
              : "light";
        const root = document.documentElement;
        root.dataset.theme = theme;
        root.style.colorScheme = theme;
        document
          .querySelector('meta[name="theme-color"]')
          ?.setAttribute("content", theme === "dark" ? "#171717" : "#F1F2F0");
      })();
    </script>`;

/** Renders the admin's HTML document, with `head` holding the app's scripts, styles and any extension tags. */
const renderAdminDocument = (props: {
	icons: AdminDocumentIcons;
	head: string;
}) => `<!doctype html>
<html lang="en" class="h-full overscroll-y-none">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light dark" />
    <meta name="theme-color" content="#F1F2F0" />
    ${themeScript}
    <link rel="icon" href="${props.icons.ico}" sizes="32x32" />
    <link rel="icon" type="image/svg+xml" href="${props.icons.svg}" />
    <link rel="apple-touch-icon" href="${props.icons.appleTouch}" />
    <meta name="robots" content="noindex, nofollow">
    <title>Lucid CMS</title>
    ${props.head}
  </head>
  <body class="h-full bg-sidebar">
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root" class="h-full"></div>
  </body>
</html>
`;

export default renderAdminDocument;
