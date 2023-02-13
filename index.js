'use strict'

const core = require('@actions/core')
const { GitHub, context } = require('@actions/github')

const main = async () => {
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

  const octokit = new GitHub(token)

  const reviews = await octokit.pulls.listReviews({
    ...repoObject,
    pull_number: number,
  })

  const allReviewsFromActor = reviews.data.filter((review) => review.user.login === actor)
  const sorted = allReviewsFromActor.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))
  const mostRecent = sorted[0]

  if (allReviewsFromActor.length > 0 && mostRecent.state === 'APPROVED') {
    core.info('Pull request is already approved.')
    return
  }

  await octokit.pulls.createReview({
    ...repoObject,
    pull_number: number,
    event: 'APPROVE'
  })
  core.info('Approved the pull request.')
}

main().catch(err => core.setFailed(err.message))
