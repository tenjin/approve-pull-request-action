'use strict'

const assert = require('node:assert/strict')
const { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { test } = require('node:test')
const walk = require('ignore-walk')
const { ExternalEditor } = require('external-editor')

test('release file discovery preserves glob exclusions and negations', async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'approve-action-walk-'))
  try {
    mkdirSync(path.join(root, 'cache'))
    mkdirSync(path.join(root, 'nested'))
    writeFileSync(path.join(root, '.gitignore'), '*.log\n!keep.log\ncache/\n*.{tmp,bak}\n')
    writeFileSync(path.join(root, 'nested', '.gitignore'), '*.js\n!keep.js\n')
    for (const file of ['index.js', 'drop.log', 'keep.log', 'drop.tmp', 'drop.bak', 'cache/item', 'nested/drop.js', 'nested/keep.js']) {
      writeFileSync(path.join(root, file), 'fixture')
    }
    const files = await walk({ path: root, ignoreFiles: ['.gitignore'] })
    assert.deepEqual(files, ['.gitignore', 'index.js', 'keep.log', 'nested/.gitignore', 'nested/keep.js'])
    assert.deepEqual(walk.sync({ path: root, ignoreFiles: ['.gitignore'] }), files)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('release editor creates and removes a temporary file without launching an editor', () => {
  const editor = new ExternalEditor('isolated release notes')
  const file = editor.tempFile
  try {
    assert.equal(readFileSync(file, 'utf8'), 'isolated release notes')
  } finally {
    editor.cleanup()
  }
  assert.equal(existsSync(file), false)
})
