# Lucid CMS - GitHub Actions Deploy Provider

> The official GitHub Actions deploy provider for Lucid

> **Experimental:** this package is new and may have breaking changes in any release, including minor ones. Check the changelog before you upgrade.

The Lucid CMS GitHub Actions deploy provider runs a GitHub Actions workflow whenever a deploy runs, whether someone starts it from the admin, a trigger queues it or its schedule comes round. The admin shows each run's status and links to its log on GitHub.

## Installation

```bash
npm install @lucidcms/deploy-github-actions
```

## Setup

Give the workflow a `workflow_dispatch` trigger:

```yaml
on:
  workflow_dispatch:
```

Create a fine-grained personal access token, or use a GitHub App token, with read and write access to the repository's **Actions**. Then add a deploy to your Lucid CMS config file:

```typescript
import { defineConfig, defineDeploy } from "@lucidcms/core";
import { githubActions } from "@lucidcms/deploy-github-actions";
import { node } from "@lucidcms/node";
import { sqlite } from "@lucidcms/sqlite";

export default defineConfig({
  runtime: node,
  db: sqlite,
  config: (env) => ({
    url: "https://cms.example.com",
    deploys: [
      defineDeploy({
        key: "production",
        name: "Production",
        description: "Rebuilds the public site from the main branch.",
        links: [
          { label: "Live site", url: "https://example.com" },
          {
            label: "Workflow runs",
            url: "https://github.com/acme/site/actions",
          },
        ],
        provider: githubActions({
          token: env.GITHUB_TOKEN,
          repository: "acme/site",
          workflow: "deploy.yml",
          ref: "main",
        }),
        triggers: [
          {
            service: "documents",
            event: "afterChange",
            when: ({ data }) =>
              (data.change?.type === "published" ||
                data.change?.type === "unpublished") &&
              data.change.version === "production",
          },
        ],
      }),
    ],
  }),
});
```

Lucid checks each run about once a minute until it finishes.

## Configuration

| Property         | Type       | Description                                                                                   |
| ---------------- | ---------- | --------------------------------------------------------------------------------------------- |
| `token`          | `string`   | A token with read and write access to the repository's Actions                                |
| `repository`     | `string`   | The repository the workflow lives in, such as `acme/site`                                     |
| `workflow`       | `string`   | The workflow's file name, such as `deploy.yml`, or its ID                                     |
| `ref`            | `string`   | The branch or tag to run the workflow on                                                      |
| `inputs`         | `function` | Returns inputs for each run, such as `(run) => ({ lucid_run: String(run.id) })`               |
| `webhookSecret`  | `string`   | The secret of a repository webhook. When set, run status comes from GitHub instead of polling |
| `apiUrl`         | `string`   | The REST API's base URL, for GitHub Enterprise Server. Defaults to `https://api.github.com`   |
| `timeoutSeconds` | `number`   | Seconds before an unfinished run times out. Defaults to the deploy's timeout                  |

The workflow must declare every input you send under `workflow_dispatch.inputs`, or GitHub rejects the run:

```yaml
on:
  workflow_dispatch:
    inputs:
      lucid_run:
        required: false
```

## Status from webhooks

Instead of polling, GitHub can tell Lucid when a run starts and finishes:

1. Open the admin's **Deploys** page and copy the deploy's webhook URL.
2. In the repository's settings, add a webhook with that URL, the content type `application/json`, a secret, and only the **Workflow runs** event.
3. Pass the same secret as `webhookSecret`.

Lucid then stops polling. If a webhook goes missing, it checks the run once more before it times out.

The webhook URL belongs to one deploy, so each deploy that runs a workflow in the same repository needs its own webhook.

## Cancelling runs

Cancelling a run from the admin cancels its workflow run on GitHub, using the same token. If GitHub can't cancel it, such as when it has already finished, the admin shows GitHub's reason and the run carries on.

## GitHub Enterprise Server

Set `apiUrl` to your server's API, such as `https://github.example.com/api/v3`. Versions that don't return run details when a workflow is dispatched end each run as triggered, without a status.
