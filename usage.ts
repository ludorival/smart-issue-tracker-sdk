import {
  trackErrors,
  IssueClient,
  ErrorDatabase,
  FederatedErrorsUntracked,
  RequiredFederatedErrors,
  SavedTrackedErrors,
  TrackedErrors,
  Comparator,
  Error,
} from './src'

// --- your issue client
class MyIssueClient implements IssueClient {
  async createIssue(error: FederatedErrorsUntracked) {
    // here you can create the issue related to an untracked error
    return {
      id: 'newIdIssue',
      url: 'http://issue-client/newIdIssue',
      body: `Found ${error.newOccurrences.length} occurences of "${error.name}"`,
    }
  }
  async updateIssue(error: RequiredFederatedErrors) {
    // here you can update the issue for example add a new comment for new occurences
    const comments = [
      ...(error.issue.comments as string[]),
      `Found new ${error.newOccurrences.length} occurences of ${error.name}`,
    ]
    return { ...error.issue, comments }
  }
}
// --- your database provider
class MyDatabase implements ErrorDatabase {
  store: any = {}
  async save(error: TrackedErrors) {
    // here you save the error in a store
    this.store[error.projectId] = this.store[error.projectId] || []
    const savedError = {
      id: this.store[error.projectId].length.toString(),
      ...error,
    }
    this.store[error.projectId].push(savedError)
    return savedError
  }
  async fetch(projectId: string) {
    // here you can update the issue for example add a new comment for new occurences
    return this.store[projectId] || ([] as SavedTrackedErrors[])
  }
}
// Your custom comparator
const compareError: Comparator<Error> = (a, b) =>
  a.message.toLowerCase().localeCompare(b.message.toLowerCase())
// use it
const errors = [
  { message: 'Error when create the checkout', timestamp: 1 },

  { message: 'Error When Create The Checkout', timestamp: 2 },

  { message: 'Null Pointer Exception on payment page', timestamp: 3 },

  { message: 'cannot call login on undefined', timestamp: 4 },

  { message: 'Null Pointer Exception on payment page', timestamp: 5 },
]
trackErrors(errors, {
  issueClient: new MyIssueClient(),
  database: new MyDatabase(),
  compareError,
  projectId: 'MyApplication',
}).then((trackedErrors) => console.log(trackedErrors))
// should return
// - "Error when create the checkout" (occurrences : 2)
// - "Null Pointer Exception on payment page" (occurrences : 2)
// - "cannot call login on undefined" (occurences : 1)
