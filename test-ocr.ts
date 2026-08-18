import { ImageAnnotatorClient } from '@google-cloud/vision'

async function run() {
  const client = new ImageAnnotatorClient()
  const [response] = await client.documentTextDetection({ image: { source: { filename: 'd:/Works/chuyen-de-2/docs/CT/2.png' } } })
  console.log(JSON.stringify(response.fullTextAnnotation, null, 2))
}

run().catch(console.error)
