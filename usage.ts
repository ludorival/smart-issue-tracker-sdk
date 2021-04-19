import { trackIssues, IssueClient, Comparator, Issue } from './src'

// --- your occurence type
interface Occurrence {
  timestamp: number
  message: string
}
// --- your issue type
interface MyIssueType extends Issue<Occurrence> {
  title: string
  body: string
  comments: string[]
  newOccurrences: Occurrence[]
}
// --- your issue client
class MyIssueClient implements IssueClient<MyIssueType, Occurrence> {
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

  async fetchIssues() {
    return this.store
  }
}

// Your custom comparator
const compareOccurrence: Comparator<Occurrence> = (a, b) =>
  a.message.localeCompare(b.message)
// use it
const errors: Occurrence[] = [
  { message: 'Error when create the checkout', timestamp: 1 },

  { message: 'Error When Create The Checkout', timestamp: 2 },

  { message: 'Null Pointer Exception on payment page', timestamp: 3 },

  { message: 'cannot call login on undefined', timestamp: 4 },

  { message: 'Null Pointer Exception on payment page', timestamp: 5 },
]

trackIssues(errors, {
  issueClient: new MyIssueClient(),
  hooks: {
    getIdentifier: (occurrence) => occurrence.timestamp, //to avoid adding the same occurrence
    compareOccurrence,
  },
}).then((trackedErrors) => console.log(trackedErrors))
// should return
// - "Error when create the checkout" (occurrences : 2)
// - "Null Pointer Exception on payment page" (occurrences : 2)
// - "cannot call login on undefined" (occurences : 1)
