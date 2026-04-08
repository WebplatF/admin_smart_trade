import { useState, useEffect, useRef } from "react";
import "./HomePageBuilder.css";
import { Image as ImageIcon, X, Plus, Film, Layout, Monitor, Smartphone, Play } from "lucide-react";
import axiosClient from "../api/axiosClient";
import { getImages, getVideos, getWasabiFile } from "../api/mediaService";
import toast from "react-hot-toast";

/* ── API ── */
const getHomeBuilder = ()     => axiosClient.get("/admin/home_builder");
const addBannerApi   = (data) => axiosClient.post("/admin/add_banner", data);
const addDemoApi     = (data) => axiosClient.post("/admin/add_demo", data);
const addWeeklyApi   = (data) => axiosClient.post("/admin/add_weekly", data);

const HomePageBuilder = () => {

  /* ── DATA ── */
  const demoVideoRef = useRef(null);
  const [previewDemo, setPreviewDemo]   = useState(false);
  const [banners, setBanners]           = useState([]);       // all banners
  const [demoVideos, setDemoVideos]     = useState([]);       // up to 4
  const [weeklyVideos, setWeeklyVideos] = useState([]);       // up to 4
  const [itemUrls, setItemUrls]         = useState({});
  const [loading, setLoading]           = useState(false);

  /* ── BANNER MODAL (device: web | mobile) ── */
  const [bannerModal, setBannerModal]   = useState(null);     // null | "web" | "mobile"
  const [bannerTitle, setBannerTitle]   = useState("");
  const [savingBanner, setSavingBanner] = useState(false);
  const [bannerErr, setBannerErr]       = useState("");

  /* ── DEMO VIDEO MULTI-SELECT ── */
  const [demoModal, setDemoModal]       = useState(false);
  const [selectedVids, setSelectedVids] = useState([]);
  const [savingVids, setSavingVids]     = useState(false);
  const [demoErr, setDemoErr]           = useState("");

  /* ── WEEKLY MEETING MULTI-SELECT ── */
  const [weeklyModal, setWeeklyModal]       = useState(false);
  const [selectedWeekly, setSelectedWeekly] = useState([]);
  const [savingWeekly, setSavingWeekly]     = useState(false);
  const [weeklyErr, setWeeklyErr]           = useState("");

  /* ── IMAGE PICKER ── */
  const [imgPickerOpen, setImgPickerOpen] = useState(false);
  const [images, setImages]               = useState([]);
  const [imageUrls, setImageUrls]         = useState({});
  const [selectedImg, setSelectedImg]     = useState(null);
  const [loadingImgs, setLoadingImgs]     = useState(false);

  /* ── VIDEO PICKER (multi-select inside modal) ── */
  const [videos, setVideos]                 = useState([]);
  const [videoThumbUrls, setVideoThumbUrls] = useState({});
  const [loadingVids, setLoadingVids]       = useState(false);

  /* ── HLS PLAYER ── */
  const [activeDemo, setActiveDemo] = useState(null); // demo video to preview

  useEffect(() => {
    if (!activeDemo || !demoVideoRef.current) return;
    const video = demoVideoRef.current;
    const base = `uploads/${activeDemo.video_id}/`;
    const mediaUrl = base + "master.m3u8";
    if (video._hls) { video._hls.destroy(); video._hls = null; }

    const initPlayer = async () => {
      let masterSignedUrl = null;
      try { const r = await getWasabiFile(mediaUrl); masterSignedUrl = r?.data?.data?.wasabi_url; } catch {}
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
        hls.loadSource(blobUrl); hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
        video._hls = hls; video._blobUrl = blobUrl;
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = blobUrl; video.play().catch(() => {});
      }
    };

    if (!window.Hls) {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.4.12/hls.min.js";
      s.onload = initPlayer;
      if (!document.querySelector('script[src*="hls.min.js"]')) document.head.appendChild(s);
      else initPlayer();
    } else { initPlayer(); }

    return () => {
      if (demoVideoRef.current?._hls) { demoVideoRef.current._hls.destroy(); demoVideoRef.current._hls = null; }
      if (demoVideoRef.current?._blobUrl) URL.revokeObjectURL(demoVideoRef.current._blobUrl);
    };
  }, [activeDemo]); // eslint-disable-line

  /* ── LOAD DATA ── */
  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getHomeBuilder();
      if (res.data.status) {
        const raw        = res.data.data;
        const bannerList = raw?.banner       || [];
        const demoList    = raw?.demo_videos    || [];
        const weeklyList  = raw?.weekly_meeting || [];

        // Latest 4 of each
        const latestDemos  = demoList.slice(-4);
        const latestWeekly = weeklyList.slice(-4);

        // Resolve wasabi URLs only for items we actually display
        const map = {};
        await Promise.all([
          // Resolve web banner (even index, latest)
          (async () => {
            const evens = bannerList.filter((_, i) => i % 2 === 0);
            const wb = evens.length > 0 ? evens[evens.length - 1] : null;
            if (!wb?.path) return;
            try { const r = await getWasabiFile(wb.path); map["b_web"] = r?.data?.data?.wasabi_url ?? null; }
            catch { map["b_web"] = null; }
          })(),
          // Resolve mobile banner (odd index, latest)
          (async () => {
            const odds = bannerList.filter((_, i) => i % 2 === 1);
            const mb = odds.length > 0 ? odds[odds.length - 1] : null;
            if (!mb?.path) return;
            try { const r = await getWasabiFile(mb.path); map["b_mobile"] = r?.data?.data?.wasabi_url ?? null; }
            catch { map["b_mobile"] = null; }
          })(),
          ...latestDemos.map(async (v, i) => {
            if (!v.thumbnail) { map[`d_${i}`] = null; return; }
            try { const r = await getWasabiFile(v.thumbnail); map[`d_${i}`] = r?.data?.data?.wasabi_url ?? null; }
            catch { map[`d_${i}`] = null; }
          }),
          ...latestWeekly.map(async (v, i) => {
            if (!v.thumbnail) { map[`w_${i}`] = null; return; }
            try { const r = await getWasabiFile(v.thumbnail); map[`w_${i}`] = r?.data?.data?.wasabi_url ?? null; }
            catch { map[`w_${i}`] = null; }
          }),
        ]);

        setBanners(bannerList);
        setDemoVideos(latestDemos);
        setWeeklyVideos(latestWeekly);
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
    if (images.length > 0) return;
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

  /* ── LOAD VIDEOS FOR PICKER ── */
  const loadVideosForPicker = async () => {
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
    if (!bannerTitle.trim()) return setBannerErr("Title is required.");
    if (!selectedImg) return setBannerErr("Please select an image.");
    setSavingBanner(true); setBannerErr("");
    const t = toast.loading("Saving banner...");
    try {
      const payload = {
        title: bannerTitle.trim(),
        image_id: selectedImg.id,
        device: bannerModal, // "web" or "mobile"
      };
      const res = await addBannerApi(payload);
      if (res.data.status !== false) {
        setBannerModal(null); setBannerTitle(""); setSelectedImg(null);
        setImages([]);
        setItemUrls({}); // clear so thumbnails reload fresh
        await loadData();
        toast.success("Banner saved!", { id: t });
      } else {
        setBannerErr(res.data.message || "Failed.");
        toast.error("Failed", { id: t });
      }
    } catch (e) {
      setBannerErr(e.response?.data?.message || "Error occurred.");
      toast.error("Error", { id: t });
    } finally { setSavingBanner(false); }
  };

  /* ── SAVE DEMO VIDEOS (all selected at once) ── */
  const saveDemoVideos = async () => {
    if (selectedVids.length === 0) return setDemoErr("Please select at least one video.");
    setSavingVids(true); setDemoErr("");
    const t = toast.loading(`Saving ${selectedVids.length} video${selectedVids.length > 1 ? "s" : ""}...`);
    try {
      // Send each selected video sequentially
      for (const vid of selectedVids) {
        await addDemoApi({ title: vid.video_id, video_id: Number(vid.id) });
      }
      setDemoModal(false); setSelectedVids([]);
      setVideos([]);
      setItemUrls({});
      await loadData();
      toast.success(`${selectedVids.length} video${selectedVids.length > 1 ? "s" : ""} added!`, { id: t });
    } catch (e) {
      setDemoErr(e.response?.data?.message || "Error occurred.");
      toast.error("Error saving videos", { id: t });
    } finally { setSavingVids(false); }
  };

  /* ── TOGGLE VIDEO SELECTION ── */
  const toggleVidSelect = (vid) => {
    setSelectedVids(prev => {
      const exists = prev.find(v => v.id === vid.id);
      if (exists) return prev.filter(v => v.id !== vid.id);
      if (prev.length >= 4) { setDemoErr("Maximum 4 videos allowed."); return prev; }
      setDemoErr("");
      return [...prev, vid];
    });
  };

  /* ── SAVE WEEKLY VIDEOS ── */
  const saveWeeklyVideos = async () => {
    if (selectedWeekly.length === 0) return setWeeklyErr("Please select at least one video.");
    setSavingWeekly(true); setWeeklyErr("");
    const t = toast.loading(`Saving ${selectedWeekly.length} video${selectedWeekly.length > 1 ? "s" : ""}...`);
    try {
      for (const vid of selectedWeekly) {
        await addWeeklyApi({ title: vid.video_id, video_id: Number(vid.id) });
      }
      setWeeklyModal(false); setSelectedWeekly([]);
      setVideos([]);
      setItemUrls({});
      await loadData();
      toast.success(`${selectedWeekly.length} video${selectedWeekly.length > 1 ? "s" : ""} added!`, { id: t });
    } catch (e) {
      setWeeklyErr(e.response?.data?.message || "Error occurred.");
      toast.error("Error saving videos", { id: t });
    } finally { setSavingWeekly(false); }
  };

  /* ── TOGGLE WEEKLY SELECTION ── */
  const toggleWeeklySelect = (vid) => {
    setSelectedWeekly(prev => {
      const exists = prev.find(v => v.id === vid.id);
      if (exists) return prev.filter(v => v.id !== vid.id);
      if (prev.length >= 4) { setWeeklyErr("Maximum 4 videos allowed."); return prev; }
      setWeeklyErr("");
      return [...prev, vid];
    });
  };

  // Banners alternate: web added first(even idx 0,2,4..), mobile second(odd idx 1,3,5..)
  // Show the latest of each type
  const evenBanners  = banners.filter((_, i) => i % 2 === 0); // web banners
  const oddBanners   = banners.filter((_, i) => i % 2 === 1); // mobile banners
  const webBanner    = evenBanners.length > 0 ? evenBanners[evenBanners.length - 1] : null;
  const mobileBanner = oddBanners.length  > 0 ? oddBanners[oddBanners.length - 1]  : null;
  // Find actual index in original array for URL lookup
  const webBannerIdx    = webBanner    ? banners.lastIndexOf(webBanner)    : -1;
  const mobileBannerIdx = mobileBanner ? banners.lastIndexOf(mobileBanner) : -1;

  return (
    <div className="builder-page">

      {loading && (
        <div className="global-loader">
          <div className="loader-box">
            <div className="loader-spinner" />
            <p>Loading...</p>
          </div>
        </div>
      )}

      {/* PAGE HEADER */}
      <div className="hb-page-header">
        <div className="hb-page-icon"><Layout size={20} color="#2f4fd5" /></div>
        <div>
          <h1>Home Page Builder</h1>
          <p>Manage homepage content, banners and featured media</p>
        </div>
      </div>

      {/* ══ BANNERS SECTION ══ */}
      <div className="hb-section">
        <div className="hb-section-header">
          <div className="hb-section-title-wrap">
            <ImageIcon size={16} color="#2f4fd5" />
            <h2>Hero Banners</h2>
          </div>
        </div>

        <div className="hb-banners-row">

          {/* WEB BANNER */}
          <div className="hb-device-slot">
            <div className="hb-device-label">
              <Monitor size={14} color="#2f4fd5" />
              <span>Website Banner</span>
            </div>
            {webBanner ? (
              <div className="hb-banner-preview">
                <div className="hb-banner-img-box">
                  {itemUrls["b_web"]
                    ? <img src={itemUrls["b_web"]} alt={webBanner.title} />
                    : <div className="hb-img-ph"><ImageIcon size={28} color="#c5d0f5" /></div>}
                  <span className="hb-device-badge"><Monitor size={10} /> Web</span>
                </div>
                <div className="hb-banner-meta">
                  <span className="hb-banner-name">{webBanner.title}</span>
                  <button className="hb-change-btn" onClick={() => { setBannerErr(""); setBannerTitle(""); setSelectedImg(null); setImages([]); setBannerModal("web"); }}>
                    Change
                  </button>
                </div>
              </div>
            ) : (
              <div className="hb-device-empty" onClick={() => { setBannerErr(""); setBannerTitle(""); setSelectedImg(null); setImages([]); setBannerModal("web"); }}>
                <Plus size={22} color="#c5d0f5" />
                <p>Add Website Banner</p>
              </div>
            )}
          </div>

          {/* MOBILE BANNER */}
          <div className="hb-device-slot">
            <div className="hb-device-label">
              <Smartphone size={14} color="#27ae60" />
              <span>Mobile Banner</span>
            </div>
            {mobileBanner ? (
              <div className="hb-banner-preview">
                <div className="hb-banner-img-box">
                  {itemUrls["b_mobile"]
                    ? <img src={itemUrls["b_mobile"]} alt={mobileBanner.title} />
                    : <div className="hb-img-ph"><ImageIcon size={28} color="#c5d0f5" /></div>}
                  <span className="hb-device-badge hb-device-badge--mobile"><Smartphone size={10} /> Mobile</span>
                </div>
                <div className="hb-banner-meta">
                  <span className="hb-banner-name">{mobileBanner.title}</span>
                  <button className="hb-change-btn hb-change-btn--mobile" onClick={() => { setBannerErr(""); setBannerTitle(""); setSelectedImg(null); setImages([]); setBannerModal("mobile"); }}>
                    Change
                  </button>
                </div>
              </div>
            ) : (
              <div className="hb-device-empty hb-device-empty--mobile" onClick={() => { setBannerErr(""); setBannerTitle(""); setSelectedImg(null); setImages([]); setBannerModal("mobile"); }}>
                <Plus size={22} color="#b8f0d0" />
                <p>Add Mobile Banner</p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ══ DEMO VIDEOS SECTION ══ */}
      <div className="hb-section">
        <div className="hb-section-header">
          <div className="hb-section-title-wrap">
            <Film size={16} color="#6c3fc5" />
            <h2>Demo Videos</h2>
            <span className="hb-count">{demoVideos.length} / 4</span>
          </div>
          <button className="hb-add-btn hb-add-btn--video"
            onClick={() => { setDemoErr(""); setSelectedVids([]); setVideos([]); setDemoModal(true); loadVideosForPicker(); }}>
            <Film size={13} /> {demoVideos.length === 0 ? "ADD VIDEOS" : "MANAGE VIDEOS"}
          </button>
        </div>

        {demoVideos.length === 0 ? (
          <div className="hb-empty">
            <div className="hb-empty-icon hb-empty-icon--video"><Film size={28} color="#c5b8f5" /></div>
            <p className="hb-empty-title">No demo videos added</p>
            <p className="hb-empty-sub">Add up to 4 featured videos for your homepage</p>
            <button className="hb-add-btn hb-add-btn--video" style={{ marginTop: 12 }}
              onClick={() => { setDemoErr(""); setSelectedVids([]); setVideos([]); setDemoModal(true); loadVideosForPicker(); }}>
              <Plus size={13} /> ADD VIDEOS
            </button>
          </div>
        ) : (
          <div className="hb-demo-grid">
            {demoVideos.map((v, i) => (
              <div className="hb-demo-card" key={i}>
                <div className="hb-demo-thumb" onClick={() => setActiveDemo(v)}>
                  {itemUrls[`d_${i}`]
                    ? <img src={itemUrls[`d_${i}`]} alt={v.title} />
                    : <div className="hb-img-ph hb-img-ph--dark"><Film size={28} color="#c5b8f5" /></div>}
                  <div className="hb-demo-overlay">
                    <div className="hb-play-btn"><Play size={16} color="white" fill="white" /></div>
                  </div>
                  <span className="hb-slot-badge">#{i + 1}</span>
                </div>
                <div className="hb-demo-footer">
                  <p className="hb-demo-title">{v.title}</p>
                  <p className="hb-demo-vid-id">{v.video_id}</p>
                </div>
              </div>
            ))}
            {/* Empty slots */}
            {Array.from({ length: 4 - demoVideos.length }).map((_, i) => (
              <div className="hb-demo-card hb-demo-card--empty" key={`empty_${i}`}
                onClick={() => { setDemoErr(""); setSelectedVids([]); setVideos([]); setDemoModal(true); loadVideosForPicker(); }}>
                <div className="hb-demo-thumb hb-demo-thumb--empty">
                  <Plus size={24} color="#c5b8f5" />
                  <p>Add Video</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ══ BANNER MODAL ══ */}
      {bannerModal && (
        <div className="modal-overlay" onClick={() => setBannerModal(null)}>
          <div className="hb-modal" onClick={(e) => e.stopPropagation()}>
            <div className="hb-modal-header">
              <div className="hb-modal-title-wrap">
                <div className={`hb-modal-icon ${bannerModal === "mobile" ? "hb-modal-icon--green" : ""}`}>
                  {bannerModal === "web" ? <Monitor size={15} color="#2f4fd5" /> : <Smartphone size={15} color="#27ae60" />}
                </div>
                <h3>{bannerModal === "web" ? "Website Banner" : "Mobile Banner"}</h3>
              </div>
              <button className="hb-modal-close" onClick={() => setBannerModal(null)}><X size={15} /></button>
            </div>
            {bannerErr && <p className="hb-form-err">{bannerErr}</p>}
            <div className="hb-field">
              <label>Banner Title</label>
              <input className="hb-input" placeholder="Enter banner title..."
                value={bannerTitle} onChange={(e) => setBannerTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveBanner()} />
            </div>
            <div className="hb-field">
              <label>Image <span className="hb-field-hint">{bannerModal === "mobile" ? "(Portrait recommended)" : "(Landscape recommended)"}</span></label>
              <div className={`hb-img-select ${bannerModal === "mobile" ? "hb-img-select--mobile" : ""}`}
                onClick={() => { setImgPickerOpen(true); loadImages(); }}>
                {selectedImg?.url
                  ? <><img src={selectedImg.url} alt="selected" className="hb-img-selected" /><div className="hb-img-change"><span>Click to change</span></div></>
                  : <><ImageIcon size={22} color="#bbb" /><span>Click to select from Media Library</span></>}
              </div>
            </div>
            <div className="hb-modal-footer">
              <button className="hb-cancel-btn" onClick={() => setBannerModal(null)}>Cancel</button>
              <button className={`hb-save-btn ${bannerModal === "mobile" ? "hb-save-btn--green" : ""}`}
                onClick={saveBanner} disabled={savingBanner}>
                {savingBanner ? "Saving..." : "Save Banner"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ DEMO VIDEO MULTI-SELECT MODAL ══ */}
      {demoModal && (
        <div className="modal-overlay" onClick={() => setDemoModal(false)}>
          <div className="hb-demo-select-modal" onClick={(e) => e.stopPropagation()}>
            <div className="hb-demo-modal-header">
              <div className="hb-modal-title-wrap">
                <div className="hb-modal-icon hb-modal-icon--video"><Film size={15} color="#6c3fc5" /></div>
                <div>
                  <h3>Select Demo Videos</h3>
                  <p className="hb-modal-sub">Choose up to 4 videos for your homepage</p>
                </div>
              </div>
              <button className="hb-modal-close" onClick={() => setDemoModal(false)}><X size={15} /></button>
            </div>

            {/* Selection counter */}
            <div className="hb-select-counter">
              <div className="hb-select-slots">
                {[0,1,2,3].map(i => (
                  <div key={i} className={`hb-select-slot${selectedVids[i] ? " hb-select-slot--filled" : ""}`}>
                    {selectedVids[i]
                      ? <><div className="hb-slot-thumb">
                            {videoThumbUrls[selectedVids[i].id]
                              ? <img src={videoThumbUrls[selectedVids[i].id]} alt="" />
                              : <Film size={12} color="#c5b8f5" />}
                          </div>
                          <span>{selectedVids[i].video_id}</span>
                          <button className="hb-slot-remove" onClick={() => toggleVidSelect(selectedVids[i])}>
                            <X size={10} />
                          </button></>
                      : <><div className="hb-slot-empty-icon"><Plus size={14} color="#c5b8f5" /></div>
                          <span>Slot {i + 1}</span></>}
                  </div>
                ))}
              </div>
              <span className="hb-select-count-badge">{selectedVids.length}/4 selected</span>
            </div>

            {demoErr && <p className="hb-form-err" style={{ margin: "0 0 4px" }}>{demoErr}</p>}

            {/* Video grid */}
            {loadingVids ? (
              <div className="hb-picker-loading"><div className="loader-spinner" style={{ width: 28, height: 28, borderWidth: 3 }} /><p>Loading videos...</p></div>
            ) : (
              <div className="hb-demo-picker-grid">
                {videos.map(v => {
                  const isSelected = selectedVids.find(s => s.id === v.id);
                  const selIndex   = selectedVids.findIndex(s => s.id === v.id);
                  const isCompleted = v.media_url && v.media_url.includes("master.m3u8");
                  return (
                    <div key={v.id}
                      className={`hb-demo-picker-card${isSelected ? " hb-demo-picker-card--sel" : ""}${!isCompleted ? " hb-demo-picker-card--pending" : ""}`}
                      onClick={() => isCompleted && toggleVidSelect(v)}>
                      <div className="hb-demo-picker-thumb">
                        {videoThumbUrls[v.id]
                          ? <img src={videoThumbUrls[v.id]} alt={v.video_id} />
                          : <div className="hb-picker-ph hb-picker-ph--video"><Film size={18} color="#c5b8f5" /></div>}
                        {isSelected && (
                          <div className="hb-demo-picker-sel-badge">{selIndex + 1}</div>
                        )}
                        {!isCompleted && <div className="hb-demo-picker-pending">Pending</div>}
                      </div>
                      <div className="hb-demo-picker-info">
                        <p className="hb-demo-picker-id">{v.video_id}</p>
                      </div>
                    </div>
                  );
                })}
                {videos.length === 0 && <p className="hb-picker-empty" style={{ gridColumn: "span 4" }}>No videos in Media Library.</p>}
              </div>
            )}

            <div className="hb-demo-modal-footer">
              <span className="hb-demo-footer-hint">Click videos to select · Click again to deselect</span>
              <div style={{ display:"flex", gap:10 }}>
                <button className="hb-cancel-btn" onClick={() => setDemoModal(false)}>Cancel</button>
                <button className="hb-save-btn hb-save-btn--video" onClick={saveDemoVideos}
                  disabled={savingVids || selectedVids.length === 0}>
                  {savingVids ? "Saving..." : `Add ${selectedVids.length} Video${selectedVids.length !== 1 ? "s" : ""}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ WEEKLY MEETING SECTION ══ */}
      <div className="hb-section">
        <div className="hb-section-header">
          <div className="hb-section-title-wrap">
            <Film size={16} color="#0891b2" />
            <h2>Weekly Meeting</h2>
            <span className="hb-count hb-count--cyan">{weeklyVideos.length} / 4</span>
          </div>
          <button className="hb-add-btn hb-add-btn--cyan"
            onClick={() => { setWeeklyErr(""); setSelectedWeekly([]); setVideos([]); setWeeklyModal(true); loadVideosForPicker(); }}>
            <Film size={13} /> {weeklyVideos.length === 0 ? "ADD VIDEOS" : "MANAGE VIDEOS"}
          </button>
        </div>

        {weeklyVideos.length === 0 ? (
          <div className="hb-empty">
            <div className="hb-empty-icon hb-empty-icon--cyan"><Film size={28} color="#67e8f9" /></div>
            <p className="hb-empty-title">No weekly meeting videos added</p>
            <p className="hb-empty-sub">Add up to 4 weekly meeting videos for your homepage</p>
            <button className="hb-add-btn hb-add-btn--cyan" style={{ marginTop: 12 }}
              onClick={() => { setWeeklyErr(""); setSelectedWeekly([]); setVideos([]); setWeeklyModal(true); loadVideosForPicker(); }}>
              <Plus size={13} /> ADD VIDEOS
            </button>
          </div>
        ) : (
          <div className="hb-demo-grid">
            {weeklyVideos.map((v, i) => (
              <div className="hb-demo-card" key={i}>
                <div className="hb-demo-thumb" onClick={() => setActiveDemo(v)}>
                  {itemUrls[`w_${i}`]
                    ? <img src={itemUrls[`w_${i}`]} alt={v.title} />
                    : <div className="hb-img-ph hb-img-ph--dark"><Film size={28} color="#67e8f9" /></div>}
                  <div className="hb-demo-overlay">
                    <div className="hb-play-btn hb-play-btn--cyan"><Play size={16} color="white" fill="white" /></div>
                  </div>
                  <span className="hb-slot-badge hb-slot-badge--cyan">#{i + 1}</span>
                </div>
                <div className="hb-demo-footer">
                  <p className="hb-demo-title">{v.title}</p>
                  <p className="hb-demo-vid-id">{v.video_id}</p>
                </div>
              </div>
            ))}
            {Array.from({ length: 4 - weeklyVideos.length }).map((_, i) => (
              <div className="hb-demo-card hb-demo-card--empty hb-demo-card--empty-cyan" key={`we_${i}`}
                onClick={() => { setWeeklyErr(""); setSelectedWeekly([]); setVideos([]); setWeeklyModal(true); loadVideosForPicker(); }}>
                <div className="hb-demo-thumb hb-demo-thumb--empty-cyan">
                  <Plus size={24} color="#67e8f9" />
                  <p>Add Video</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ══ WEEKLY MEETING MULTI-SELECT MODAL ══ */}
      {weeklyModal && (
        <div className="modal-overlay" onClick={() => setWeeklyModal(false)}>
          <div className="hb-demo-select-modal" onClick={(e) => e.stopPropagation()}>
            <div className="hb-demo-modal-header">
              <div className="hb-modal-title-wrap">
                <div className="hb-modal-icon hb-modal-icon--cyan"><Film size={15} color="#0891b2" /></div>
                <div>
                  <h3>Select Weekly Meeting Videos</h3>
                  <p className="hb-modal-sub">Choose up to 4 videos for weekly meetings</p>
                </div>
              </div>
              <button className="hb-modal-close" onClick={() => setWeeklyModal(false)}><X size={15} /></button>
            </div>

            <div className="hb-select-counter">
              <div className="hb-select-slots">
                {[0,1,2,3].map(i => (
                  <div key={i} className={`hb-select-slot${selectedWeekly[i] ? " hb-select-slot--filled hb-select-slot--cyan" : ""}`}>
                    {selectedWeekly[i]
                      ? <><div className="hb-slot-thumb">
                            {videoThumbUrls[selectedWeekly[i].id]
                              ? <img src={videoThumbUrls[selectedWeekly[i].id]} alt="" />
                              : <Film size={12} color="#67e8f9" />}
                          </div>
                          <span>{selectedWeekly[i].video_id}</span>
                          <button className="hb-slot-remove hb-slot-remove--cyan" onClick={() => toggleWeeklySelect(selectedWeekly[i])}>
                            <X size={10} />
                          </button></>
                      : <><div className="hb-slot-empty-icon"><Plus size={14} color="#67e8f9" /></div>
                          <span>Slot {i + 1}</span></>}
                  </div>
                ))}
              </div>
              <span className="hb-select-count-badge hb-select-count-badge--cyan">{selectedWeekly.length}/4 selected</span>
            </div>

            {weeklyErr && <p className="hb-form-err" style={{ margin: "0 0 4px" }}>{weeklyErr}</p>}

            {loadingVids ? (
              <div className="hb-picker-loading"><div className="loader-spinner" style={{ width: 28, height: 28, borderWidth: 3 }} /><p>Loading videos...</p></div>
            ) : (
              <div className="hb-demo-picker-grid">
                {videos.map(v => {
                  const isSelected  = selectedWeekly.find(s => s.id === v.id);
                  const selIndex    = selectedWeekly.findIndex(s => s.id === v.id);
                  const isCompleted = v.media_url && v.media_url.includes("master.m3u8");
                  return (
                    <div key={v.id}
                      className={`hb-demo-picker-card${isSelected ? " hb-demo-picker-card--sel hb-demo-picker-card--sel-cyan" : ""}${!isCompleted ? " hb-demo-picker-card--pending" : ""}`}
                      onClick={() => isCompleted && toggleWeeklySelect(v)}>
                      <div className="hb-demo-picker-thumb">
                        {videoThumbUrls[v.id]
                          ? <img src={videoThumbUrls[v.id]} alt={v.video_id} />
                          : <div className="hb-picker-ph hb-picker-ph--video"><Film size={18} color="#67e8f9" /></div>}
                        {isSelected && <div className="hb-demo-picker-sel-badge hb-demo-picker-sel-badge--cyan">{selIndex + 1}</div>}
                        {!isCompleted && <div className="hb-demo-picker-pending">Pending</div>}
                      </div>
                      <div className="hb-demo-picker-info">
                        <p className="hb-demo-picker-id">{v.video_id}</p>
                      </div>
                    </div>
                  );
                })}
                {videos.length === 0 && <p className="hb-picker-empty" style={{ gridColumn: "span 4" }}>No videos in Media Library.</p>}
              </div>
            )}

            <div className="hb-demo-modal-footer">
              <span className="hb-demo-footer-hint">Click videos to select · Click again to deselect</span>
              <div style={{ display:"flex", gap:10 }}>
                <button className="hb-cancel-btn" onClick={() => setWeeklyModal(false)}>Cancel</button>
                <button className="hb-save-btn hb-save-btn--cyan" onClick={saveWeeklyVideos}
                  disabled={savingWeekly || selectedWeekly.length === 0}>
                  {savingWeekly ? "Saving..." : `Add ${selectedWeekly.length} Video${selectedWeekly.length !== 1 ? "s" : ""}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      

      {/* ══ IMAGE PICKER ══ */}
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
                  <div key={img.id} className={`hb-picker-item${selectedImg?.id === img.id ? " hb-picker-item--sel" : ""}`}
                    onClick={() => { setSelectedImg({ id: img.id, url: imageUrls[img.id] }); setImgPickerOpen(false); }}>
                    {imageUrls[img.id] ? <img src={imageUrls[img.id]} alt={img.title} /> : <div className="hb-picker-ph"><ImageIcon size={18} color="#c5d0f5" /></div>}
                    <p>{img.title}</p>
                  </div>
                ))}
                {images.length === 0 && <p className="hb-picker-empty">No images in Media Library.</p>}
              </div>
            )}
          </div>
        </div>
      )}



      {/* ══ VIDEO PREVIEW MODAL ══ */}
      {activeDemo && (
        <div className="modal-overlay" onClick={() => setActiveDemo(null)}>
          <div className="hb-vid-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="hb-vid-preview-header">
              <div className="hb-modal-title-wrap">
                <div className="hb-modal-icon hb-modal-icon--video"><Film size={15} color="#6c3fc5" /></div>
                <div>
                  <h3>{activeDemo.title}</h3>
                  <p className="hb-vid-id">{activeDemo.video_id}</p>
                </div>
              </div>
              <button className="hb-modal-close" onClick={() => setActiveDemo(null)}><X size={15} /></button>
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