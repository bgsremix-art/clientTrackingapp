import { doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// We are keeping the function name the same so we don't have to rewrite the other screens!
export const uploadImageToFirebase = async (uri: string, userId: string, folder: string): Promise<string> => {
  try {
    // 1. We create a raw FormData stream (Expo Go handles this perfectly)
    const data = new FormData();
    data.append('file', {
      uri: uri,
      type: 'image/jpeg',
      name: `photo_${Date.now()}.jpg`
    } as any);

    // 2. Add your Cloudinary settings here
    const cloudName = 'dscmzagzy'; // <--- REPLACE THIS
    const uploadPreset = 'wpbqkye1'; // <--- REPLACE THIS

    data.append('upload_preset', uploadPreset);
    data.append('cloud_name', cloudName);
    data.append('folder', `client_tracking/${userId}/${folder}`);

    // 3. Upload directly to Cloudinary
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: data,
      headers: {
        'Accept': 'application/json',
      }
    });

    const result = await response.json();

    if (result.error) {
      console.error("Cloudinary Error:", result.error);
      throw new Error(result.error.message);
    }

    if (result.secure_url) {
      const id = result.asset_id || `${Date.now()}`;
      setDoc(doc(db, 'users', userId, 'storage_uploads', id), {
        id,
        provider: 'cloudinary',
        folder,
        url: result.secure_url,
        publicId: result.public_id || '',
        bytes: Number(result.bytes) || 0,
        format: result.format || '',
        createdAt: new Date().toISOString(),
      }, { merge: true }).catch((error) => {
        console.log('Failed to save upload storage metadata:', error);
      });
    }

    // 4. Return the secure URL. This URL is automatically saved into your FIREBASE DATABASE!
    return result.secure_url;
  } catch (error) {
    console.error("Upload error:", error);
    throw new Error("Failed to upload image.");
  }
};
