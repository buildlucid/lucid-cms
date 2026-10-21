# Lucid CMS - React for the site plugin

Renders React components from the site plugin's Kiln templates, on the server only or hydrated in the browser, with Fast Refresh in development.

## Installation

```bash
npm install @lucidcms/site-react react react-dom
```

## Setup

```typescript
import { sitePlugin } from "@lucidcms/plugin-site";
import { react } from "@lucidcms/site-react";

sitePlugin({ ui: [react()] });
```

Templates name components by file, relative to the site folder. A `client` prop of `"load"`, `"idle"`, `"visible"` or `{ media: "…" }` hydrates the component in the browser; without one it renders on the server only.

```twig
{% component "components/Counter.tsx" with { start: 3, client: "visible" } %}
	<p>Passed in as children</p>
{% endcomponent %}
```

With another JSX library, such as Solid, give one of them `include`, such as `react({ include: ["components/react/**"] })`.
