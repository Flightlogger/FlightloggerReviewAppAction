# FlightLogger Review App Action

GitHub Action to create and destroy Heroku review apps via the Platform API. Designed for GitHub-connected Heroku pipelines where review app lifecycle is controlled by PR labels rather than Heroku's built-in automatic review apps.

## How it works

- **Create**: Downloads the source tarball from GitHub (using a token for private repos), resolves a temporary URL, and calls the Heroku Review Apps API to create a new review app for the PR branch. If a review app already exists for the PR, it is deleted first.
- **Destroy**: Finds the review app matching the PR number and deletes it.

## Inputs

| Name | Required | Description |
|------|----------|-------------|
| `command` | Yes | `create` or `destroy` |
| `pr_number` | Yes | Pull request number |
| `pr_branch` | For create | Pull request branch name |
| `heroku_api_key` | Yes | Heroku Platform API key |
| `heroku_pipeline_id` | Yes | Heroku pipeline UUID |
| `github_token` | For create | GitHub token for fetching source tarball |

## Usage

```yaml
# Create a review app when a label is added
on:
  pull_request:
    types: [labeled]

jobs:
  create-review-app:
    if: github.event.label.name == 'review-app'
    runs-on: ubuntu-latest
    steps:
      - uses: Flightlogger/FlightloggerReviewAppAction@v1
        with:
          command: create
          pr_number: ${{ github.event.pull_request.number }}
          pr_branch: ${{ github.event.pull_request.head.ref }}
          heroku_api_key: ${{ secrets.HEROKU_API_KEY }}
          heroku_pipeline_id: ${{ secrets.HEROKU_PIPELINE_ID }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

```yaml
# Destroy when the label is removed, PR is closed, or merged
on:
  pull_request:
    types: [unlabeled, closed]

jobs:
  destroy-review-app:
    if: |
      (github.event.action == 'closed') ||
      (github.event.action == 'unlabeled' && github.event.label.name == 'review-app')
    runs-on: ubuntu-latest
    steps:
      - uses: Flightlogger/FlightloggerReviewAppAction@v1
        with:
          command: destroy
          pr_number: ${{ github.event.pull_request.number }}
          heroku_api_key: ${{ secrets.HEROKU_API_KEY }}
          heroku_pipeline_id: ${{ secrets.HEROKU_PIPELINE_ID }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

## Development

```bash
npm install
npm run build    # compiles TypeScript and bundles with @vercel/ncc into dist/
```
