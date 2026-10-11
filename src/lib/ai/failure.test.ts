import { describe, it, expect } from 'vitest'
import { AiGatewayError } from './gateway'
import { outcomeOfFailure } from './failure'

const gateway = (status: number, code?: string) => new AiGatewayError('message', status, { code })

describe('outcomeOfFailure', () => {
  it.each([
    ['the kill switch', gateway(503, 'ai_disabled')],
    ['a provider error', gateway(502, 'ai_unavailable')],
    ['a prompt that is too large', gateway(413, 'prompt_too_large')],
    ['a request the gateway refused', gateway(400, 'invalid_request')],
    ['a gateway that cannot be reached', gateway(502)],
  ])('does not count %s: nothing was billed', (_name, error) => {
    expect(outcomeOfFailure(error)).toEqual({ status: 'released' })
  })

  it('counts a timeout, as one the provider may have billed', () => {
    expect(outcomeOfFailure(gateway(504, 'ai_timeout'))).toEqual({ status: 'failed', timedOut: true })
    expect(outcomeOfFailure(gateway(504))).toEqual({ status: 'failed', timedOut: true })
  })

  it('counts an answer the gateway could not use: the AI was asked and billed', () => {
    expect(outcomeOfFailure(gateway(502, 'invalid_answer'))).toEqual({ status: 'failed', timedOut: false })
  })

  it('counts an error of our own after the AI answered', () => {
    expect(outcomeOfFailure(new Error('could not read the answer'))).toEqual({ status: 'failed', timedOut: false })
  })
})
