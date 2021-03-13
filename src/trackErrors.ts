import { Error, GroupedError, TrackErrorOptions } from '.'

export function trackErrors(
  errors: Error[],
  options: TrackErrorOptions
): Promise<GroupedError[]> {
  throw new Error('Not implemented')
}
