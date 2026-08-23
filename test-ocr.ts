import fs from 'fs';
import { TesseractOcrProvider } from './src/modules/ocr/providers/tesseract-ocr.provider';

async function main() {
  const provider = new TesseractOcrProvider();

  // Override loadImage để đọc file local thay vì fetch https
  (provider as any).loadImage = async (imageUrl: string) => {
    return fs.readFileSync(imageUrl);
  };

  const imagePath = 'd:\\Works\\chuyen-de-2\\docs\\CT\\2.png';
  console.log('Đang xử lý ảnh:', imagePath);

  // Hook into prepareImage to save intermediate result
  const originalPrepareImage = (provider as any).prepareImage.bind(provider);
  (provider as any).prepareImage = async (image: Buffer) => {
    const prepared = await originalPrepareImage(image);
    fs.writeFileSync('d:\\Works\\chuyen-de-2\\backend\\prepared-test.png', prepared);
    console.log('Đã lưu ảnh sau tiền xử lý tại: d:\\Works\\chuyen-de-2\\backend\\prepared-test.png');
    return prepared;
  };

  try {
    const result = await (provider as any).run(imagePath);
    console.log('\n--- KẾT QUẢ OCR ---');
    console.log(JSON.stringify(result, null, 2));
    console.log('-------------------\n');
  } catch (error) {
    console.error('Lỗi khi OCR:', error);
  } finally {
    await provider.onModuleDestroy();
  }
}

main();
