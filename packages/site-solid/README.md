# Lucid CMS - Solid for the site plugin

> **Experimental:** this package is new and may have breaking changes in any release, including minor ones. Check the changelog before you upgrade.

Renders Solid components from the site plugin's Kiln templates, on the server only or hydrated in the browser.

## Installation

```bash
npm install @lucidcms/site-solid solid-js
```

## Setup

```typescript
import { site } from "@lucidcms/site";
import { solid } from "@lucidcms/site-solid";

site({ ui: [solid()] });
```

Templates name components by file, relative to the site folder. A `client` prop of `"load"`, `"idle"`, `"visible"` or `{ media: "…" }` hydrates the component in the browser; without one it renders on the server only.

```twig
{% component "components/Counter.tsx" with { start: 3, client: "visible" } %}
	<p>Passed in as children</p>
{% endcomponent %}
```

With another JSX library, such as React, give one of them `include`, such as `solid({ include: ["components/solid/**"] })`.
