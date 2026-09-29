// =====================================================================
// CLOUDINARY CONFIG
// Uses an UNSIGNED upload preset so no secret ever touches the frontend.
// Setup in Cloudinary dashboard:
//   Settings > Upload > Upload presets > Add upload preset
//   - Signing mode: Unsigned
//   - Folder: cbm/payment-screenshots  (restrict via folder)
//   - Enable "Use filename" off, allow images only for this preset
// Create a SEPARATE unsigned preset for admin-only media (templates/projects)
// once the Owner Dashboard (Phase 2) exists — do not reuse the customer
// screenshot preset for that, so the two upload permissions stay separate.
// =====================================================================

export const CLOUDINARY_CLOUD_NAME = "qkhyms14";
export const CLOUDINARY_UPLOAD_PRESET_PAYMENTS = "cbm_payment_screenshots";

export async function uploadToCloudinary(file, { folder = "cbm/payment-screenshots", preset = CLOUDINARY_UPLOAD_PRESET_PAYMENTS } = {}) {
  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", preset);
  formData.append("folder", folder);

  const res = await fetch(url, { method: "POST", body: formData });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error("Cloudinary upload failed: " + errText);
  }
  const data = await res.json();
  return { url: data.secure_url, publicId: data.public_id };
}
