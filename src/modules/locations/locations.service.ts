import {
  BadGatewayException,
  BadRequestException,
  GatewayTimeoutException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import envConfig from '@src/config/env.config'
import type { TAutocompleteQuery, TPlaceDetailQuery, TReverseGeocodeQuery } from './model/locations.model'
import { provinces2025, wards2025 } from './data/administrative-data-2025'

interface GoongPrediction {
  description?: string
  place_id?: string
  structured_formatting?: { main_text?: string; secondary_text?: string }
  compound?: { commune?: string; district?: string; province?: string }
}

interface GoongPlaceResult {
  place_id?: string
  formatted_address?: string
  name?: string
  geometry?: { location?: { lat?: number; lng?: number } }
  compound?: { commune?: string; district?: string; province?: string }
}

interface CacheEntry {
  expiresAt: number
  value: unknown
}

@Injectable()
export class LocationsService {
  private readonly cache = new Map<string, CacheEntry>()
  private readonly timeoutMs = 5_000
  private readonly cacheTtlMs = 5 * 60_000

  async listProvinces() {
    return provinces2025.map((province) => ({
      code: province.code,
      name: province.name,
      type: province.type,
    }))
  }

  async listWards(provinceCode: string) {
    if (!provinces2025.some((province) => province.code === provinceCode)) {
      throw new NotFoundException('Mã tỉnh/thành không hợp lệ')
    }
    return wards2025.filter((ward) => ward.province_code === provinceCode).map((ward) => ({
      code: ward.code,
      name: ward.name,
      type: ward.type,
      provinceCode: ward.province_code,
    }))
  }

  async autocomplete(query: TAutocompleteQuery) {
    const scope = await this.getAdministrativeScope(query.provinceCode, query.wardCode)
    const searchInput = `${query.input}, ${scope.ward.type} ${scope.ward.name}, ${scope.province.type} ${scope.province.name}`
    const payload = await this.goongRequest('/Place/AutoComplete', {
      input: searchInput,
      sessiontoken: query.sessionToken,
      more_compound: 'true',
      limit: '8',
    })
    const predictions = this.asRecord(payload).predictions
    if (!Array.isArray(predictions)) throw new BadGatewayException('Goong trả về dữ liệu không hợp lệ')

    return predictions
      .filter((item): item is GoongPrediction => Boolean(item && typeof item === 'object'))
      .map((prediction) => ({
        placeId: prediction.place_id,
        description: prediction.description,
        mainText: prediction.structured_formatting?.main_text,
        secondaryText: prediction.structured_formatting?.secondary_text,
        compound: prediction.compound,
      }))
      .filter((prediction) => Boolean(prediction.placeId && prediction.description))
  }

  async placeDetail(query: TPlaceDetailQuery) {
    const payload = await this.goongRequest('/Place/Detail', {
      place_id: query.placeId,
      sessiontoken: query.sessionToken,
    })
    const result = this.asRecord(payload).result
    if (!result || typeof result !== 'object') throw new NotFoundException('Không tìm thấy địa điểm')
    const normalized = this.normalizePlace(result as GoongPlaceResult)

    if (query.provinceCode && query.wardCode) {
      const scope = await this.getAdministrativeScope(query.provinceCode, query.wardCode)
      this.assertPlaceMatchesScope(normalized.formattedAddress, scope)
    }
    return normalized
  }

  async reverseGeocode(query: TReverseGeocodeQuery) {
    const payload = await this.goongRequest('/Geocode', {
      latlng: `${query.latitude},${query.longitude}`,
    })
    const results = this.asRecord(payload).results
    if (!Array.isArray(results) || results.length === 0) throw new NotFoundException('Không tìm thấy địa chỉ tại tọa độ này')
    return this.normalizePlace(results[0] as GoongPlaceResult)
  }

  async resolvePropertyLocation(input: {
    provinceCode: string
    wardCode: string
    placeId: string
    sessionToken?: string
  }) {
    const scope = await this.getAdministrativeScope(input.provinceCode, input.wardCode)
    const detail = await this.placeDetail({
      placeId: input.placeId,
      sessionToken: input.sessionToken ?? `property-${crypto.randomUUID()}`,
      provinceCode: input.provinceCode,
      wardCode: input.wardCode,
    })
    return {
      provinceCode: scope.province.code,
      province: `${scope.province.type} ${scope.province.name}`,
      district: null,
      wardCode: scope.ward.code,
      ward: `${scope.ward.type} ${scope.ward.name}`,
      addressDetail: detail.formattedAddress,
      latitude: detail.latitude,
      longitude: detail.longitude,
    }
  }

  private async getAdministrativeScope(provinceCode: string, wardCode: string) {
    const province = provinces2025.find((item) => item.code === provinceCode)
    const ward = wards2025.find((item) => item.code === wardCode)
    if (!province) throw new BadRequestException('Mã tỉnh/thành không hợp lệ')
    if (!ward || ward.province_code !== provinceCode) {
      throw new BadRequestException('Mã xã/phường không thuộc tỉnh/thành đã chọn')
    }
    return { province, ward }
  }

  private assertPlaceMatchesScope(
    formattedAddress: string,
    scope: Awaited<ReturnType<LocationsService['getAdministrativeScope']>>,
  ) {
    const normalizedAddress = this.normalizeVietnamese(formattedAddress)
    const provinceName = this.normalizeVietnamese(scope.province.name)
    const wardName = this.normalizeVietnamese(scope.ward.name)
    if (!normalizedAddress.includes(provinceName) || !normalizedAddress.includes(wardName)) {
      throw new BadRequestException('Địa điểm không khớp tỉnh/thành và xã/phường đã chọn')
    }
  }

  private normalizePlace(result: GoongPlaceResult) {
    const latitude = Number(result.geometry?.location?.lat)
    const longitude = Number(result.geometry?.location?.lng)
    const formattedAddress = result.formatted_address?.trim()
    if (!formattedAddress || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new BadGatewayException('Goong trả về dữ liệu địa điểm không hợp lệ')
    }
    return {
      placeId: result.place_id ?? null,
      formattedAddress,
      name: result.name ?? null,
      latitude,
      longitude,
      compound: result.compound ?? null,
    }
  }

  private async goongRequest(path: string, params: Record<string, string>) {
    const cacheKey = `${path}?${new URLSearchParams(params).toString()}`
    const cached = this.cache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) return cached.value

    const url = new URL(path, envConfig.GOONG_BASE_URL.endsWith('/') ? envConfig.GOONG_BASE_URL : `${envConfig.GOONG_BASE_URL}/`)
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
    url.searchParams.set('api_key', envConfig.GOONG_MAPS_API_KEY)

    let response: Response
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(this.timeoutMs), headers: { accept: 'application/json' } })
    } catch (error) {
      const errorName = error && typeof error === 'object' && 'name' in error ? String(error.name) : ''
      if (['AbortError', 'TimeoutError'].includes(errorName)) {
        throw new GatewayTimeoutException('Goong không phản hồi trong thời gian cho phép')
      }
      throw new BadGatewayException('Không thể kết nối dịch vụ bản đồ')
    }
    if (!response.ok) throw new BadGatewayException(`Dịch vụ bản đồ tạm thời không khả dụng (${response.status})`)

    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      throw new BadGatewayException('Goong trả về dữ liệu không hợp lệ')
    }
    this.cache.set(cacheKey, { value: payload, expiresAt: Date.now() + this.cacheTtlMs })
    return payload
  }

  private asRecord(value: unknown): Record<string, any> {
    if (!value || typeof value !== 'object') throw new BadGatewayException('Goong trả về dữ liệu không hợp lệ')
    return value as Record<string, any>
  }

  private normalizeVietnamese(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLocaleLowerCase('vi')
  }
}
