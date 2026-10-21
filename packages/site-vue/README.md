# Lucid CMS - Vue for the site plugin

Renders Vue components from the site plugin's Kiln templates, on the server only or hydrated in the browser.

## Installation

```bash
npm install @lucidcms/site-vue vue
```

## Setup

```typescript
import { sitePlugin } from "@lucidcms/plugin-site";
import { vue } from "@lucidcms/site-vue";

sitePlugin({ ui: [vue()] });
```

Templates name components by file, relative to the site folder. A `client` prop of `"load"`, `"idle"`, `"visible"` or `{ media: "…" }` hydrates the component in the browser; without one it renders on the server only. Components are single-file components. The default slot is Vue's default slot, and each other slot a named slot.

```twig
{% component "components/Counter.vue" with { start: 3, client: "visible" } %}
	<p>Passed in as the default slot</p>
{% endcomponent %}
```
