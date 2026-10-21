# Lucid CMS - Svelte for the site plugin

Renders Svelte components from the site plugin's Kiln templates, on the server only or hydrated in the browser.

## Installation

```bash
npm install @lucidcms/site-svelte svelte
```

## Setup

```typescript
import { sitePlugin } from "@lucidcms/plugin-site";
import { svelte } from "@lucidcms/site-svelte";

sitePlugin({ ui: [svelte()] });
```

Templates name components by file, relative to the site folder. A `client` prop of `"load"`, `"idle"`, `"visible"` or `{ media: "…" }` hydrates the component in the browser; without one it renders on the server only. Components use Svelte 5. The default slot is the `children` snippet, and each other slot a snippet prop of the same name.

```twig
{% component "components/Counter.svelte" with { start: 3, client: "visible" } %}
	<p>Passed in as the default slot</p>
{% endcomponent %}
```
