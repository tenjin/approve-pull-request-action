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

  const allApprovedReviewsFromActor = reviews.data.filter(
    (review) => {
      return review.user.login === actor && review.state === 'APPROVED'
    }
  )

  if (allApprovedReviewsFromActor.length > 0) {
    return
  }

  await octokit.pulls.createReview({
    ...repoObject,
    pull_number: number,
    event: 'APPROVE'
  })
}

main().catch(err => core.setFailed(err.message))
