import "./MediaLibrary.css";
import toast from "react-hot-toast";
import { useEffect, useState, useRef } from "react";
import {
  Image, X, Eye, Search,
  CloudUpload, Film, Play, ExternalLink, Clock,
} from "lucide-react";
import {
  getImages, getWasabiFile, uploadImage, updateImageStatus,
  getVideos, updateVideoStatus, uploadVideoChunked, makeUploadId,
} from "../api/mediaService";

const MediaLibrary = () => {

  /* ── IMAGE STATE ── */
  const [images, setImages]             = useState([]);
  const [imageUrls, setImageUrls]       = useState({});
  const [title, setTitle]               = useState("");
  const [file, setFile]                 = useState(null);
  const [imgProgress, setImgProgress]   = useState(0);
  const [imgUploading, setImgUploading] = useState(false);
  const [imgDone, setImgDone]           = useState(false);

  /* ── VIDEO STATE ── */
  const [videos, setVideos]                 = useState([]);
  const [videoUrls, setVideoUrls]           = useState({});
  const [videoTitle, setVideoTitle]         = useState("");
  const [videoFile, setVideoFile]           = useState(null);
  const [vidProgress, setVidProgress]       = useState(0);
  const [vidUploading, setVidUploading]     = useState(false);
  const [vidDone, setVidDone]               = useState(false);
  const [vidStatusText, setVidStatusText]   = useState("");

  const [loadingMedia, setLoadingMedia] = useState(false);

  /* ── MODALS ── */
  const [thumbOpen, setThumbOpen]               = useState(false);
  const [selectedThumb, setSelectedThumb]       = useState(null);
  const [previewOpen, setPreviewOpen]           = useState(false);
  const [previewData, setPreviewData]           = useState(null);
  const [vidPreviewOpen, setVidPreviewOpen]     = useState(false);
  const [vidPreviewData, setVidPreviewData]     = useState(null);
  const videoRef = useRef(null);

  /* ── LOAD ── */
  const loadImages = async () => {
    try {
      const res = await getImages();
      if (res.data.status) {
        const data = res.data.data;
        setImages(data);
        const map = {};
        await Promise.all(data.map(async (img) => {
          try {
            const r = await getWasabiFile(img.media_url);
            map[img.id] = r?.data?.data?.wasabi_url;
          } catch { map[img.id] = null; }
        }));
        setImageUrls(map);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load images");
    }
  };

  const loadVideos = async () => {
    try {
      const res = await getVideos();
      if (!res.data.status) return;
      const data = res.data.data;
      const map = {};
      await Promise.all(data.map(async (vid) => {
        if (!vid.thumbnail) { map[vid.id] = null; return; }
        try {
          const r = await getWasabiFile(vid.thumbnail);
          map[vid.id] = r?.data?.data?.wasabi_url ?? null;
        } catch { map[vid.id] = null; }
      }));
      setVideos([...data]);
      setVideoUrls({ ...map });
    } catch (e) {
      console.error("loadVideos error:", e);
      toast.error("Failed to load videos");
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoadingMedia(true);
      await Promise.all([loadImages(), loadVideos()]);
      setLoadingMedia(false);
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── HLS VIDEO PREVIEW ── */
  useEffect(() => {
    if (!vidPreviewOpen || !vidPreviewData?.wasabiUrl || !vidPreviewData?.mediaUrl) return;
    let blobUrl = null;

    const startPlayer = async () => {
      const video = videoRef.current;
      if (!video) return;
      if (video._hls) { video._hls.destroy(); video._hls = null; }

      const base = vidPreviewData.mediaUrl.replace("master.m3u8", "");
      const variants = ["v0.m3u8", "v1.m3u8", "v2.m3u8"];

      const signedMap = {};
      await Promise.all(variants.map(async (v) => {
        try {
          const r = await getWasabiFile(base + v);
          signedMap[v] = r?.data?.data?.wasabi_url || null;
        } catch { signedMap[v] = null; }
      }));

      const masterRes = await fetch(vidPreviewData.wasabiUrl);
      let masterText = await masterRes.text();
      variants.forEach(v => {
        if (signedMap[v]) masterText = masterText.split(v).join(signedMap[v]);
      });

      const blob = new Blob([masterText], { type: "application/vnd.apple.mpegurl" });
      blobUrl = URL.createObjectURL(blob);

      if (window.Hls && window.Hls.isSupported()) {
        const Hls = window.Hls;
        class WasabiLoader extends Hls.DefaultConfig.loader {
          constructor(config) { super(config); }
          load(context, config, callbacks) {
            const url = context.url;
            if (url.match(/\.ts(\?|$)/)) {
              const filename = url.split("/").pop().split("?")[0];
              getWasabiFile(base + filename)
                .then(r => {
                  const signed = r?.data?.data?.wasabi_url;
                  if (signed) context.url = signed;
                  super.load(context, config, callbacks);
                })
                .catch(() => super.load(context, config, callbacks));
            } else {
              super.load(context, config, callbacks);
            }
          }
        }
        const hls = new Hls({ enableWorker: false, loader: WasabiLoader, fLoader: WasabiLoader });
        hls.loadSource(blobUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
        hls.on(Hls.Events.ERROR, (_, data) => { if (data.fatal) console.error("HLS fatal:", data.type, data.details); });
        video._hls = hls;
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = blobUrl;
        video.play().catch(() => {});
      }
    };

    const loadHlsAndStart = () => {
      if (!window.Hls) {
        const existing = document.querySelector('script[src*="hls.min.js"]');
        if (!existing) {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.4.12/hls.min.js";
          script.onload = startPlayer;
          document.head.appendChild(script);
          return;
        }
      }
      startPlayer();
    };

    loadHlsAndStart();
    return () => {
      if (videoRef.current?._hls) { videoRef.current._hls.destroy(); videoRef.current._hls = null; }
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [vidPreviewOpen, vidPreviewData]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── UPLOAD IMAGE ── */
  const handleUploadImage = async () => {
    if (!title || !file) return toast.error("Please add a title and select an image");
    const fd = new FormData();
    fd.append("title", title);
    fd.append("image", file);
    setImgUploading(true); setImgDone(false);
    const t = toast.loading("Uploading image...");
    try {
      await uploadImage(fd, (pct) => setImgProgress(pct));
      setImgDone(true);
      loadImages();
      toast.success("Image uploaded!", { id: t });
      setTimeout(() => {
        setImgDone(false);
        setFile(null);
        setTitle("");
        setImgProgress(0);
      }, 1500);
    } catch (e) {
      console.error(e);
      toast.error("Image upload failed", { id: t });
    }
    finally { setImgUploading(false); }
  };

  /* ── UPLOAD VIDEO ── */
  const handleUploadVideo = async () => {
    if (!videoTitle || !videoFile) return toast.error("Please add a video title and file");
    if (!selectedThumb) return toast.error("Please select a thumbnail first");
    const uploadId = makeUploadId(videoTitle);
    if (!uploadId) return toast.error("Video title must contain at least one letter or number");
    setVidUploading(true); setVidDone(false); setVidProgress(0); setVidStatusText("");
    const t = toast.loading("Uploading video chunks...");
    try {
      await uploadVideoChunked(
        videoFile, uploadId, selectedThumb.id,
        (pct) => setVidProgress(pct),
        (text) => setVidStatusText(text)
      );
      setVidDone(true);
      setVidStatusText("Processing...");
      toast.success("Uploaded! Processing on server...", { id: t });
      setTimeout(() => {
        setVidDone(false);
        setVideoFile(null);
        setVideoTitle("");
        setSelectedThumb(null);
        setVidProgress(0);
        setVidStatusText("");
      }, 1500);
      const prevCount = videos.length;
      let tries = 0;
      const autoRefresh = async () => {
        tries++;
        try {
          const res = await getVideos();
          if (res.data.status && res.data.data.length > prevCount) {
            await loadVideos(); setVidStatusText(""); return;
          }
        } catch (e) { console.error(e); }
        if (tries < 30) setTimeout(autoRefresh, 10000);
        else setVidStatusText("");
      };
      setTimeout(autoRefresh, 10000);
    } catch (e) {
      console.error("Video upload error:", e);
      toast.error("Upload failed. Please try again.", { id: t });
    } finally {
      setVidUploading(false); setVidProgress(0);
    }
  };

  /* ── STATUS TOGGLES ── */
  const toggleImgStatus = async (img) => {
    // false = active (toggle ON), true = inactive (toggle OFF)
    const newStatus = !img.status;
    setImages(prev => prev.map(i => i.id === img.id ? { ...i, status: newStatus } : i));
    const t = toast.loading("Updating...");
    try {
      await updateImageStatus(img.id, newStatus);
      loadImages();
      toast.success("Status updated", { id: t });
    } catch (e) {
      console.error("updateImageStatus error:", e.response?.data || e.message);
      setImages(prev => prev.map(i => i.id === img.id ? { ...i, status: img.status } : i));
      toast.error("Update failed", { id: t });
    }
  };

  const toggleVidStatus = async (vid) => {
    try { await updateVideoStatus(vid.id, !vid.status); loadVideos(); }
    catch (e) { console.error("updateVideoStatus error:", e.response?.data || e.message); }
  };

  /* ── HELPERS ── */
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-GB").replace(/\//g, "-") : "—"; // uses updated_at
  const fmtDuration = (s) => {
    if (!s && s !== 0) return "—";
    const m = Math.floor(Number(s) / 60);
    const sec = Number(s) % 60;
    if (m === 0) return `${sec}s`;
    return sec > 0 ? `${m}m ${sec}s` : `${m} min`;
  };
  const totalFiles = images.length + videos.length;

  const imgRows = images.length > 0 ? images
    : Array(3).fill(null).map((_, i) => ({ id: i, title: "Sample Image", created_at: null, status: 1, _mock: true }));
  const vidRows = videos.length > 0 ? videos
    : Array(3).fill(null).map((_, i) => ({ id: i, video_id: "Sample Video", thumbnail: null, status: false, duration: null, _mock: true }));

  return (
    <div className="media-page">

      {/* GLOBAL LOADER */}
      {loadingMedia && (
        <div className="global-loader">
          <div className="loader-box">
            <div className="loader-spinner" />
            <p>Loading media...</p>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="media-header">
        <div>
          <h1 className="page-title">Media Library</h1>
          <p className="page-sub">{totalFiles} files — {images.length} images, {videos.length} videos</p>
        </div>
      </div>

      {/* 2×2 GRID */}
      <div className="ml-grid">

        {/* CARD 1 — Images List */}
        <div className="ml-card">
          <div className="card-head">
            <Image size={16} className="card-head-icon" />
            <p className="card-title">Images List</p>
            <span className="card-count">{images.length}</span>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th className="col-prev">Preview</th>
                <th>Title</th>
                <th className="col-date">Updated</th>
                <th className="col-status">Status</th>
              </tr>
            </thead>
            <tbody>
              {imgRows.map((img, i) => (
                <tr key={img._mock ? `mi${i}` : img.id}>
                  <td>
                    <div className="thumb-wrap"
                      onClick={() => !img._mock && imageUrls[img.id] && (setPreviewData({ src: imageUrls[img.id], title: img.title }), setPreviewOpen(true))}>
                      <img className="row-thumb"
                        src={img._mock ? "/no-image.png" : (imageUrls[img.id] || "/no-image.png")}
                        alt={img.title}
                        style={{ cursor: img._mock ? "default" : "pointer" }}
                      />
                      {!img._mock && imageUrls[img.id] && (
                        <div className="thumb-overlay"><Eye size={14} color="white" /></div>
                      )}
                    </div>
                  </td>
                  <td className="td-title">{img.title}</td>
                  <td className="td-sm">{fmtDate(img.updated_at)}</td>
                  <td>
                    <label className="toggle">
                      <input type="checkbox" checked={!img.status}
                        onChange={() => !img._mock && toggleImgStatus(img)} />
                      <span className="tog-track" />
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* CARD 2 — Image Upload */}
        <div className="ml-card">
          <div className="card-head">
            <CloudUpload size={16} className="card-head-icon" />
            <p className="card-title">Upload Image</p>
          </div>
          <p className="form-lbl">Image Title</p>
          <input className="f-input" placeholder="Type your title here...."
            value={title} onChange={(e) => { setTitle(e.target.value); setImgDone(false); }} />
          <div className="drop-zone"
            onClick={() => document.getElementById("_img").click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { setFile(f); setImgDone(false); } }}>
            <input id="_img" type="file" accept="image/*" style={{ display: "none" }}
              onChange={(e) => { setFile(e.target.files[0]); setImgDone(false); }} />
            <CloudUpload size={36} color="#2f4fd5" strokeWidth={1.4} />
            <p className="dz-text">{file ? file.name : "Click or drag to upload an image"}</p>
            <span className="dz-hint">PNG, JPG, up to 5MB</span>
            {(imgUploading || imgProgress > 0) && (
              <div className="prog-wrap">
                <div className="prog-bar"><div style={{ width: `${imgProgress}%` }} /></div>
                <div className="prog-labels"><span>{imgProgress}%</span><span>100%</span></div>
              </div>
            )}
          </div>
          <button className={`up-btn${imgDone ? " up-btn--done" : ""}`} onClick={handleUploadImage} disabled={imgUploading}>
            {imgDone ? "✓ Completed" : imgUploading ? `Uploading ${imgProgress}%` : "Upload"}
          </button>
        </div>

        {/* CARD 3 — Video List */}
        <div className="ml-card">
          <div className="card-head">
            <Film size={16} className="card-head-icon" />
            <p className="card-title">Video List</p>
            <span className="card-count">{videos.length}</span>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th className="col-prev">Preview</th>
                <th>Title</th>
                <th className="col-dur">Duration</th>
                <th className="col-status">Status</th>
              </tr>
            </thead>
            <tbody>
              {vidRows.map((vid, i) => (
                <tr key={vid._mock ? `mv${i}` : vid.id}>
                  <td>
                    <div className="thumb-wrap vid-thumb-wrap"
                      onClick={async () => {
                        if (vid._mock || !vid.media_url) return;
                        try {
                          const r = await getWasabiFile(vid.media_url);
                          const wasabiUrl = r?.data?.data?.wasabi_url;
                          setVidPreviewData({ title: vid.video_id, wasabiUrl: wasabiUrl || null, mediaUrl: vid.media_url });
                        } catch {
                          setVidPreviewData({ title: vid.video_id, wasabiUrl: null, mediaUrl: vid.media_url });
                        }
                        setVidPreviewOpen(true);
                      }}>
                      {!vid._mock && videoUrls[vid.id]
                        ? <img className="row-thumb" src={videoUrls[vid.id]} alt={vid.video_id} />
                        : <div className="row-thumb row-thumb--ph" />}
                      {!vid._mock && (
                        <div className="thumb-overlay">
                          <div className="vid-play-btn"><Play size={10} color="white" fill="white" /></div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="td-title">{vid.video_id || "—"}</td>
                  <td className="td-sm td-dur">
                    {vid._mock ? "—" : <><Clock size={11} style={{ marginRight: 4, verticalAlign: "middle" }} />{fmtDuration(vid.duration)}</>}
                  </td>
                  <td>
                    <span className={`status-pill ${vid.media_url && vid.media_url.includes("master.m3u8") ? "pill--completed" : "pill--pending"}`}>
                      {vid.media_url && vid.media_url.includes("master.m3u8") ? "Completed" : "Pending"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* CARD 4 — Video Upload */}
        <div className="ml-card">
          <div className="card-head">
            <CloudUpload size={16} className="card-head-icon" />
            <p className="card-title">Upload Video</p>
          </div>
          <div className="thumb-row">
            <input className="f-input thumb-txt" placeholder="Select thumbnail"
              value={selectedThumb?.title || ""} readOnly onClick={() => setThumbOpen(true)} />
            <button className="thumb-icon-btn" onClick={() => setThumbOpen(true)}>
              <Search size={15} color="#666" />
            </button>
          </div>
          <p className="form-lbl">Video Title</p>
          <input className="f-input" placeholder="Type your title here...."
            value={videoTitle} onChange={(e) => { setVideoTitle(e.target.value); setVidDone(false); }} />
          <div className="drop-zone"
            onClick={() => document.getElementById("_vid").click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { setVideoFile(f); setVidDone(false); } }}>
            <input id="_vid" type="file" accept="video/*,.zip,application/zip" style={{ display: "none" }}
              onChange={(e) => { setVideoFile(e.target.files[0]); setVidDone(false); }} />
            <CloudUpload size={36} color="#2f4fd5" strokeWidth={1.4} />
            <p className="dz-text">{videoFile ? videoFile.name : "Click or drag to upload .zip or video"}</p>
            {(vidUploading || vidProgress > 0) && (
              <div className="prog-wrap">
                <div className="prog-bar"><div style={{ width: `${vidProgress}%` }} /></div>
                <div className="prog-labels"><span>{vidProgress}%</span><span>100%</span></div>
              </div>
            )}
          </div>
          {vidUploading && <p className="vid-status-text">{vidStatusText}</p>}
          <button className={`up-btn${vidDone ? " up-btn--done" : ""}`} onClick={handleUploadVideo} disabled={vidUploading}>
            {vidDone ? "✓ Completed" : vidUploading ? `Uploading ${vidProgress}%` : "Upload"}
          </button>
        </div>

      </div>

      {/* THUMBNAIL PICKER MODAL */}
      {thumbOpen && (
        <div className="overlay" onClick={() => setThumbOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-hdr">
              <span className="modal-title">Select Thumbnail</span>
              <button className="modal-close-btn" onClick={() => setThumbOpen(false)}><X size={15} /></button>
            </div>
            <div className="thumb-grid">
              {(images.length > 0 ? images : Array(6).fill(null).map((_, i) => ({ id: i, title: "Sample Image", _mock: true }))).map((img, i) => (
                <div key={img._mock ? i : img.id}
                  className={`t-item${selectedThumb?.id === img.id ? " t-item--sel" : ""}`}
                  onClick={() => { if (!img._mock) { setSelectedThumb({ id: img.id, title: img.title }); setThumbOpen(false); } }}>
                  <div className="t-img">
                    {!img._mock && imageUrls[img.id]
                      ? <img src={imageUrls[img.id]} alt={img.title} />
                      : <><Eye size={13} color="#aaa" /><span>Preview</span></>}
                  </div>
                  <p>{img.title}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIDEO PREVIEW MODAL */}
      {vidPreviewOpen && vidPreviewData && (
        <div className="overlay preview-overlay" onClick={() => setVidPreviewOpen(false)}>
          <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="preview-topbar">
              <div className="preview-title-wrap">
                <div className="preview-type-icon"><Film size={15} color="#2f4fd5" /></div>
                <span className="preview-title">{vidPreviewData.title}</span>
              </div>
              <button className="preview-close-btn" onClick={() => setVidPreviewOpen(false)}><X size={15} /></button>
            </div>
            <div className="preview-vid-wrap">
              <video ref={videoRef} className="preview-video" controls>
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        </div>
      )}

      {/* IMAGE PREVIEW MODAL */}
      {previewOpen && previewData && (
        <div className="overlay preview-overlay" onClick={() => setPreviewOpen(false)}>
          <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="preview-topbar">
              <div className="preview-title-wrap">
                <div className="preview-type-icon"><Image size={15} color="#2f4fd5" /></div>
                <span className="preview-title">{previewData.title}</span>
              </div>
              <button className="preview-close-btn" onClick={() => setPreviewOpen(false)}><X size={15} /></button>
            </div>
            <div className="preview-img-wrap">
              <img src={previewData.src} alt={previewData.title} className="preview-img" />
            </div>
            <div className="preview-footer">
              <span className="preview-badge"><Eye size={10} /> IMAGE</span>
              <a href={previewData.src} target="_blank" rel="noreferrer" className="preview-link">
                <ExternalLink size={12} /> Open Original
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MediaLibrary;