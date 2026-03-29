import { useState, useEffect, useRef } from "react";
import "./Courses.css";
import {
  getLessons, createLesson, editLesson,
  getLessonVideos, mapVideo, courseAction, getWasabiFile,
} from "../api/courseApi";
import { getVideos } from "../api/mediaService";
import {
  ArrowLeft, Plus, Pencil, Eye, Trash2, X, Save, Play, Film,
} from "lucide-react";
import toast from "react-hot-toast";

const ManageLessons = ({ course, back }) => {

  /* ── LESSONS ── */
  const [lessons, setLessons]               = useState([]);
  const [loadingLessons, setLoadingLessons] = useState(false);

  /* ── INLINE EDIT ── */
  const [editingId, setEditingId]       = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [savingLesson, setSavingLesson] = useState(false);

  /* ── NEW LESSON ── */
  const [newTitle, setNewTitle]       = useState("");
  const [addingLesson, setAddingLesson] = useState(false);

  /* ── LESSON VIDEOS ── */
  const [activeLesson, setActiveLesson]   = useState(null);
  const [lessonVideos, setLessonVideos]   = useState([]);

  const [loadingVideos, setLoadingVideos] = useState(false);

  /* ── VIDEO PICKER ── */
  const [pickerOpen, setPickerOpen]       = useState(false);
  const [allVideos, setAllVideos]         = useState([]);
  const [pickerThumb, setPickerThumb]     = useState({});
  const [loadingPicker, setLoadingPicker] = useState(false);
  const [previewVideo, setPreviewVideo]     = useState(null);
  const lessonVideoRef = useRef(null);

  /* ── VIDEO PREVIEW ── */

  /* ── VIDEO TITLE PROMPT ── */
  const [selectedVideo, setSelectedVideo]     = useState(null);
  const [videoTitleInput, setVideoTitleInput] = useState("");
  const [titlePromptOpen, setTitlePromptOpen] = useState(false);
  const [mappingVideo, setMappingVideo]       = useState(false);

  /* ── HLS PLAYER FOR LESSON VIDEO PREVIEW ── */
  useEffect(() => {
    if (!previewVideo || !lessonVideoRef.current) return;

    const video = lessonVideoRef.current;
    const src = `https://webplatf.site/${previewVideo.mediaUrl}`;
    const base = previewVideo.mediaUrl.replace("master.m3u8", "");

    if (video._hls) { video._hls.destroy(); video._hls = null; }

    const initPlayer = async () => {
      const variants = ["v0.m3u8", "v1.m3u8", "v2.m3u8"];

      // Get signed URL for master.m3u8
      let masterSignedUrl = null;
      try {
        const masterSigned = await getWasabiFile(previewVideo.mediaUrl);
        masterSignedUrl = masterSigned?.data?.data?.wasabi_url || null;
      } catch { console.error("Failed to get master signed URL"); }

      if (!masterSignedUrl) { video.src = src; video.play().catch(() => {}); return; }

      // Get signed URLs for sub-playlists
      const signedMap = {};
      await Promise.all(variants.map(async (v) => {
        try {
          const r = await getWasabiFile(base + v);
          signedMap[v] = r?.data?.data?.wasabi_url || null;
        } catch { signedMap[v] = null; }
      }));

      // Fetch & patch master playlist using signed URL
      let masterText = "";
      try {
        const masterRes = await fetch(masterSignedUrl);
        masterText = await masterRes.text();
        variants.forEach(v => {
          if (signedMap[v]) masterText = masterText.split(v).join(signedMap[v]);
        });
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
        hls.on(Hls.Events.ERROR, (_, d) => { if (d.fatal) console.error("HLS:", d.type, d.details); });
        video._hls = hls;
        video._blobUrl = blobUrl;
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = blobUrl;
        video.play().catch(() => {});
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
      if (lessonVideoRef.current?._hls) { lessonVideoRef.current._hls.destroy(); lessonVideoRef.current._hls = null; }
      if (lessonVideoRef.current?._blobUrl) { URL.revokeObjectURL(lessonVideoRef.current._blobUrl); }
    };
  }, [previewVideo]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── LOAD LESSONS ── */
  const loadLessons = async () => {
    setLoadingLessons(true);
    try {
      const res = await getLessons(course.id);
      if (res.data.status) setLessons(res.data.data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load lessons");
    } finally { setLoadingLessons(false); }
  };

  useEffect(() => { loadLessons(); }, [course.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── ADD LESSON ── */
  const addLesson = async () => {
    if (!newTitle.trim()) return toast.error("Please enter a lesson title");
    setAddingLesson(true);
    const t = toast.loading("Adding lesson...");
    try {
      const res = await createLesson({ title: newTitle.trim(), course_id: course.id });
      if (res.data.status) {
        setNewTitle("");
        loadLessons();
        toast.success("Lesson added", { id: t });
      } else {
        toast.error(res.data.message || "Failed to create lesson", { id: t });
      }
    } catch (e) {
      toast.error(e.response?.data?.message || "An error occurred", { id: t });
    } finally { setAddingLesson(false); }
  };

  /* ── SAVE EDIT ── */
  const saveEdit = async (lesson) => {
    if (!editingTitle.trim()) return toast.error("Title cannot be empty");
    setSavingLesson(true);
    const t = toast.loading("Saving...");
    try {
      const res = await editLesson({
        details_id: lesson.id,
        title: editingTitle.trim(),
        course_id: course.id,
      });
      if (res.data.status) {
        setEditingId(null);
        loadLessons();
        toast.success("Lesson updated", { id: t });
      } else {
        toast.error(res.data.message || "Failed to save", { id: t });
      }
    } catch (e) {
      toast.error(e.response?.data?.message || "Error saving", { id: t });
    } finally { setSavingLesson(false); }
  };

  /* ── TOGGLE STATUS ── */
  const toggleStatus = async (lesson) => {
    const t = toast.loading("Updating...");
    try {
      await courseAction("detail", lesson.id, !lesson.is_delete);
      loadLessons();
      toast.success("Status updated", { id: t });
    } catch (e) {
      console.error(e);
      toast.error("Update failed", { id: t });
    }
  };

  /* ── DELETE LESSON ── */
  const deleteLesson = async (lesson) => {
    if (!window.confirm("Delete this lesson?")) return;
    const t = toast.loading("Deleting...");
    try {
      await courseAction("detail", lesson.id, true);
      loadLessons();
      toast.success("Lesson deleted", { id: t });
    } catch (e) {
      toast.error("Delete failed", { id: t });
    }
  };

  /* ── LOAD LESSON VIDEOS ── */
  const loadLessonVideos = async (lesson) => {
    setActiveLesson(lesson);
    setLessonVideos([]);
    setLoadingVideos(true);
    try {
      const res = await getLessonVideos(lesson.id);
      if (res.data.status) {
        const data = res.data.data;
        setLessonVideos(data);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load videos");
    } finally { setLoadingVideos(false); }
  };

  /* ── OPEN VIDEO PICKER ── */
  const openVideoPicker = async () => {
    setPickerOpen(true);
    setLoadingPicker(true);
    try {
      const res = await getVideos();
      if (res.data.status) {
        const data = res.data.data;
        const map = {};
        await Promise.all(data.map(async (v) => {
          if (!v.thumbnail) { map[v.id] = null; return; }
          try {
            const r = await getWasabiFile(v.thumbnail);
            map[v.id] = r?.data?.data?.wasabi_url ?? null;
          } catch { map[v.id] = null; }
        }));
        setAllVideos(data);
        setPickerThumb(map);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load videos");
    } finally { setLoadingPicker(false); }
  };

  /* ── SELECT VIDEO → open title prompt ── */
  const selectVideo = (video) => {
    setSelectedVideo(video);
    setVideoTitleInput("");
    setPickerOpen(false);
    setTitlePromptOpen(true);
  };

  /* ── CONFIRM MAP VIDEO ── */
  const confirmMapVideo = async () => {
    if (!selectedVideo || !activeLesson) return;
    if (!videoTitleInput.trim()) return toast.error("Please enter a title for the video");
    setMappingVideo(true);
    const t = toast.loading("Adding video...");
    const payload = {
      details_id: Number(activeLesson.id),
      video_id: Number(selectedVideo.id),
      thumbnail_id: Number(selectedVideo.thumbnail_id) || 1,
      title: videoTitleInput.trim(),
    };
    try {
      const res = await mapVideo(payload);
      if (res.data.status === false) {
        toast.error(res.data.message || "Failed to add video", { id: t });
        return;
      }
      setTitlePromptOpen(false);
      setSelectedVideo(null);
      setVideoTitleInput("");
      await loadLessonVideos(activeLesson);
      toast.success("Video added", { id: t });
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to add video", { id: t });
    } finally { setMappingVideo(false); }
  };

  const fmtDuration = (s) => {
    if (!s && s !== 0) return "—";
    const m = Math.floor(s / 60), sec = s % 60;
    if (m === 0) return `${sec}s`;
    return sec > 0 ? `${m}m ${sec}s` : `${m} min`;
  };

  return (
    <div className="lessons-page">

      {/* GLOBAL LOADER */}
      {(loadingLessons || loadingVideos || loadingPicker) && (
        <div className="global-loader">
          <div className="loader-box">
            <div className="loader-spinner" />
            <p>
              {loadingLessons ? "Loading lessons..." :
               loadingVideos  ? "Loading videos..."  :
               "Loading..."}
            </p>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="lessons-header">
        <button className="back-btn" onClick={back} title="Back to Courses">
          <ArrowLeft size={18} />
        </button>
        <div className="lessons-title-block">
          <h1>{course.title} — Lessons</h1>
          <p className="lessons-sub">{lessons.length} lessons</p>
        </div>
        <div className="lessons-add-row">
          <input
            className="lesson-title-input"
            placeholder="Type your title here..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addLesson()}
          />
          <button className="add-lesson-btn" onClick={addLesson} disabled={addingLesson}>
            <Plus size={13} /> {addingLesson ? "Adding..." : "ADD LESSON"}
          </button>
        </div>
      </div>

      {/* ── LESSONS TABLE ── */}
      <div className="lessons-container">
        <table className="lesson-table">
          <thead>
            <tr>
              <th>Title</th>
              <th className="col-dur-th">Videos</th>
              <th className="col-actions-th">Actions</th>
            </tr>
          </thead>
          <tbody>
            {lessons.length === 0 ? (
              <tr><td colSpan="3" className="empty-cell">No lessons yet. Add your first lesson above.</td></tr>
            ) : lessons.map((lesson) => (
              <tr key={lesson.id} className={activeLesson?.id === lesson.id ? "lesson-row--active" : ""}>
                <td>
                  {editingId === lesson.id ? (
                    <input className="inline-edit-input"
                      value={editingTitle} autoFocus
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(lesson);
                        if (e.key === "Escape") setEditingId(null);
                      }} />
                  ) : (
                    <span className="lesson-title-text">{lesson.title}</span>
                  )}
                </td>
                <td className="td-sm">
                  <span className="vid-count-badge">{lesson.video_count ?? 0}</span>
                </td>
                <td>
                  <div className="lesson-actions">
                    {editingId === lesson.id ? (
                      <>
                        <button className="act-btn act-save" onClick={() => saveEdit(lesson)} disabled={savingLesson}>
                          <Save size={14} />
                        </button>
                        <button className="act-btn act-cancel" onClick={() => setEditingId(null)}>
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <button className="act-btn act-edit"
                        onClick={() => { setEditingId(lesson.id); setEditingTitle(lesson.title); }}>
                        <Pencil size={14} />
                      </button>
                    )}
                    <button className="act-btn act-view" onClick={() => loadLessonVideos(lesson)}>
                      <Eye size={14} />
                    </button>
                    <label className="switch">
                      <input type="checkbox" checked={!lesson.is_delete}
                        onChange={() => toggleStatus(lesson)} />
                      <span className="slider" />
                    </label>
                    <button className="act-btn act-delete" onClick={() => deleteLesson(lesson)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── VIDEO SECTION ── */}
      {activeLesson && (
        <div className="video-section">
          <div className="video-section-header">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h3 className="video-section-title">Videos — {activeLesson.title}</h3>
              <span className="card-count">{lessonVideos.length}</span>
            </div>
            <button className="add-video-btn" onClick={openVideoPicker}>
              <Plus size={13} /> ADD VIDEO
            </button>
          </div>
          <table className="video-table">
            <thead>
              <tr>
                <th>Title</th>
                <th className="col-dur-th">Duration</th>
                <th className="col-actions-th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {lessonVideos.length === 0 ? (
                <tr><td colSpan="3" className="empty-cell">No videos mapped yet. Click "+ ADD VIDEO".</td></tr>
              ) : lessonVideos.map((v) => (
                <tr key={v.id}>
                  <td className="lesson-title-text">{v.title || v.video_path || "—"}</td>
                  <td className="td-sm">{fmtDuration(v.durations)}</td>
                  <td>
                    <div className="lesson-actions">
                      <button className="act-btn act-view"
                        onClick={() => {
                          if (!v.video_path) return toast.error("No video available");
                          const mediaUrl = `uploads/${v.video_path}/master.m3u8`;
                          setPreviewVideo({ title: v.title || v.video_path, mediaUrl });
                        }}>
                        <Eye size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── VIDEO TITLE PROMPT MODAL ── */}
      {titlePromptOpen && selectedVideo && (
        <div className="modal-overlay" onClick={() => setTitlePromptOpen(false)}>
          <div className="title-prompt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span>Add Video Title</span>
              <button className="modal-close-x" onClick={() => setTitlePromptOpen(false)}><X size={16} /></button>
            </div>
            <div className="prompt-video-preview">
              {pickerThumb[selectedVideo.id]
                ? <img src={pickerThumb[selectedVideo.id]} alt={selectedVideo.video_id} />
                : <div className="prompt-thumb-ph"><Play size={24} color="#aaa" /></div>}
              <span className="prompt-video-name">{selectedVideo.video_id}</span>
            </div>
            <label className="prompt-label">Video Title *</label>
            <input className="prompt-input"
              placeholder="Enter a title for this video..."
              value={videoTitleInput} autoFocus
              onChange={(e) => setVideoTitleInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmMapVideo()} />
            <div className="prompt-buttons">
              <button className="cancel-btn" onClick={() => setTitlePromptOpen(false)}>Cancel</button>
              <button className="save-btn" onClick={confirmMapVideo} disabled={mappingVideo}>
                <Save size={14} /> {mappingVideo ? "Adding..." : "Add Video"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── VIDEO PICKER MODAL ── */}
      {pickerOpen && (
        <div className="modal-overlay" onClick={() => setPickerOpen(false)}>
          <div className="vid-picker-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span>Select Video</span>
              <button className="modal-close-x" onClick={() => setPickerOpen(false)}><X size={16} /></button>
            </div>
            <div className="vid-picker-grid">
              {allVideos.map(v => (
                <div className="vid-picker-card" key={v.id} onClick={() => selectVideo(v)}>
                  <div className="vid-picker-thumb">
                    {pickerThumb[v.id]
                      ? <img src={pickerThumb[v.id]} alt={v.video_id} />
                      : <Play size={22} color="#aaa" />}
                    <div className="vid-picker-overlay"><Eye size={16} color="white" /></div>
                  </div>
                  <p className="vid-picker-label">{v.video_id || "—"}</p>
                </div>
              ))}
              {allVideos.length === 0 && (
                <p style={{ color: "#999", fontSize: 13, gridColumn: "span 3", textAlign: "center" }}>
                  No videos available in Media Library.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── VIDEO PREVIEW MODAL ── */}
      {previewVideo && (
        <div className="modal-overlay" onClick={() => setPreviewVideo(null)}>
          <div className="vid-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vid-preview-topbar">
              <div className="vid-preview-title-wrap">
                <div className="vid-preview-icon"><Film size={15} color="#2f4fd5" /></div>
                <span className="vid-preview-title">{previewVideo.title || previewVideo.mediaUrl?.split("/")[1] || "Video"}</span>
              </div>
              <button className="vid-preview-close" onClick={() => setPreviewVideo(null)}><X size={15} /></button>
            </div>
            <div className="lesson-vid-wrap">
              <video ref={lessonVideoRef} className="lesson-vid-player" controls>
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default ManageLessons;