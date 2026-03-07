import { Injectable, Logger } from '@nestjs/common';
import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiErrorResponse,
} from 'cloudinary';
import { Readable } from 'stream';
import { CLOUDINARY_ROOT_FOLDER } from './cloudinary.config';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  uploadImage(
    file: Express.Multer.File,
    subFolder: string,
  ): Promise<{ url: string; publicId: string }> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `${CLOUDINARY_ROOT_FOLDER}/${subFolder}`,
          resource_type: 'image',
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        },
        (error?: UploadApiErrorResponse, result?: UploadApiResponse) => {
          if (error) return reject(error);

          if (!result) {
            return reject(
              new Error('Cloudinary upload failed: no result returned'),
            );
          }

          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        },
      );

      Readable.from(file.buffer).pipe(uploadStream);
    });
  }

  async deleteImage(publicId?: string): Promise<void> {
    if (!publicId) return; // ✅ safe guard

    try {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: 'image',
      });
    } catch (error) {
      // ✅ LOG — DO NOT THROW
      this.logger.error(
        `Cloudinary delete failed for publicId=${publicId}`,
        error,
      );
    }
  }
}
