import axiosClient from "./axiosClient";

/* ─── COURSES ─── */
export const getCourses = () =>
  axiosClient.get("/admin/course/list");

export const createCourse = (data) =>
  axiosClient.post("/admin/course/create", data);

export const editCourse = (data) =>
  axiosClient.post("/admin/course/edit", data);

/* ─── LESSONS ─── */
export const getLessons = (courseId) =>
  axiosClient.get(`/admin/course/lesson_list?course=${courseId}`);

export const createLesson = (data) =>
  axiosClient.post("/admin/course/lesson_create", data);

export const editLesson = (data) =>
  axiosClient.post("/admin/course/lesson_edit", data);

/* ─── LESSON VIDEOS ─── */
export const getLessonVideos = (detailId) =>
  axiosClient.get(`/admin/course/video_list?detail=${detailId}`);

export const mapVideo = (data) =>
  axiosClient.post("/admin/course/video_map", data);

/* ─── STATUS / DELETE ─── */
// tag: "course" | "detail"
export const courseAction = (tag, action_id, status) =>
  axiosClient.post("/admin/course/action", { tag, action_id, status });

/* ─── WASABI SIGNED URL ─── */
export const getWasabiFile = (path) =>
  axiosClient.get(`/common/wasabi_file?path=${path}`);