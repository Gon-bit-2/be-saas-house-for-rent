import { ImageAnnotatorClient } from '@google-cloud/vision'
import { GoogleVisionOcrProvider } from './google-vision-ocr.provider'

jest.mock('@google-cloud/vision', () => ({
  ImageAnnotatorClient: jest.fn().mockImplementation(() => ({ documentTextDetection: jest.fn() })),
}))

describe('GoogleVisionOcrProvider', () => {
  it('extracts, normalizes, deduplicates, and sorts numeric words', async () => {
    const provider = new GoogleVisionOcrProvider()
    const client = (ImageAnnotatorClient as unknown as jest.Mock).mock.results[0].value as {
      documentTextDetection: jest.Mock
    }
    client.documentTextDetection.mockResolvedValue([
      {
        fullTextAnnotation: {
          text: '00123,4 ABC 56',
          pages: [
            {
              blocks: [
                {
                  paragraphs: [
                    {
                      words: [
                        { confidence: 0.9, symbols: [...'00123,4'].map((text) => ({ text })) },
                        { confidence: 0.99, symbols: [...'ABC'].map((text) => ({ text })) },
                        { confidence: 0.8, symbols: [...'56'].map((text) => ({ text })) },
                        { confidence: 0.7, symbols: [...'56'].map((text) => ({ text })) },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    ])
    await expect(provider.recognize('https://example.com/meter.jpg')).resolves.toEqual({
      text: '00123,4 ABC 56',
      candidates: [
        { text: '00123,4', value: '00123.4', confidence: 0.9 },
        { text: '56', value: '56', confidence: 0.8 },
      ],
    })
  })
})
