import { Error, GroupedError } from '.'

export function trackErrors(errors: Error[]): Promise<GroupedError[]> {
  throw new Error('Not implemented')
}
