# Lucid CMS - Solid for the site plugin

Renders Solid components from the site plugin's Kiln templates, on the server only or hydrated in the browser.

## Installation

```bash
npm install @lucidcms/site-solid solid-js
```

## Setup

```typescript
import { sitePlugin } from "@lucidcms/plugin-site";
import { solid } from "@lucidcms/site-solid";

sitePlugin({ ui: [solid()] });
```

Templates name components by file, relative to the site folder. A `client` prop of `"load"`, `"idle"`, `"visible"` or `{ media: "…" }` hydrates the component in the browser; without one it renders on the server only.

```twig
{% component "components/Counter.tsx" with { start: 3, client: "visible" } %}
	<p>Passed in as children</p>
{% endcomponent %}
```

With another JSX library, such as React, give one of them `include`, such as `solid({ include: ["components/solid/**"] })`.
