# Lucid CMS - Vue for the site plugin

> **Experimental:** this package is new and may have breaking changes in any release, including minor ones. Check the changelog before you upgrade.

Renders Vue components from the site plugin's Kiln templates, on the server only or hydrated in the browser.

## Installation

```bash
npm install @lucidcms/site-vue vue
```

## Setup

```typescript
import { site } from "@lucidcms/site";
import { vue } from "@lucidcms/site-vue";

site({ ui: [vue()] });
```

Templates name components by file, relative to the site folder. A `client` prop of `"load"`, `"idle"`, `"visible"` or `{ media: "…" }` hydrates the component in the browser; without one it renders on the server only. Components are single-file components. The default slot is Vue's default slot, and each other slot a named slot.

```twig
{% component "components/Counter.vue" with { start: 3, client: "visible" } %}
	<p>Passed in as the default slot</p>
{% endcomponent %}
```
