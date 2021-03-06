const simpleOauth2 = require('simple-oauth2')
const OAuth2Client = require('../client')

const mockClient = {
  accessToken: {
    create: jest.fn(() => ({ token: { access_token: 'foo' } }))
  },
  authorizationCode: {
    authorizeURL: jest.fn(),
    getToken: jest.fn()
  }
}

jest.mock('simple-oauth2', () => ({
  create: jest.fn(() => mockClient)
}))

const getClient = () => new OAuth2Client(
  'mock-provider',
  'mock-credentials',
  'mock-redirect',
  'mock-scope'
)

describe('OAuth2Client', () => {
  it('calls create with the credentials', () => {
    getClient()
    expect(simpleOauth2.create).toHaveBeenCalledWith('mock-credentials')
  })

  describe('authorizeURL()', () => {
    it('calls authorizationCode.authorizeURL with the correct parameters', () => {
      const client = getClient()
      client.authorizeUrl('foobar')
      expect(mockClient.authorizationCode.authorizeURL).toHaveBeenCalledWith({
        redirect_uri: 'mock-redirect',
        scope: 'mock-scope',
        state: client._hashSessionId('foobar')
      })
    })
  })

  describe('accessToken()', () => {
    let client = null

    beforeEach(() => {
      client = getClient()
      mockClient.authorizationCode.getToken.mockClear()
    })

    it('returns error if state tokens do not match', () => {
      const call = client.accessToken('bar', { state: 'foo' })
      return expect(call).resolves.toHaveProperty('content.message', 'CSRF detected')
    })

    it('returns errors passed down from the API', () => {
      const call = client.accessToken('bar', {
        error: 'foo',
        error_description: 'bar',
        state: client._hashSessionId('bar')
      })
      return expect(call).resolves.toHaveProperty('content.message', 'bar')
    })

    it('calls authorizationCode with the correct paramters', () => {
      client.accessToken('bar', { code: 'baz', state: client._hashSessionId('bar') })

      expect(mockClient.authorizationCode.getToken).toHaveBeenCalledWith({
        redirect_uri: 'mock-redirect',
        code: 'baz'
      })
    })
  })

  describe('_constructSuccessResponse()', () => {
    it('constructs a success response', () => {
      const client = getClient()
      expect(client._constructSuccessResponse('res')).toEqual({
        message: 'success',
        content: {
          token: 'foo',
          provider: 'mock-provider'
        }
      })
    })
  })

  describe('_constructErrorResponse()', () => {
    let client = null

    beforeEach(() => {
      client = getClient()
    })

    it('formats string errors', () => {
      expect(client._constructErrorResponse('foo')).toEqual({
        message: 'error',
        content: { message: 'foo' }
      })
    })

    it('formats error objects', () => {
      expect(client._constructErrorResponse({ message: 'foo' })).toEqual({
        message: 'error',
        content: { message: 'foo' }
      })
    })
  })

  describe('_hashSessionId', () => {
    it('formats strings as md5', () => {
      const client = getClient()
      expect(client._hashSessionId('foobar')).toEqual('3858f62230ac3c915f300c664312c63f')
    })
  })

  describe('getProvider()', () => {
    it('returns the instance provider', () => {
      const client = getClient()
      expect(client.getProvider()).toEqual('mock-provider')
    })
  })
})
