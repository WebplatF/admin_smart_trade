import axiosClient from "./axiosClient";

/* ─────────────────────────────────────────
   IMAGE APIs
───────────────────────────────────────── */

/* GET IMAGES LIST */
export const getImages = () => {
  return axiosClient.get("/admin/image_list");
};

/* GET WASABI SIGNED URL */
export const getWasabiFile = (path) => {
  return axiosClient.get(`/common/wasabi_file?path=${path}`);
};

/* UPLOAD IMAGE */
export const uploadImage = (formData, onProgress) => {
  return axiosClient.post("/common/image_upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => {
      if (e.total && onProgress) {
        onProgress(Math.round((e.loaded * 100) / e.total));
      }
    },
  });
};

/* TOGGLE IMAGE STATUS */
export const updateImageStatus = (id, status) => {
  return axiosClient.post(`/admin/image_status/${id}`, { status });
};

/* ─────────────────────────────────────────
   VIDEO APIs
───────────────────────────────────────── */

/* GET VIDEOS LIST */
export const getVideos = () => {
  return axiosClient.get("/admin/video_list");
};

/* TOGGLE VIDEO STATUS */
export const updateVideoStatus = (id, status) => {
  return axiosClient.post(`/admin/video_status/${id}`, { status: Boolean(status) });
};

/* UPLOAD VIDEO — chunked
   upload_id     = cleaned video title from user (lowercase, alphanumeric only)
   chunk_index   = 1-based
   total_chunks  = total number of chunks
   file          = chunk blob named chunk_N.part
   thumbnail_id  = selected thumbnail id
*/
const CHUNK_SIZE = 2 * 1024 * 1024; // 2 MB

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

/* Clean the video title into a valid upload_id:
   lowercase, strip everything except a-z and 0-9 */
export const makeUploadId = (title) =>
  title.toLowerCase().replace(/[^a-z0-9]/g, "");

export const uploadVideoChunked = async (
  file,
  uploadId,
  thumbnailId,
  onProgress,
  onChunkStatus
) => {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  let lastResponse = null;

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end   = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    if (onChunkStatus) onChunkStatus(`Uploading chunk ${i + 1} / ${totalChunks}`);

    const fd = new FormData();
    fd.append("upload_id",    uploadId);
    fd.append("chunk_index",  String(i));           // 0-based: chunk_0.part = index 0
    fd.append("total_chunks", String(totalChunks));
    fd.append("file",         chunk, `chunk_${i}.part`);
    fd.append("thumbnail_id", thumbnailId);

    let retries = 3;
    while (retries > 0) {
      try {
        const response = await axiosClient.post("/admin/common/file_upload", fd, {
          timeout: 120000, // 2 minutes per chunk
          onUploadProgress: (e) => {
            if (!e.total || !onProgress) return;
            const done    = (i / totalChunks) * 100;
            const current = (e.loaded / e.total) * (100 / totalChunks);
            onProgress(Math.round(done + current));
          },
        });
        lastResponse = response?.data;
        console.log(`✓ chunk ${i + 1} / ${totalChunks} done`);
        break;
      } catch (err) {
        retries--;
        console.error(`✗ chunk ${i + 1} failed — retries left: ${retries}`);
        console.error("Status :", err.response?.status);
        console.error("Backend:", JSON.stringify(err.response?.data, null, 2));
        if (retries === 0) throw err;
        await sleep(2000);
      }
    }

    if (i < totalChunks - 1) await sleep(300);
  }

  console.log("✓ All chunks uploaded — upload_id:", uploadId);
};