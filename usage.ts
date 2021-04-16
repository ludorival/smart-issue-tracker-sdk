import {
  trackIssues,
  IssueClient,
  Comparator,
  Issue,
  Occurrence,
  FetchOption,
} from './src'

// --- your occurence type
interface OccurrenceType extends Occurrence {
  message: string
}
// --- your issue type
interface MyIssueType extends Issue<OccurrenceType> {
  title: string
  body: string
  comments: string[]
  newOccurrences: OccurrenceType[]
}
// --- your issue client
class MyIssueClient implements IssueClient<MyIssueType> {
  store: Required<MyIssueType>[] = []
  async createIssue(issue: MyIssueType) {
    // here you can create the issue related to an untracked error
    const savedIssue = {
      ...issue,
      id: this.store.length.toString(),
      url: 'http://issue-client/newIdIssue',
      body: `Found ${issue.newOccurrences.length} occurences of "${issue.title}"`,
    }
    this.store.push(savedIssue)
    return this.store[this.store.length - 1]
  }
  async updateIssue(error: MyIssueType) {
    // here you can update the issue for example add a new comment for new occurences
    const comments = [
      ...error.comments,
      `Found new ${error.newOccurrences.length} occurences of ${error.title}`,
    ]
    return { ...error, comments } as Required<MyIssueType>
  }

  async fetchIssues(options: FetchOption) {
    return this.store
  }
}

// Your custom comparator
const compareIssue: Comparator<MyIssueType> = (a, b) =>
  a.occurrences[0].message
    .toLowerCase()
    .localeCompare(b.occurrences[0].message.toLowerCase())
// use it
const errors: OccurrenceType[] = [
  { message: 'Error when create the checkout', timestamp: 1 },

  { message: 'Error When Create The Checkout', timestamp: 2 },

  { message: 'Null Pointer Exception on payment page', timestamp: 3 },

  { message: 'cannot call login on undefined', timestamp: 4 },

  { message: 'Null Pointer Exception on payment page', timestamp: 5 },
]
trackIssues(errors, {
  issueClient: new MyIssueClient(),
  hooks: {
    compareIssue,
  },
  fetchOption: {},
}).then((trackedErrors) => console.log(trackedErrors))
// should return
// - "Error when create the checkout" (occurrences : 2)
// - "Null Pointer Exception on payment page" (occurrences : 2)
// - "cannot call login on undefined" (occurences : 1)
