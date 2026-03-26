import { useState, useEffect, useRef } from "react";
import "./HomePageBuilder.css";
import { Image as ImageIcon, X, Plus, Film, Layout } from "lucide-react";
import axiosClient from "../api/axiosClient";
import { getImages, getVideos, getWasabiFile } from "../api/mediaService";
import toast from "react-hot-toast";

/* ── API ── */
const getHomeBuilder = ()     => axiosClient.get("/admin/home_builder");
const addBannerApi   = (data) => axiosClient.post("/admin/add_banner", data);
const addDemoApi     = (data) => axiosClient.post("/admin/add_demo", data);

const HomePageBuilder = () => {

  /* ── STATE ── */
  const demoVideoRef = useRef(null);
  const [previewDemo, setPreviewDemo] = useState(false);
  const [banners, setBanners]     = useState([]);
  const [demoVideo, setDemoVideo] = useState(null);
  const [itemUrls, setItemUrls]   = useState({});
  const [loading, setLoading]     = useState(false);

  /* ── IMAGE BANNER MODAL ── */
  const [imgModal, setImgModal]       = useState(false);
  const [bannerTitle, setBannerTitle] = useState("");
  const [savingImg, setSavingImg]     = useState(false);
  const [imgFormErr, setImgFormErr]   = useState("");

  /* ── VIDEO DEMO MODAL ── */
  const [vidModal, setVidModal]   = useState(false);
  const [demoTitle, setDemoTitle] = useState("");
  const [savingVid, setSavingVid] = useState(false);
  const [vidFormErr, setVidFormErr] = useState("");

  /* ── IMAGE PICKER ── */
  const [imgPickerOpen, setImgPickerOpen] = useState(false);
  const [images, setImages]               = useState([]);
  const [imageUrls, setImageUrls]         = useState({});
  const [selectedImg, setSelectedImg]     = useState(null);
  const [loadingImgs, setLoadingImgs]     = useState(false);

  /* ── VIDEO PICKER ── */
  const [vidPickerOpen, setVidPickerOpen]   = useState(false);
  const [videos, setVideos]                 = useState([]);
  const [videoThumbUrls, setVideoThumbUrls] = useState({});
  const [selectedVid, setSelectedVid]       = useState(null);
  const [loadingVids, setLoadingVids]       = useState(false);

  /* ── HLS PLAYER FOR DEMO VIDEO ── */
  useEffect(() => {
    if (!previewDemo || !demoVideo?.video_id || !demoVideoRef.current) return;
    const video = demoVideoRef.current;
    const mediaUrl = `uploads/${demoVideo.video_id}/master.m3u8`;
    const base = `uploads/${demoVideo.video_id}/`;

    if (video._hls) { video._hls.destroy(); video._hls = null; }

    const initPlayer = async () => {
      // get signed master URL
      let masterSignedUrl = null;
      try {
        const r = await getWasabiFile(mediaUrl);
        masterSignedUrl = r?.data?.data?.wasabi_url || null;
      } catch {}
      if (!masterSignedUrl) return;

      const variants = ["v0.m3u8", "v1.m3u8", "v2.m3u8"];
      const signedMap = {};
      await Promise.all(variants.map(async (v) => {
        try { const r = await getWasabiFile(base + v); signedMap[v] = r?.data?.data?.wasabi_url || null; }
        catch { signedMap[v] = null; }
      }));

      let masterText = "";
      try {
        const res = await fetch(masterSignedUrl);
        masterText = await res.text();
        variants.forEach(v => { if (signedMap[v]) masterText = masterText.split(v).join(signedMap[v]); });
      } catch { video.src = masterSignedUrl; video.play().catch(() => {}); return; }

      const blob = new Blob([masterText], { type: "application/vnd.apple.mpegurl" });
      const blobUrl = URL.createObjectURL(blob);

      if (window.Hls && window.Hls.isSupported()) {
        const Hls = window.Hls;
        class WasabiLoader extends Hls.DefaultConfig.loader {
          constructor(config) { super(config); }
          load(context, config, callbacks) {
            const url = context.url;
            if (url.match(/\.ts(\?|$)/)) {
              const filename = url.split("/").pop().split("?")[0];
              getWasabiFile(base + filename)
                .then(r => { const s = r?.data?.data?.wasabi_url; if (s) context.url = s; super.load(context, config, callbacks); })
                .catch(() => super.load(context, config, callbacks));
            } else { super.load(context, config, callbacks); }
          }
        }
        const hls = new Hls({ enableWorker: false, loader: WasabiLoader, fLoader: WasabiLoader });
        hls.loadSource(blobUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
        hls.on(Hls.Events.ERROR, (_, d) => { if (d.fatal) console.error("HLS:", d.details); });
        video._hls = hls;
        video._blobUrl = blobUrl;
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = blobUrl; video.play().catch(() => {});
      }
    };

    if (!window.Hls) {
      const existing = document.querySelector('script[src*="hls.min.js"]');
      if (!existing) {
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.4.12/hls.min.js";
        script.onload = initPlayer;
        document.head.appendChild(script);
      } else { initPlayer(); }
    } else { initPlayer(); }

    return () => {
      if (demoVideoRef.current?._hls) { demoVideoRef.current._hls.destroy(); demoVideoRef.current._hls = null; }
      if (demoVideoRef.current?._blobUrl) { URL.revokeObjectURL(demoVideoRef.current._blobUrl); }
    };
  }, [previewDemo, demoVideo]); // eslint-disable-line

  /* ── LOAD ── */
  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getHomeBuilder();
      if (res.data.status) {
        const raw = res.data.data;
        const bannerList = raw?.banner || [];
        const demoList   = raw?.demo_videos || [];
        setBanners(bannerList);
        setDemoVideo(demoList[0] || null);

        const map = {};
        await Promise.all([
          ...bannerList.map(async (b, i) => {
            if (!b.path) { map[`b_${i}`] = null; return; }
            try { const r = await getWasabiFile(b.path); map[`b_${i}`] = r?.data?.data?.wasabi_url ?? null; }
            catch { map[`b_${i}`] = null; }
          }),
          ...(demoList[0]?.thumbnail ? [async () => {
            try { const r = await getWasabiFile(demoList[0].thumbnail); map["demo"] = r?.data?.data?.wasabi_url ?? null; }
            catch { map["demo"] = null; }
          }] : []),
        ]);
        if (demoList[0]?.thumbnail) {
          try { const r = await getWasabiFile(demoList[0].thumbnail); map["demo"] = r?.data?.data?.wasabi_url ?? null; }
          catch { map["demo"] = null; }
        }
        setItemUrls(map);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load data");
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []); // eslint-disable-line

  /* ── LOAD IMAGES ── */
  const loadImages = async () => {
    if (images.length > 0) return; // already loaded
    setLoadingImgs(true);
    try {
      const res = await getImages();
      if (res.data.status) {
        const data = res.data.data;
        setImages(data);
        const map = {};
        await Promise.all(data.map(async (img) => {
          try { const r = await getWasabiFile(img.media_url); map[img.id] = r?.data?.data?.wasabi_url ?? null; }
          catch { map[img.id] = null; }
        }));
        setImageUrls(map);
      }
    } catch (e) { console.error(e); }
    finally { setLoadingImgs(false); }
  };

  /* ── LOAD VIDEOS ── */
  const loadVideosForPicker = async () => {
    if (videos.length > 0) return; // already loaded
    setLoadingVids(true);
    try {
      const res = await getVideos();
      if (res.data.status) {
        const data = res.data.data;
        setVideos(data);
        const map = {};
        await Promise.all(data.map(async (v) => {
          if (!v.thumbnail) { map[v.id] = null; return; }
          try { const r = await getWasabiFile(v.thumbnail); map[v.id] = r?.data?.data?.wasabi_url ?? null; }
          catch { map[v.id] = null; }
        }));
        setVideoThumbUrls(map);
      }
    } catch (e) { console.error(e); }
    finally { setLoadingVids(false); }
  };

  /* ── SAVE BANNER ── */
  const saveBanner = async () => {
    if (!bannerTitle.trim()) return setImgFormErr("Title is required.");
    if (!selectedImg) return setImgFormErr("Please select an image.");
    setSavingImg(true); setImgFormErr("");
    const t = toast.loading("Adding banner...");
    try {
      const res = await addBannerApi({ title: bannerTitle.trim(), image_id: selectedImg.id });
      if (res.data.status !== false) {
        setImgModal(false); setBannerTitle(""); setSelectedImg(null);
        setImages([]); // reset so next open reloads
        loadData();
        toast.success("Banner added!", { id: t });
      } else {
        setImgFormErr(res.data.message || "Failed to save.");
        toast.error("Failed", { id: t });
      }
    } catch (e) {
      setImgFormErr(e.response?.data?.message || "An error occurred.");
      toast.error("Error", { id: t });
    } finally { setSavingImg(false); }
  };

  /* ── SAVE DEMO VIDEO ── */
  const saveDemoVideo = async () => {
    if (!demoTitle.trim()) return setVidFormErr("Title is required.");
    if (!selectedVid) return setVidFormErr("Please select a video.");
    setSavingVid(true); setVidFormErr("");
    const t = toast.loading("Setting demo video...");
    try {
      const res = await addDemoApi({ title: demoTitle.trim(), video_id: Number(selectedVid.id) });
      if (res.data.status !== false) {
        setVidModal(false); setDemoTitle(""); setSelectedVid(null);
        setVideos([]); // reset
        loadData();
        toast.success("Demo video set!", { id: t });
      } else {
        setVidFormErr(res.data.message || "Failed to save.");
        toast.error("Failed", { id: t });
      }
    } catch (e) {
      setVidFormErr(e.response?.data?.message || "An error occurred.");
      toast.error("Error", { id: t });
    } finally { setSavingVid(false); }
  };

  return (
    <div className="builder-page">

      {/* GLOBAL LOADER */}
      {loading && (
        <div className="global-loader">
          <div className="loader-box">
            <div className="loader-spinner" />
            <p>Loading...</p>
          </div>
        </div>
      )}

      {/* ── PAGE HEADER ── */}
      <div className="builder-page-header">
        <div className="builder-page-header-left">
          <div className="builder-page-icon"><Layout size={20} color="#2f4fd5" /></div>
          <div>
            <h1>Home Page Builder</h1>
            <p>Manage your homepage content and featured media</p>
          </div>
        </div>
      </div>

      {/* ── BANNERS SECTION ── */}
      <div className="hb-section">
        <div className="hb-section-header">
          <div className="hb-section-title-wrap">
            <ImageIcon size={16} color="#2f4fd5" />
            <h2>Hero Banners</h2>
            <span className="hb-count">{banners.length}</span>
          </div>
          <button className="hb-add-btn" onClick={() => { setImgFormErr(""); setBannerTitle(""); setSelectedImg(null); setImgModal(true); }}>
            <Plus size={13} /> ADD BANNER
          </button>
        </div>

        {banners.length === 0 ? (
          <div className="hb-empty">
            <div className="hb-empty-icon"><ImageIcon size={32} color="#c5d0f5" /></div>
            <p className="hb-empty-title">No banners added yet</p>
            <p className="hb-empty-sub">Add hero banners to showcase on your homepage</p>
          </div>
        ) : (
          <div className="hb-banner-grid">
            {banners.map((banner, i) => (
              <div className="hb-banner-card" key={i}>
                <div className="hb-banner-img-wrap">
                  {itemUrls[`b_${i}`]
                    ? <img src={itemUrls[`b_${i}`]} alt={banner.title} />
                    : <div className="hb-img-ph"><ImageIcon size={28} color="#c5d0f5" /></div>}
                  <div className="hb-banner-overlay">
                    <span className="hb-type-pill"><ImageIcon size={10} /> Banner</span>
                  </div>
                </div>
                <div className="hb-banner-footer">
                  <span className="hb-banner-title">{banner.title}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── DEMO VIDEO SECTION ── */}
      <div className="hb-section">
        <div className="hb-section-header">
          <div className="hb-section-title-wrap">
            <Film size={16} color="#6c3fc5" />
            <h2>Demo Video</h2>
          </div>
          <button className="hb-add-btn hb-add-btn--video"
            onClick={() => { setVidFormErr(""); setDemoTitle(demoVideo?.title || ""); setSelectedVid(null); setVideos([]); setVidModal(true); }}>
            <Film size={13} /> {demoVideo ? "CHANGE VIDEO" : "SET VIDEO"}
          </button>
        </div>

        {demoVideo ? (
          <div className="hb-demo-card" onClick={() => setPreviewDemo(true)} style={{ cursor: "pointer" }}>
            <div className="hb-demo-thumb">
              {itemUrls["demo"]
                ? <img src={itemUrls["demo"]} alt={demoVideo.title} />
                : <div className="hb-img-ph"><Film size={32} color="#c5d0f5" /></div>}
              <div className="hb-demo-play">
                <div className="hb-play-circle"><Film size={22} color="white" /></div>
              </div>
              <span className="hb-type-pill hb-type-pill--video"><Film size={10} /> Demo Video</span>
            </div>
            <div className="hb-demo-info">
              <h3>{demoVideo.title}</h3>
              <p className="hb-demo-meta">Video ID: <strong>{demoVideo.video_id}</strong></p>
            </div>
          </div>
        ) : (
          <div className="hb-empty">
            <div className="hb-empty-icon hb-empty-icon--video"><Film size={32} color="#c5b8f5" /></div>
            <p className="hb-empty-title">No demo video set</p>
            <p className="hb-empty-sub">Feature a video on your homepage to engage visitors</p>
          </div>
        )}
      </div>

      {/* ── ADD BANNER MODAL ── */}
      {imgModal && (
        <div className="modal-overlay" onClick={() => setImgModal(false)}>
          <div className="hb-modal" onClick={(e) => e.stopPropagation()}>
            <div className="hb-modal-header">
              <div className="hb-modal-title-wrap">
                <div className="hb-modal-icon"><ImageIcon size={15} color="#2f4fd5" /></div>
                <h3>Add Hero Banner</h3>
              </div>
              <button className="hb-modal-close" onClick={() => setImgModal(false)}><X size={15} /></button>
            </div>
            {imgFormErr && <p className="hb-form-err">{imgFormErr}</p>}
            <div className="hb-field">
              <label>Banner Title</label>
              <input className="hb-input" placeholder="Enter banner title..."
                value={bannerTitle} onChange={(e) => setBannerTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveBanner()} />
            </div>
            <div className="hb-field">
              <label>Image</label>
              <div className="hb-img-select" onClick={() => { setImgPickerOpen(true); loadImages(); }}>
                {selectedImg?.url
                  ? <><img src={selectedImg.url} alt="selected" className="hb-img-selected" />
                      <div className="hb-img-change"><span>Click to change</span></div></>
                  : <><ImageIcon size={22} color="#bbb" /><span>Click to select from Media Library</span></>}
              </div>
            </div>
            <div className="hb-modal-footer">
              <button className="hb-cancel-btn" onClick={() => setImgModal(false)}>Cancel</button>
              <button className="hb-save-btn" onClick={saveBanner} disabled={savingImg}>
                {savingImg ? "Saving..." : "Add Banner"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SET DEMO VIDEO MODAL ── */}
      {vidModal && (
        <div className="modal-overlay" onClick={() => setVidModal(false)}>
          <div className="hb-modal" onClick={(e) => e.stopPropagation()}>
            <div className="hb-modal-header">
              <div className="hb-modal-title-wrap">
                <div className="hb-modal-icon hb-modal-icon--video"><Film size={15} color="#6c3fc5" /></div>
                <h3>Set Demo Video</h3>
              </div>
              <button className="hb-modal-close" onClick={() => setVidModal(false)}><X size={15} /></button>
            </div>
            {vidFormErr && <p className="hb-form-err">{vidFormErr}</p>}
            <div className="hb-field">
              <label>Video Title</label>
              <input className="hb-input" placeholder="Enter demo video title..."
                value={demoTitle} onChange={(e) => setDemoTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveDemoVideo()} />
            </div>
            <div className="hb-field">
              <label>Video</label>
              <div className="hb-img-select hb-vid-select" onClick={() => { setVidPickerOpen(true); loadVideosForPicker(); }}>
                {selectedVid
                  ? <><img src={videoThumbUrls[selectedVid.id] || ""} alt={selectedVid.video_id}
                        className="hb-img-selected" onError={(e) => e.target.style.display="none"} />
                      <div className="hb-img-change"><span>Click to change</span></div></>
                  : <><Film size={22} color="#bbb" /><span>Click to select from Media Library</span></>}
              </div>
              {selectedVid && <p className="hb-selected-name"><Film size={11} /> {selectedVid.video_id}</p>}
            </div>
            <div className="hb-modal-footer">
              <button className="hb-cancel-btn" onClick={() => setVidModal(false)}>Cancel</button>
              <button className="hb-save-btn hb-save-btn--video" onClick={saveDemoVideo} disabled={savingVid}>
                {savingVid ? "Saving..." : "Set Video"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── IMAGE PICKER ── */}
      {imgPickerOpen && (
        <div className="modal-overlay" onClick={() => setImgPickerOpen(false)}>
          <div className="hb-picker-modal" onClick={(e) => e.stopPropagation()}>
            <div className="hb-modal-header">
              <div className="hb-modal-title-wrap">
                <div className="hb-modal-icon"><ImageIcon size={15} color="#2f4fd5" /></div>
                <h3>Select Image</h3>
              </div>
              <button className="hb-modal-close" onClick={() => setImgPickerOpen(false)}><X size={15} /></button>
            </div>
            {loadingImgs ? <p className="hb-loading">Loading images...</p> : (
              <div className="hb-picker-grid">
                {images.map(img => (
                  <div key={img.id}
                    className={`hb-picker-item${selectedImg?.id === img.id ? " hb-picker-item--sel" : ""}`}
                    onClick={() => { setSelectedImg({ id: img.id, url: imageUrls[img.id] }); setImgPickerOpen(false); }}>
                    {imageUrls[img.id]
                      ? <img src={imageUrls[img.id]} alt={img.title} />
                      : <div className="hb-picker-ph"><ImageIcon size={18} color="#c5d0f5" /></div>}
                    <p>{img.title}</p>
                  </div>
                ))}
                {images.length === 0 && <p className="hb-picker-empty">No images in Media Library.</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── VIDEO PICKER ── */}
      {vidPickerOpen && (
        <div className="modal-overlay" onClick={() => setVidPickerOpen(false)}>
          <div className="hb-picker-modal" onClick={(e) => e.stopPropagation()}>
            <div className="hb-modal-header">
              <div className="hb-modal-title-wrap">
                <div className="hb-modal-icon hb-modal-icon--video"><Film size={15} color="#6c3fc5" /></div>
                <h3>Select Video</h3>
              </div>
              <button className="hb-modal-close" onClick={() => setVidPickerOpen(false)}><X size={15} /></button>
            </div>
            {loadingVids ? <p className="hb-loading">Loading videos...</p> : (
              <div className="hb-picker-grid">
                {videos.map(v => (
                  <div key={v.id}
                    className={`hb-picker-item${selectedVid?.id === v.id ? " hb-picker-item--sel" : ""}`}
                    onClick={() => { setSelectedVid(v); setVidPickerOpen(false); }}>
                    {videoThumbUrls[v.id]
                      ? <img src={videoThumbUrls[v.id]} alt={v.video_id} />
                      : <div className="hb-picker-ph hb-picker-ph--video"><Film size={18} color="#c5b8f5" /></div>}
                    <p>{v.video_id}</p>
                  </div>
                ))}
                {videos.length === 0 && <p className="hb-picker-empty">No videos in Media Library.</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── DEMO VIDEO PREVIEW MODAL ── */}
      {previewDemo && demoVideo && (
        <div className="modal-overlay" onClick={() => setPreviewDemo(false)}>
          <div className="hb-vid-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="hb-modal-header" style={{ padding: "14px 18px", borderBottom: "1px solid #f0f0f0" }}>
              <div className="hb-modal-title-wrap">
                <div className="hb-modal-icon hb-modal-icon--video"><Film size={15} color="#6c3fc5" /></div>
                <h3>{demoVideo.title}</h3>
              </div>
              <button className="hb-modal-close" onClick={() => setPreviewDemo(false)}><X size={15} /></button>
            </div>
            <div className="hb-vid-wrap">
              <video ref={demoVideoRef} className="hb-vid-player" controls>
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default HomePageBuilder;