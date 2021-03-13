'use strict'

export * from './trackErrors'

export type Error = {
  message: string
  timestamp: string
  [key: string]: string
}

export type Issue = {
  id: string
  url: string
  [key: string]: any
}
export interface GroupedError {
  id?: string
  name: string
  firstOccurrenceTimeStamp: string
  lastOccurrenceTimeStamp: string
  issue?: Issue
  occurrences: Error[]
}
