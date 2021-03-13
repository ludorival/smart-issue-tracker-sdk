import { Error, trackErrors } from '../src/index'

describe('Track Errors', () => {
  test.skip('should track a new error', async () => {
    // given
    const errors: Error[] = [
      { message: 'A new error', timestamp: new Date().toTimeString() },
    ]
    // when
    const groupedErrors = await trackErrors(errors)
    // then
    expect(groupedErrors).toMatchSnapshot()
  })
})
