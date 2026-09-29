/* Local data adapter. Keep data access and lesson normalization out of the UI. */
(() => {
  'use strict';
  window.STUDIO_COURSE_SERVICE = {
    async getCourse(id) {
      if (!Array.isArray(window.STUDIO_COURSES)) throw new Error('Course catalog unavailable');
      const course = window.STUDIO_COURSES.find(item => item.id === id);
      return course ? { ...course, topics: [...course.topics] } : null;
    },
    async getLessons(id) {
      if (!window.STUDIO_LESSONS) throw new Error('Lessons unavailable');
      const course = window.STUDIO_COURSES.find(item => item.id === id);
      const readings = window.STUDIO_LESSONS[id] || [];
      return readings.map((reading, index) => ({
        id: `${id}-${index + 1}`, index, order: index + 1,
        title: course?.topics[index] || reading[0],
        summary: reading[0], format: 'Reading & practice'
      }));
    }
  };
})();
