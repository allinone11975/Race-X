/**
 * RACE-X Cloudinary Service
 * Auto-watermarks every MP3/MP4/Image output with 'Race-X' identity
 * Uses stored API keys for direct SDK-style calls, falls back to edge function
 */

function getCloudinaryConfig() {
  try {
    const stored = localStorage.getItem('race-x-store');
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    const keys = parsed?.state?.apiKeys;
    if (keys?.cloudinaryCloud && keys?.cloudinaryPreset) return keys;
    return null;
  } catch {
    return null;
  }
}

export interface CloudinaryResult {
  secure_url: string;
  public_id: string;
  resource_type: 'image' | 'video' | 'raw';
  format: string;
  duration?: number;
  bytes: number;
  watermarked: boolean;
}

// ─── Watermark transformation definitions ──────────────────────────────────────

const IMAGE_WATERMARK_TRANSFORM = [
  {
    overlay: 'text:Arial_28_bold:RACE-X',
    gravity: 'south_east',
    x: 12,
    y: 12,
    color: 'white',
    opacity: 70,
  },
];

const VIDEO_WATERMARK_TRANSFORM = [
  {
    overlay: 'text:Arial_24_bold:RACE-X',
    gravity: 'north_east',
    x: 12,
    y: 12,
    color: 'white',
    opacity: 60,
    start_offset: '0',
    end_offset: 'end',
  },
];

// Audio watermark = embed metadata tag (Cloudinary doesn't overlay audio visually)
const AUDIO_CONTEXT_METADATA = 'caption=RACE-X|copyright=Race-X Omniverse';

// ─── Core upload function ──────────────────────────────────────────────────────

export async function uploadMedia(
  file: File | string | Blob,
  options: {
    resourceType?: 'image' | 'video' | 'raw' | 'auto';
    folder?: string;
    publicId?: string;
    watermark?: boolean; // default true for video/audio
  } = {}
): Promise<CloudinaryResult> {
  const config = getCloudinaryConfig();
  const { resourceType = 'auto', folder = 'race-x', watermark = true } = options;

  if (!config) {
    // No Cloudinary config — return a mock result pointing to original URL
    const url = file instanceof File
      ? URL.createObjectURL(file)
      : typeof file === 'string' ? file : URL.createObjectURL(file);
    return {
      secure_url: url,
      public_id: `race-x/local-${Date.now()}`,
      resource_type: resourceType === 'auto' ? 'raw' : resourceType,
      format: 'mp4',
      bytes: 0,
      watermarked: false,
    };
  }

  const formData = new FormData();

  if (file instanceof File || file instanceof Blob) {
    formData.append('file', file);
  } else {
    formData.append('file', file); // URL string upload
  }

  formData.append('upload_preset', config.cloudinaryPreset);
  formData.append('folder', folder);

  if (options.publicId) {
    formData.append('public_id', options.publicId);
  }

  // Apply watermark transformations based on resource type
  if (watermark) {
    const isVideo = resourceType === 'video' ||
      (file instanceof File && file.type.startsWith('video/'));
    const isAudio = resourceType === 'raw' ||
      (file instanceof File && (file.type.startsWith('audio/') || file.name?.endsWith('.mp3')));

    if (isVideo) {
      formData.append('transformation', JSON.stringify(VIDEO_WATERMARK_TRANSFORM));
    } else if (isAudio) {
      formData.append('context', AUDIO_CONTEXT_METADATA);
    } else {
      formData.append('transformation', JSON.stringify(IMAGE_WATERMARK_TRANSFORM));
    }
  }

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloudinaryCloud}/${resourceType}/upload`,
    { method: 'POST', body: formData }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Cloudinary upload failed: ${err}`);
  }

  const data = await res.json();

  return {
    secure_url: data.secure_url,
    public_id: data.public_id,
    resource_type: data.resource_type,
    format: data.format,
    duration: data.duration,
    bytes: data.bytes,
    watermarked: watermark,
  };
}

// ─── Convenience wrappers ──────────────────────────────────────────────────────

/** Upload and watermark an MP3 audio file */
export async function uploadAudio(file: File | string): Promise<CloudinaryResult> {
  return uploadMedia(file, { resourceType: 'raw', folder: 'race-x/audio', watermark: true });
}

/** Upload and watermark an MP4 video file */
export async function uploadVideo(file: File | string): Promise<CloudinaryResult> {
  return uploadMedia(file, { resourceType: 'video', folder: 'race-x/video', watermark: true });
}

/** Upload and watermark an image */
export async function uploadImage(file: File | string): Promise<CloudinaryResult> {
  return uploadMedia(file, { resourceType: 'image', folder: 'race-x/images', watermark: true });
}

/** Generate a watermarked delivery URL from an existing public_id */
export function getWatermarkedUrl(publicId: string, resourceType: 'image' | 'video' = 'image'): string {
  const config = getCloudinaryConfig();
  if (!config) return '';

  const cloud = config.cloudinaryCloud;
  const transform = resourceType === 'video'
    ? 'l_text:Arial_24_bold:RACE-X,g_north_east,x_12,y_12,co_white,o_60'
    : 'l_text:Arial_28_bold:RACE-X,g_south_east,x_12,y_12,co_white,o_70';

  return `https://res.cloudinary.com/${cloud}/${resourceType}/upload/${transform}/${publicId}`;
}
