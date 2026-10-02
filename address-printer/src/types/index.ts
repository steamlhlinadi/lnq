export interface AddressEntry {
  name: string
  phone: string
  from: string
  address: string[]
  groqEnhanced: boolean
  stripName?: string
  stripFrom?: string
}

export interface PrintSizes {
  addr: number
  stripLabel: number
  stripName: number
  stripWidthCm: number
  stripHeightCm: number
}
