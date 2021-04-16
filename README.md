<h1 align="center">Welcome to smart-issue-tracker-sdk 👋</h1>
<p>
  <img alt="Version" src="https://img.shields.io/badge/version-0.0.1-blue.svg?cacheSeconds=2592000" />
  <a href="https://github.com/ludorival/smart-issue-tracker-sdk#readme" target="_blank">
    <img alt="Documentation" src="https://img.shields.io/badge/documentation-yes-brightgreen.svg" />
  </a>
  <a href="https://github.com/ludorival/smart-issue-tracker-sdk/graphs/commit-activity" target="_blank">
    <img alt="Maintenance" src="https://img.shields.io/badge/Maintained%3F-yes-green.svg" />
  </a>
  <a href="https://github.com/ludorival/smart-issue-tracker-sdk/blob/master/LICENSE" target="_blank">
    <img alt="License: BSD--3--Clause" src="https://img.shields.io/github/license/ludorival/smart-issue-tracker-sdk" />
  </a>
</p>

> A simple, flexible, light sdk to track any kind of occurrences and create automatic issue if found new.

## Demo

Take a look to the demo 👉👉 [HERE](https://ludorival.github.io/demo-smart-issue-tracker-sdk/) 👈👈

There are many ways to use this sdk:

- Use it as a webhook for your data collection in order to create issue for new alerts. For example, from ElasticSearch alert action.
- Use it to search similar issues from a text input
- etc.

## Install

```sh
yarn add -D smart-issue-tracker-sdk
```

## Usage

```js
import { trackIssues } from 'smart-issue-tracker-sdk'
// --- your issue client
class MyIssueClient {
  constructor() {
    this.store = []
  }
  async createIssue(issue) {
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
  async updateIssue(error) {
    // here you can update the issue for example add a new comment for new occurences
    const comments = [
      ...error.comments,
      `Found new ${error.newOccurrences.length} occurences of ${error.title}`,
    ]
    return { ...error, comments }
  }
  async fetchIssues(options) {
    return this.store
  }
}
// Your custom comparator
const compareIssue = (a, b) =>
  a.occurrences[0].message
    .toLowerCase()
    .localeCompare(b.occurrences[0].message.toLowerCase())
// use it
const errors = [
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
```

## Usage in Typescript

Take a look to the [typescript version](usage.ts)

## Author

👤 **Ludovic Dorival**

- Github: [@ludorival](https://github.com/ludorival)

## Show your support

Give a ⭐️ if this project helped you!

## 📝 License

Copyright © 2021 [Ludovic Dorival](https://github.com/ludorival).<br />
This project is [BSD--3--Clause](https://github.com/ludorival/smart-issue-tracker-sdk/blob/master/LICENSE) licensed.

## Contributing

We welcome community contributions and pull requests. See [CONTRIBUTING.md](CONTRIBUTIONS.md) for information on how to set up a development environment and submit code.

_This README was generated with ❤️ by [readme-md-generator](https://github.com/kefranabg/readme-md-generator)_
