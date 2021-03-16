import React, { useState } from 'react'
import logo from './logo.svg'
import { trackErrors, TrackErrorOptions } from 'error-issue-tracker-sdk'
import './App.css'
import ErrorFirestore from './firebase'
import GithubIssueClient from './github'
const projectId = 'ludorival/demo-error-issue-tracker'
const errorIssueTrackerSetting: TrackErrorOptions = {
  database: new ErrorFirestore(),
  issueClient: new GithubIssueClient(),
  projectId,
}

function App() {
  const [value, setValue] = useState('')
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <label htmlFor="message">Push an error message</label>
        <input
          name="message"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button
          name="push-message"
          onClick={() => {
            trackErrors(
              [
                {
                  message: value,
                  timestamp: new Date().getTime(),
                },
              ],
              errorIssueTrackerSetting
            ).then(alert)
          }}
        >
          Push
        </button>
      </header>
    </div>
  )
}

export default App
