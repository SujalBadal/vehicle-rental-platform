const { v2: cloudinary } = require("cloudinary");
const { Readable } = require("node:stream");

function configureCloudinary() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    return false;
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME.trim(),
    api_key: CLOUDINARY_API_KEY.trim(),
    api_secret: CLOUDINARY_API_SECRET.trim(),
    secure: true,
  });

  return true;
}

function uploadVehicleImage(fileBuffer, folder = "smart-car-rental/vehicles") {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      async (error, result) => {
        if (error) {
          if (error.http_code === 403 || String(error.message).includes("403")) {
            try {
              await cloudinary.api.ping();
            } catch (pingError) {
              const detailedReason = pingError?.error?.message || pingError?.message;
              if (detailedReason) {
                error.message = `${error.message}: ${detailedReason}`;
              }
              if (pingError?.xCldError || pingError?.error?.xCldError) {
                error.xCldError = pingError.xCldError || pingError.error.xCldError;
              }
              if (pingError?.response || pingError?.error?.response) {
                error.response = pingError.response || pingError.error.response;
              }
            }
          }
          return reject(error);
        }

        resolve({ url: result.secure_url, publicId: result.public_id });
      },
    );

    uploadStream.on("error", (streamError) => {
      reject(streamError);
    });

    Readable.from(fileBuffer).pipe(uploadStream);
  });
}

function deleteVehicleImage(publicId) {
  return cloudinary.uploader.destroy(publicId, { resource_type: "image" });
}

module.exports = { configureCloudinary, uploadVehicleImage, deleteVehicleImage };
