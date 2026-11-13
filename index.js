'use strict'

const core = require('@actions/core')

const main = async () => {
  const { getOctokit, context } = await import('@actions/github')
  const token = core.getInput('github-token')
  const number = core.getInput('number')
  const repoString = core.getInput('repo')
  const actor = core.getInput('actor')

  let repoObject
  if (repoString) {
    const [owner, repo] = repoString.split('/')
    repoObject = { owner, repo }
  } else {
    repoObject = context.repo
  }

  const octokit = getOctokit(token)

  const reviews = await octokit.rest.pulls.listReviews({
    ...repoObject,
    pull_number: number,
    per_page: 100
  })

  const allReviewsFromActor = reviews.data.filter((review) => review.user.login === actor)
  const sorted = allReviewsFromActor.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))
  const mostRecent = sorted[0]

  if (allReviewsFromActor.length > 0 && mostRecent.state === 'APPROVED') {
    core.info('Pull request is already approved by our most recent review.')
    return
  }

  await octokit.rest.pulls.createReview({
    ...repoObject,
    pull_number: number,
    event: 'APPROVE'
  })
  core.info('Approved the pull request.')
}

main().catch(err => core.setFailed(err.message))
