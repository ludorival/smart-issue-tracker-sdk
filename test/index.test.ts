import { Error, TrackErrorOptions, trackErrors } from '../src/index'

const initOptions = (): TrackErrorOptions => ({
  database: {
    save: jest.fn(),
    fetch: jest.fn(),
  },
  issueClient: {
    createIssue: jest.fn(),
    updateIssue: jest.fn(),
  },
})
describe('Track Errors', () => {
  test('should track a new error', async () => {
    // given
    const errors: Error[] = [
      { message: 'A new error', timestamp: new Date().toTimeString() },
    ]
    const options = initOptions()
    // when
    const groupedErrors = await trackErrors(errors, options)
    // then
    expect(groupedErrors).toMatchSnapshot()
  })
})
