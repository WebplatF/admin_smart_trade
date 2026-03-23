import { useState, useEffect } from "react";
import "./Courses.css";
import ManageLessons from "./ManageLessons";
import {
  getCourses, createCourse, editCourse,
  courseAction, getWasabiFile,
} from "../api/courseApi";
import { getImages, getWasabiFile as getImgUrl } from "../api/mediaService";
import {
  BookOpen, Plus, Pencil, List,
  X, Save, Image as ImageIcon, Camera,
} from "lucide-react";
import toast from "react-hot-toast";

const Courses = () => {

  const [view, setView] = useState("courses");
  const [selectedCourse, setSelectedCourse] = useState(null);

  /* ── STATE ── */
  const [courses, setCourses] = useState([]);
  const [thumbUrls, setThumbUrls] = useState({});
  const [loading, setLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: "", expert: "", image_id: "" });
  const [formMode, setFormMode] = useState("create");
  const [saving, setSaving] = useState(false);

  const [images, setImages] = useState([]);
  const [imageUrls, setImageUrls] = useState({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedImg, setSelectedImg] = useState(null);

  /* ── LOAD COURSES ── */
  const loadCourses = async () => {
    setLoading(true);

    try {
      const res = await getCourses();

      if (res.data.status) {
        const data = res.data.data;
        setCourses(data);

        const map = {};
        await Promise.all(data.map(async (c) => {
          if (!c.thumbnail_id) { map[c.id] = null; return; }
          try {
            const r = await getWasabiFile(c.thumbnail_id);
            map[c.id] = r?.data?.data?.wasabi_url ?? null;
          } catch { map[c.id] = null; }
        }));

        setThumbUrls(map);
      }

    } catch (e) {
      console.error(e);
      toast.error("Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  /* ── LOAD IMAGES ── */
  const loadImages = async () => {
    try {
      const res = await getImages();

      if (res.data.status) {
        const data = res.data.data;
        setImages(data);

        const map = {};
        await Promise.all(data.map(async (img) => {
          try {
            const r = await getImgUrl(img.media_url);
            map[img.id] = r?.data?.data?.wasabi_url ?? null;
          } catch { map[img.id] = null; }
        }));

        setImageUrls(map);
      }

    } catch (e) {
      console.error(e);
      toast.error("Failed to load images");
    }
  };

  useEffect(() => {
    loadCourses();
    loadImages();
  }, []);

  /* ── FORM ── */
  const openCreate = () => {
    setFormData({ title: "", expert: "", image_id: "" });
    setSelectedImg(null);
    setFormMode("create");
    setShowForm(true);
  };

  const openEdit = (course) => {
    setFormData({
      id: course.id,
      title: course.title,
      expert: course.expert,
      image_id: ""
    });

    setSelectedImg(course.thumbnail_id
      ? { id: null, url: thumbUrls[course.id], path: course.thumbnail_id }
      : null
    );

    setFormMode("edit");
    setShowForm(true);
  };

  /* ── SAVE COURSE ── */
  const saveCourse = async () => {

    if (!formData.title.trim()) {
      toast.error("Course title is required");
      return;
    }

    setSaving(true);

    const toastId = toast.loading(
      formMode === "create" ? "Creating course..." : "Updating course..."
    );

    try {

      const payload = {
        title: formData.title,
        expert: formData.expert,
        image_id: selectedImg?.id || formData.image_id || undefined,
      };

      if (formMode === "edit") {
        payload.course_id = formData.id;
      }

      const res = formMode === "create"
        ? await createCourse(payload)
        : await editCourse(payload);

      if (res.data.status) {

        toast.success(
          formMode === "create" ? "Course created 🎉" : "Course updated ✨",
          { id: toastId }
        );

        setShowForm(false);
        loadCourses();

      } else {
        toast.error(res.data.message || "Failed to save", { id: toastId });
      }

    } catch (e) {
      console.error(e);
      toast.error("Something went wrong", { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  /* ── TOGGLE STATUS ── */
  const toggleStatus = async (course) => {
    try {
      await courseAction("course", course.id, !course.is_delete);
      toast.success("Status updated");
      loadCourses();
    } catch (e) {
      console.error(e);
      toast.error("Failed to update status");
    }
  };

  return (
    <div className="courses-page">

      {/* GLOBAL LOADER */}
      {(loading || saving) && (
        <div className="global-loader">
          <div className="loader-box">
            <div className="loader-spinner"></div>
            <p>Processing...</p>
          </div>
        </div>
      )}

      {/* ── COURSES VIEW ── */}
      {view === "courses" && (
        <>
          <div className="courses-header">
            <div>
              <h1>
                <BookOpen size={22} style={{ marginRight: 8 }} />
                Courses
              </h1>
              <p>Manage your course catalog</p>
            </div>

            <button className="create-btn" onClick={openCreate}>
              <Plus size={14} /> CREATE COURSE
            </button>
          </div>

          {loading ? (
            <p className="loading-text">Loading courses...</p>
          ) : (
            <div className="courses-grid">
              {courses.length === 0 ? (
                <p className="empty-text">No courses yet</p>
              ) : courses.map(course => (
                <div className="course-card" key={course.id}>

                  <div className="course-thumb">
                    {thumbUrls[course.id]
                      ? <img src={thumbUrls[course.id]} alt={course.title} className="course-thumb-img" />
                      : <div className="course-thumb-placeholder"><ImageIcon size={28} color="#bbb" /></div>}
                  </div>

                  <div className="course-info">
                    <h3>{course.title}</h3>
                    <p className="instructor">{course.expert}</p>
                  </div>

                  <div className="course-actions">
                    <button
                      className="lesson-btn"
                      onClick={() => {
                        setSelectedCourse(course);
                        setView("lessons");
                      }}
                    >
                      <List size={14} /> Manage Lessons
                    </button>

                    <button
                      className="edit-btn"
                      onClick={() => openEdit(course)}
                    >
                      <Pencil size={14} /> Edit
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}

          {/* ── FORM ── */}
          {showForm && (
            <div className="course-form-card">
              <div className="form-header">
                <span>{formMode === "create" ? "Create Course" : "Edit Course"}</span>
                <button className="form-close" onClick={() => setShowForm(false)}>
                  <X size={16} />
                </button>
              </div>

              <div className="form-body">

                <label>Course Title *</label>
                <input
                  className="f-inp"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />

                <label>Instructor</label>
                <input
                  className="f-inp"
                  value={formData.expert}
                  onChange={(e) => setFormData({ ...formData, expert: e.target.value })}
                />

                <label>Thumbnail</label>
                <div className="thumbnail-box" onClick={() => setPickerOpen(true)}>
                  {selectedImg?.url ? (
                    <>
                      <img src={selectedImg.url} className="thumb-preview-img" />
                      <div className="thumb-change-overlay">
                        <Camera size={18} color="white" />
                        <span>Change</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <ImageIcon size={24} color="#bbb" />
                      <span>Select Image</span>
                    </>
                  )}
                </div>

                <div className="form-buttons">
                  <button className="cancel-btn" onClick={() => setShowForm(false)}>
                    Cancel
                  </button>

                  <button className="save-btn" onClick={saveCourse} disabled={saving}>
                    <Save size={14} /> {saving ? "Saving..." : "Save"}
                  </button>
                </div>

              </div>
            </div>
          )}
        </>
      )}

      {/* LESSONS */}
      {view === "lessons" && (
        <ManageLessons
          course={selectedCourse}
          back={() => setView("courses")}
        />
      )}

      {/* IMAGE PICKER */}
      {pickerOpen && (
        <div className="modal-overlay" onClick={() => setPickerOpen(false)}>
          <div className="img-picker-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span>Select Thumbnail</span>
              <button onClick={() => setPickerOpen(false)}><X size={16} /></button>
            </div>

            <div className="img-picker-grid">
              {images.map(img => (
                <div
                  key={img.id}
                  className="img-picker-item"
                  onClick={() => {
                    setSelectedImg({ id: img.id, url: imageUrls[img.id] });
                    setFormData(f => ({ ...f, image_id: img.id }));
                    setPickerOpen(false);
                  }}
                >
                  {imageUrls[img.id]
                    ? <img src={imageUrls[img.id]} />
                    : <div className="img-picker-ph"><ImageIcon size={16} /></div>}
                  <p>{img.title}</p>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default Courses;