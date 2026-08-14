import { BadGatewayException, BadRequestException, GatewayTimeoutException, NotFoundException } from '@nestjs/common'
import envConfig from '@src/config/env.config'
import { provinces2025, wards2025 } from './data/administrative-data-2025'
import { LocationsService } from './locations.service'

describe('LocationsService Goong proxy', () => {
  let service: LocationsService
  let fetchMock: jest.Mock

  beforeEach(() => {
    service = new LocationsService()
    fetchMock = jest.fn()
    global.fetch = fetchMock
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('normalizes a valid place detail response', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          result: {
            place_id: 'place-1',
            formatted_address: '1 Phan Đình Phùng, Phường Ba Đình, Thành phố Hà Nội',
            geometry: { location: { lat: 21.04, lng: 105.84 } },
          },
        }),
        { status: 200 },
      ),
    )

    await expect(service.placeDetail({ placeId: 'place-1', sessionToken: 'session-token' })).resolves.toEqual(
      expect.objectContaining({ placeId: 'place-1', latitude: 21.04, longitude: 105.84 }),
    )
  })

  it('ships the official 34-province and 3,321-ward snapshot', async () => {
    await expect(service.listProvinces()).resolves.toHaveLength(34)
    expect(provinces2025).toHaveLength(34)
    expect(wards2025).toHaveLength(3321)
  })

  it('rejects a ward code that does not belong to the selected province before calling Goong', async () => {
    await expect(
      service.autocomplete({
        input: '1 Trần Phú',
        sessionToken: 'session-token',
        provinceCode: '01',
        wardCode: '03127',
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects a Goong place outside the selected province and ward', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          result: {
            place_id: 'place-hcm',
            formatted_address: '1 Lê Lợi, Phường Bến Thành, Thành phố Hồ Chí Minh',
            geometry: { location: { lat: 10.77, lng: 106.7 } },
          },
        }),
        { status: 200 },
      ),
    )

    await expect(
      service.placeDetail({
        placeId: 'place-hcm',
        sessionToken: 'session-token',
        provinceCode: '01',
        wardCode: '00004',
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('returns not found for a zero-result place response', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ status: 'ZERO_RESULTS' }), { status: 200 }))
    await expect(service.placeDetail({ placeId: 'missing', sessionToken: 'session-token' })).rejects.toBeInstanceOf(
      NotFoundException,
    )
  })

  it('maps upstream timeout to 504', async () => {
    fetchMock.mockRejectedValue(new DOMException('timed out', 'TimeoutError'))
    await expect(service.reverseGeocode({ latitude: 10, longitude: 106 })).rejects.toBeInstanceOf(
      GatewayTimeoutException,
    )
  })

  it('maps upstream 5xx to a safe gateway error without leaking the REST key', async () => {
    fetchMock.mockResolvedValue(new Response('upstream error', { status: 503 }))
    const promise = service.reverseGeocode({ latitude: 10, longitude: 106 })
    await expect(promise).rejects.toBeInstanceOf(BadGatewayException)
    await expect(promise).rejects.not.toThrow(envConfig.GOONG_MAPS_API_KEY)
  })

  it('rejects malformed upstream schemas', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ results: [{ formatted_address: 'Hà Nội' }] }), { status: 200 }))
    await expect(service.reverseGeocode({ latitude: 10, longitude: 106 })).rejects.toBeInstanceOf(
      BadGatewayException,
    )
  })
})
