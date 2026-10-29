/**
 * Utility for handling device image uploads (Mobile Camera, Gallery, Desktop Files)
 * with client-side compression, cropping/aspect fitting, and server persistence.
 */

export interface ProcessImageOptions {
  maxDimension?: number;
  quality?: number;
  squareCrop?: boolean;
}

/**
 * Reads a File from the device, resizes it using an offscreen canvas,
 * and returns a compressed base64 JPEG data URL.
 */
export async function processDeviceImage(
  file: File,
  options: ProcessImageOptions = {}
): Promise<string> {
  const { maxDimension = 512, quality = 0.85, squareCrop = true } = options;

  if (!file.type.startsWith('image/')) {
    throw new Error('Dosiyeli watoranije si ifoto yemewe (Please choose a valid image file).');
  }

  // Read file into image element
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Kunanirwa gusoma ifoto yawe (Failed to read selected image).'));
    reader.readAsDataURL(file);
  });

  return new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        let { width, height } = img;
        let sourceX = 0;
        let sourceY = 0;
        let sourceWidth = width;
        let sourceHeight = height;

        if (squareCrop) {
          // Crop to centered square for optimal avatar appearance
          const minDim = Math.min(width, height);
          sourceX = (width - minDim) / 2;
          sourceY = (height - minDim) / 2;
          sourceWidth = minDim;
          sourceHeight = minDim;
          width = Math.min(minDim, maxDimension);
          height = width;
        } else {
          // Proportional scaling
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback to original dataUrl if canvas context is unavailable
          return resolve(dataUrl);
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(
          img,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          0,
          0,
          width,
          height
        );

        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      } catch (err) {
        // Fallback to dataUrl on unexpected canvas error
        resolve(dataUrl);
      }
    };
    img.onerror = () => reject(new Error('Kunanirwa gutunganya ifoto (Failed to process image).'));
    img.src = dataUrl;
  });
}

/**
 * Uploads a processed avatar to the server /api/upload/avatar endpoint.
 * Falls back gracefully to the compressed base64 dataUrl if offline.
 */
export async function uploadAvatar(
  file: File
): Promise<{ url: string; error?: string }> {
  try {
    const compressedBase64 = await processDeviceImage(file, {
      maxDimension: 512,
      quality: 0.85,
      squareCrop: true,
    });

    const res = await fetch('/api/upload/avatar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base64Data: compressedBase64,
        fileName: file.name || 'avatar.jpg',
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.url) {
        return { url: data.url };
      }
    }

    // If server upload failed, fallback to compressed base64 which works in any <img> tag
    return { url: compressedBase64 };
  } catch (err: any) {
    console.warn('Avatar upload fallback to local dataUrl:', err);
    try {
      const fallbackUrl = await processDeviceImage(file);
      return { url: fallbackUrl };
    } catch (e: any) {
      return { url: '', error: e.message || 'Kunanirwa gushyiraho ifoto.' };
    }
  }
}
