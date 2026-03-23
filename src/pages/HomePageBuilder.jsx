import { useState, useEffect } from "react";
import "./HomePageBuilder.css";
import { Pencil, Trash2, Image as ImageIcon, X, Plus } from "lucide-react";
import axiosClient from "../api/axiosClient";
import { getImages, getWasabiFile } from "../api/mediaService";

/* ── API ── */
const getBanners    = ()         => axiosClient.get("/admin/banner_list");
const addBanner     = (data)     => axiosClient.post("/admin/add_banner", data);
const deleteBanner  = (id)       => axiosClient.post(`/admin/banner_delete/${id}`);
const toggleBanner  = (id, status) => axiosClient.post(`/admin/banner_status/${id}`, { status });

const HomePageBuilder = () => {

  /* ── BANNERS ── */
  const [banners, setBanners]       = useState([]);
  const [bannerUrls, setBannerUrls] = useState({});
  const [loading, setLoading]       = useState(false);

  /* ── MODAL ── */
  const [showModal, setShowModal]   = useState(false);
  const [bannerTitle, setBannerTitle] = useState("");
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState("");

  /* ── IMAGE PICKER ── */
  const [pickerOpen, setPickerOpen]   = useState(false);
  const [images, setImages]           = useState([]);
  const [imageUrls, setImageUrls]     = useState({});
  const [selectedImg, setSelectedImg] = useState(null); // { id, url }
  const [loadingImgs, setLoadingImgs] = useState(false);

  /* ── LOAD BANNERS ── */
  const loadBanners = async () => {
    setLoading(true);
    try {
      const res = await getBanners();
      if (res.data.status) {
        const data = res.data.data;
        setBanners(data);
        const map = {};
        await Promise.all(data.map(async (b) => {
          if (!b.image_path) { map[b.id] = null; return; }
          try {
            const r = await getWasabiFile(b.image_path);
            map[b.id] = r?.data?.data?.wasabi_url ?? null;
          } catch { map[b.id] = null; }
        }));
        setBannerUrls(map);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  /* ── LOAD IMAGES FOR PICKER ── */
  const loadImages = async () => {
    setLoadingImgs(true);
    try {
      const res = await getImages();
      if (res.data.status) {
        const data = res.data.data;
        setImages(data);
        const map = {};
        await Promise.all(data.map(async (img) => {
          try {
            const r = await getWasabiFile(img.media_url);
            map[img.id] = r?.data?.data?.wasabi_url ?? null;
          } catch { map[img.id] = null; }
        }));
        setImageUrls(map);
      }
    } catch (e) { console.error(e); }
    finally { setLoadingImgs(false); }
  };

  useEffect(() => { loadBanners(); }, []);

  /* ── OPEN ADD MODAL ── */
  const openAdd = () => {
    setBannerTitle("");
    setSelectedImg(null);
    setFormError("");
    setShowModal(true);
  };

  /* ── SAVE BANNER ── */
  const saveBanner = async () => {
    if (!bannerTitle.trim()) return setFormError("Title is required.");
    if (!selectedImg) return setFormError("Please select an image.");
    setSaving(true); setFormError("");
    try {
      const res = await addBanner({ title: bannerTitle.trim(), image_id: selectedImg.id });
      if (res.data.status) {
        setShowModal(false);
        loadBanners();
      } else {
        setFormError(res.data.message || "Failed to save.");
      }
    } catch (e) {
      setFormError(e.response?.data?.message || "An error occurred.");
    } finally { setSaving(false); }
  };

  /* ── DELETE BANNER ── */
  const handleDelete = async (banner) => {
    if (!window.confirm("Delete this banner?")) return;
    try { await deleteBanner(banner.id); loadBanners(); }
    catch (e) { console.error(e); }
  };

  /* ── TOGGLE STATUS ── */
  const handleToggle = async (banner) => {
    setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, status: !b.status } : b));
    try { await toggleBanner(banner.id, !banner.status); loadBanners(); }
    catch (e) {
      console.error(e);
      setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, status: banner.status } : b));
    }
  };

  return (
    <div className="builder-page">

      {/* HEADER */}
      <div className="builder-header">
        <div>
          <h1>Home Page Builder</h1>
          <p>Hero Banners</p>
        </div>
        <button className="add-banner-btn" onClick={openAdd}>
          <Plus size={13} /> ADD BANNER
        </button>
      </div>

      {/* BANNER LIST */}
      {loading ? (
        <p className="builder-loading">Loading banners...</p>
      ) : banners.length === 0 ? (
        <div className="builder-empty">
          <ImageIcon size={40} color="#ccc" />
          <p>No banners yet. Add your first banner!</p>
        </div>
      ) : (
        <div className="banner-list">
          {banners.map(banner => (
            <div className="banner-card" key={banner.id}>
              <div className="banner-image">
                {bannerUrls[banner.id]
                  ? <img src={bannerUrls[banner.id]} alt={banner.title} className="banner-img" />
                  : <ImageIcon size={36} color="#ccc" />}
              </div>
              <div className="banner-info">
                <div>
                  <h3>{banner.title}</h3>
                  <p>{banner.subtitle || "—"}</p>
                </div>
                <div className="banner-actions">
                  <label className="switch">
                    <input type="checkbox" checked={!!banner.status}
                      onChange={() => handleToggle(banner)} />
                    <span className="slider" />
                  </label>
                  <Trash2 size={18} className="delete-icon"
                    onClick={() => handleDelete(banner)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD BANNER MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="banner-modal" onClick={(e) => e.stopPropagation()}>

            <div className="modal-top">
              <h3>Add Hero Banner</h3>
              <button className="modal-x" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>

            {formError && <p className="form-err">{formError}</p>}

            <label>Title</label>
            <input
              className="b-input"
              placeholder="Enter banner title..."
              value={bannerTitle}
              onChange={(e) => setBannerTitle(e.target.value)}
            />

            <label>Image</label>
            <div className="img-select-box" onClick={() => { setPickerOpen(true); loadImages(); }}>
              {selectedImg?.url
                ? <img src={selectedImg.url} alt="selected" className="selected-img-preview" />
                : <><ImageIcon size={22} color="#bbb" /><span>Click to select image</span></>}
              {selectedImg && (
                <div className="img-change-overlay">
                  <span>Click to change</span>
                </div>
              )}
            </div>

            <div className="modal-buttons">
              <button className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="save-btn" onClick={saveBanner} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* IMAGE PICKER MODAL */}
      {pickerOpen && (
        <div className="modal-overlay" onClick={() => setPickerOpen(false)}>
          <div className="img-picker-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top">
              <h3>Select Image</h3>
              <button className="modal-x" onClick={() => setPickerOpen(false)}><X size={16} /></button>
            </div>
            {loadingImgs ? (
              <p className="builder-loading">Loading images...</p>
            ) : (
              <div className="picker-grid">
                {images.map(img => (
                  <div key={img.id}
                    className={`picker-item${selectedImg?.id === img.id ? " picker-item--sel" : ""}`}
                    onClick={() => {
                      setSelectedImg({ id: img.id, url: imageUrls[img.id] });
                      setPickerOpen(false);
                    }}>
                    {imageUrls[img.id]
                      ? <img src={imageUrls[img.id]} alt={img.title} />
                      : <div className="picker-ph"><ImageIcon size={18} color="#ccc" /></div>}
                    <p>{img.title}</p>
                  </div>
                ))}
                {images.length === 0 && (
                  <p style={{ color: "#999", fontSize: 13, gridColumn: "span 3" }}>
                    No images found. Upload images in Media Library first.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default HomePageBuilder;