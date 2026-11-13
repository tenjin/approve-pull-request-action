# approve-pull-request-action

A GitHub Action for approving pull requests.

Requires a runner with Node.js 24 support (Actions Runner v2.327.1 or newer).
The token still needs permission to approve the target pull request
(`pull-requests: write` for `GITHUB_TOKEN`); this action does not grant permissions.

## Usage

```yaml
steps:
  - name: Approve Pull Request
    uses: juliangruber/approve-pull-request-action@v2.0.0
    with:
      github-token: ${{ secrets.GITHUB_TOKEN }}
      actor: approval-bot # username associated with github-token
      number: 1
      repo: juliangruber/approve-pull-request-action # optional
```

## Development

Use the Node.js version in `.nvmrc`, then run:

```sh
npm ci --ignore-scripts
npm run build
npm test
npm audit
```

Commit the rebuilt `dist/` files: the action executes `dist/index.js`, not the
source entrypoint. Tests run both entrypoints against a loopback-only mock GitHub
API with a synthetic token; they do not approve real pull requests.

The SDK uses `getOctokit` and `rest.pulls` with the same actor/latest-review
approval behavior and inputs. The maintained ncc package replaces `@zeit/ncc`;
Standard replaces the obsolete formatter dependency chain. The release tooling's
`external-editor` dependency uses a patched `tmp` override, and its `ignore-walk`
dependency uses patched Minimatch 11 with isolated compatibility tests.

## Related

- [find-pull-request-action](https://github.com/juliangruber/find-pull-request-action) &mdash; Find a Pull Request
- [merge-pull-request-action](https://github.com/juliangruber/merge-pull-request-action) &mdash; Merge a Pull Request
- [octokit-action](https://github.com/juliangruber/octokit-action) &mdash; Generic Octokit.js Action

## License

MIT
