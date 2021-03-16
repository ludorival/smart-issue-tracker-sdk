import { Octokit } from '@octokit/rest'
import {
  FederatedErrors,
  Issue,
  IssueClient,
  Error,
  SavedTrackedErrors,
} from 'error-issue-tracker-sdk'

const octokit = new Octokit({
  auth: process.env.REACT_APP_GITHUB_AUTH_TOKEN,
})

export default class GithubIssueClient implements IssueClient {
  async createIssue(error: FederatedErrors): Promise<Issue> {
    const [owner, repo] = error.projectId.split('/')
    const {
      data: { number, url },
    } = await octokit.issues.create({
      owner,
      repo,
      title: error.name,
      body: `Found ${error.occurrences.length} occurences for the error ${error.name}`,
    })
    return { id: number.toString(), url }
  }
  async updateIssue(
    error: SavedTrackedErrors,
    newOccurences: Error[]
  ): Promise<Issue> {
    console.log(error)
    const [owner, repo] = error.projectId.split('/')
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: parseInt(error.issue.id),
      body: `Hey, I found ${newOccurences?.length || 1} occurrence(s) : \n- ${(
        newOccurences || error.occurrences
      )
        .map((e) => e.message)
        .join('\n - ')}`,
    })
    return error.issue
  }
}
