import { ListNotificationsQuerySchema } from '@src/modules/notifications/model/notifications.model'
import { CreateTicketCommentBodySchema } from '@src/modules/tickets/model/tickets.model'
import { BooleanInputCodec } from './boolean-codec.util'

describe('BooleanInputCodec', () => {
  it.each([
    [true, true],
    [false, false],
    ['true', true],
    ['false', false],
  ])('parses %p as %p', (input, expected) => {
    expect(BooleanInputCodec.parse(input)).toBe(expected)
  })

  it('does not coerce arbitrary truthy values', () => {
    expect(() => BooleanInputCodec.parse('1')).toThrow()
    expect(() => BooleanInputCodec.parse(1)).toThrow()
  })

  it('keeps query/body string false as false', () => {
    expect(ListNotificationsQuerySchema.parse({ isRead: 'false' }).isRead).toBe(false)
    expect(CreateTicketCommentBodySchema.parse({ message: 'Public', isInternal: 'false' }).isInternal).toBe(false)
  })
})
