'use strict'

const assert = require('node:assert/strict')
const { spawn } = require('node:child_process')
const http = require('node:http')
const path = require('node:path')
const { test } = require('node:test')

const root = path.resolve(__dirname, '..')
const actor = 'approval-bot'
const review = (login, state, submittedAt) => ({ user: { login }, state, submitted_at: submittedAt })
const cases = [
  { name: 'approves with no reviews', reviews: [], approve: true },
  { name: 'ignores another actor approval', reviews: [review('other', 'APPROVED', '2026-11-12')], approve: true },
  { name: 'skips an existing actor approval', reviews: [review(actor, 'APPROVED', '2026-11-12')], approve: false },
  { name: 'uses the newest actor review when approval is superseded', reviews: [review(actor, 'APPROVED', '2026-11-10'), review(actor, 'CHANGES_REQUESTED', '2026-11-12')], approve: true },
  { name: 'uses the newest actor approval regardless of response order', reviews: [review(actor, 'APPROVED', '2026-11-12'), review(actor, 'COMMENTED', '2026-11-10')], approve: false },
  { name: 'uses the context repository by default', reviews: [], approve: true, contextRepo: true },
  { name: 'reports a list failure', reviews: [], listError: true },
  { name: 'reports an approval failure', reviews: [], approve: true, createError: true }
]

for (const entrypoint of ['index.js', 'dist/index.js']) {
  for (const scenario of cases) {
    test(`${entrypoint}: ${scenario.name}`, async () => {
      const requests = []
      const server = http.createServer(async (req, res) => {
        let body = ''
        for await (const chunk of req) body += chunk
        requests.push({ method: req.method, url: req.url, body: body && JSON.parse(body) })
        res.setHeader('Content-Type', 'application/json')
        if ((req.method === 'GET' && scenario.listError) || (req.method === 'POST' && scenario.createError)) {
          res.statusCode = 403
          res.end(JSON.stringify({ message: 'isolated failure' }))
        } else {
          res.end(JSON.stringify(req.method === 'GET' ? scenario.reviews : { state: 'APPROVED' }))
        }
      })
      await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
      try {
        const endpoint = `http://127.0.0.1:${server.address().port}`
        const child = spawn(process.execPath, [entrypoint], {
          cwd: root,
          env: {
            PATH: process.env.PATH,
            GITHUB_API_URL: endpoint,
            GITHUB_REPOSITORY: 'context/project',
            'INPUT_GITHUB-TOKEN': 'isolated-test-token',
            INPUT_NUMBER: '42',
            INPUT_ACTOR: actor,
            INPUT_REPO: scenario.contextRepo ? '' : 'explicit/project'
          },
          stdio: ['ignore', 'pipe', 'pipe']
        })
        let stdout = ''
        let stderr = ''
        child.stdout.on('data', chunk => { stdout += chunk })
        child.stderr.on('data', chunk => { stderr += chunk })
        const timer = setTimeout(() => child.kill('SIGKILL'), 10000)
        const code = await new Promise((resolve, reject) => {
          child.on('error', reject)
          child.on('exit', resolve)
        })
        clearTimeout(timer)
        assert.equal(code, scenario.listError || scenario.createError ? 1 : 0, stdout + stderr)
        assert.equal(requests.length, scenario.approve ? 2 : 1)
        const repository = scenario.contextRepo ? 'context/project' : 'explicit/project'
        assert.deepEqual(requests[0], { method: 'GET', url: `/repos/${repository}/pulls/42/reviews?per_page=100`, body: '' })
        if (scenario.approve) assert.deepEqual(requests[1], { method: 'POST', url: `/repos/${repository}/pulls/42/reviews`, body: { event: 'APPROVE' } })
        assert.match(stdout, scenario.listError || scenario.createError ? /::error::isolated failure/ : scenario.approve ? /Approved the pull request\./ : /already approved by our most recent review/)
      } finally {
        await new Promise(resolve => server.close(resolve))
      }
    })
  }
}
