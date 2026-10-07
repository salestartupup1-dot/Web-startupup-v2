import { useEffect } from 'react';

// Shared with the animation and the main menu so every route lands at the same reading point.
export const CINEMA_STATIONS = [
  { key: 'locations', at: 2050, label: 'เลือกทำเล' },
  { key: 'featured', at: 3740, label: 'เลือกประเภทบ้าน' },
  { key: 'map', at: 6480, label: 'แผนที่บ้าน' },
];
const CHAPTERS = [{ key: 'intro', at: 0, label: 'หน้าแรก' }, ...CINEMA_STATIONS];
const END = { key: 'after', label: 'รายละเอียดเพิ่มเติม' };
const ARRIVAL_TOLERANCE = 80;
// Wheel paging: a mouse notch or a real trackpad flick moves one chapter; only a deliberately
// slow scroll stays native so the video can still be read frame by frame.
const WHEEL_FAST_DELTA = 40;     // px in one event — a mouse notch is ~100, slow trackpad drags stay well below
const WHEEL_SLOW_SPEED = 0.35;   // px/ms over WHEEL_WINDOW; below this counts as "very slow"
const WHEEL_WINDOW = 120;        // ms
const WHEEL_GESTURE_GAP = 200;   // quiet ms that separates one scroll action from the next
const WHEEL_LINE_PX = 40;        // Firefox reports lines instead of pixels
// Touch paging depends on distance, never speed: a slow swipe must work as well as a flick.
const TOUCH_PAGE_DISTANCE = 32;

const wheelDeltaY = event => {
  if (event.deltaMode === 1) return event.deltaY * WHEEL_LINE_PX;
  if (event.deltaMode === 2) return event.deltaY * window.innerHeight;
  return event.deltaY;
};

// Dropdowns, modals and other inner scrollers keep their own wheel behaviour.
function wheelBelongsElsewhere(target, dy) {
  if (!(target instanceof Element)) return false;
  if (target.closest('[role="dialog"], [aria-modal="true"], input, textarea, select, [contenteditable="true"]')) return true;
  for (let node = target; node && node !== document.body; node = node.parentElement) {
    const overflow = getComputedStyle(node).overflowY;
    if ((overflow === 'auto' || overflow === 'scroll') && node.scrollHeight > node.clientHeight + 1) {
      const canMove = dy > 0
        ? node.scrollTop + node.clientHeight < node.scrollHeight - 1
        : node.scrollTop > 0;
      if (canMove) return true;
    }
  }
  return false;
}

const pageScrollLocked = () => [document.documentElement, document.body]
  .some(el => getComputedStyle(el).overflowY === 'hidden');

function focusAfterChapter(section, chapter) {
  if (chapter.key === 'after') {
    const heading = section.nextElementSibling?.querySelector('h1, h2, h3');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
  }
}

export default function CinemaNavigation({ sectionRef, isEditMode }) {
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || isEditMode) return;
    let gesture = null;
    let landingFrame;
    let gliding = false;
    let landedAt = 0;
    const cancel = () => { gesture = null; gliding = false; cancelAnimationFrame(landingFrame); };
    const glideToChapter = chapter => {
      gliding = true;
      const from = window.scrollY;
      const to = section.offsetTop + (chapter.key === 'after' ? section.offsetHeight - 76 : chapter.at);
      const distance = to - from;
      const duration = Math.min(1000, Math.max(450, Math.abs(distance) * 0.3));
      const started = performance.now();
      const frame = now => {
        const progress = Math.min(1, (now - started) / duration);
        // Continuous velocity at both ends avoids a jolt when the finger lifts or the scene lands.
        const eased = progress * progress * (3 - 2 * progress);
        window.scrollTo({ top: from + distance * eased, behavior: 'instant' });
        if (progress < 1) landingFrame = requestAnimationFrame(frame);
        else { gliding = false; landedAt = performance.now(); focusAfterChapter(section, chapter); }
      };
      landingFrame = requestAnimationFrame(frame);
    };
    const chapterFrom = (distance, direction) => (direction > 0
      ? CHAPTERS.find(chapter => chapter.at > distance + ARRIVAL_TOLERANCE) || END
      : CHAPTERS.filter(chapter => chapter.at < distance - ARRIVAL_TOLERANCE).at(-1));

    let lastWheelAt = 0;
    let wheelGestureOpen = false;   // the current scroll action has already moved a chapter
    let previousWheel = 0;
    let wheelSamples = [];
    const onWheel = event => {
      const now = performance.now();
      const gap = now - lastWheelAt;
      lastWheelAt = now;
      const dy = wheelDeltaY(event);
      const size = Math.abs(dy);
      const rising = size >= WHEEL_FAST_DELTA && size > previousWheel * 1.5;
      previousWheel = size;
      // A touch glide yields to any wheel input, as before.
      if (gliding && !wheelGestureOpen) cancel();
      if (event.defaultPrevented || event.ctrlKey || !dy || Math.abs(event.deltaX) > size) return;

      // One scroll action moves one chapter: swallow the rest of it, including trackpad
      // momentum, until the wheel goes quiet or a fresh flick starts after landing.
      if (wheelGestureOpen) {
        if (gliding || (gap < WHEEL_GESTURE_GAP && !(rising && now - landedAt > 250))) {
          event.preventDefault();
          return;
        }
        wheelGestureOpen = false;
      }
      if (gap >= WHEEL_GESTURE_GAP) wheelSamples = [];
      wheelSamples = wheelSamples.filter(sample => now - sample.at < WHEEL_WINDOW);
      wheelSamples.push({ at: now, size });
      const speed = wheelSamples.reduce((sum, sample) => sum + sample.size, 0) / WHEEL_WINDOW;
      if (size < WHEEL_FAST_DELTA && speed < WHEEL_SLOW_SPEED) return;

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || pageScrollLocked()) return;
      if (wheelBelongsElsewhere(event.target, dy)) return;
      const distance = window.scrollY - section.offsetTop;
      const endAt = section.offsetHeight - 76;
      if (distance < -ARRIVAL_TOLERANCE) return;
      if (dy > 0 && distance >= endAt - ARRIVAL_TOLERANCE) return;
      if (dy < 0 && distance > endAt + ARRIVAL_TOLERANCE) return;
      const destination = chapterFrom(distance, Math.sign(dy));
      if (!destination) return;
      event.preventDefault();
      wheelGestureOpen = true;
      wheelSamples = [];
      cancel();
      glideToChapter(destination);
    };
    const start = event => {
      cancel();
      wheelGestureOpen = false;
      if (event.touches.length !== 1 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      if (pageScrollLocked()) return;
      if (event.target.closest('[role="dialog"], [aria-modal="true"], input, textarea, select, [contenteditable="true"]')) return;
      for (let node = event.target; node && node !== section; node = node.parentElement) {
        const overflow = getComputedStyle(node).overflowY;
        if ((overflow === 'auto' || overflow === 'scroll') && node.scrollHeight > node.clientHeight + 1) return;
      }
      const distance = window.scrollY - section.offsetTop;
      if (distance < -80 || distance > section.offsetHeight - window.innerHeight) return;
      const touch = event.touches[0];
      gesture = { x: touch.clientX, y: touch.clientY, distance, owned: false };
    };
    const move = event => {
      if (!gesture) return;
      if (event.touches.length !== 1 || pageScrollLocked()) { cancel(); return; }
      const touch = event.touches[0];
      const vertical = gesture.y - touch.clientY;
      const horizontal = gesture.x - touch.clientX;
      if (!gesture.owned) {
        // Decide on the first move, before iOS starts native momentum scrolling.
        // Once a horizontal gesture belongs to a carousel, leave the rest of it alone.
        if (!vertical && !horizontal) return;
        if (Math.abs(vertical) <= Math.abs(horizontal) * 1.3) { gesture = null; return; }
        if (!chapterFrom(gesture.distance, Math.sign(vertical))) { gesture = null; return; }
      }
      if (!event.cancelable) { gesture = null; return; }
      event.preventDefault();
      gesture.owned = true;
      // Follow the finger without allowing the browser's fling to race the landing animation.
      // Bound the preview to adjacent chapters even on a long swipe near a reading point.
      const previous = chapterFrom(gesture.distance, -1)?.at ?? 0;
      const next = chapterFrom(gesture.distance, 1);
      const nextAt = next.key === 'after' ? section.offsetHeight - 76 : next.at;
      const distance = Math.min(nextAt, Math.max(previous, gesture.distance + vertical));
      window.scrollTo({ top: section.offsetTop + distance, behavior: 'instant' });
    };
    const end = event => {
      const initial = gesture;
      gesture = null;
      if (!initial?.owned || event.touches.length || event.changedTouches.length !== 1) return;
      const touch = event.changedTouches[0];
      const vertical = initial.y - touch.clientY;
      const horizontal = initial.x - touch.clientX;
      // Leave taps, horizontal carousels, pinch zoom and tiny reading adjustments alone.
      if (Math.abs(vertical) < TOUCH_PAGE_DISTANCE || Math.abs(vertical) < Math.abs(horizontal) * 1.3) return;
      const destination = chapterFrom(initial.distance, Math.sign(vertical));
      if (!destination) return;
      // Follow the finger, then glide into the reading point; a new input cancels immediately.
      glideToChapter(destination);
    };
    // Capture also sees page swipes beginning over Leaflet, which stops bubbling touch events.
    section.addEventListener('touchstart', start, { passive: true, capture: true });
    section.addEventListener('touchmove', move, { passive: false, capture: true });
    section.addEventListener('touchend', end, { passive: true, capture: true });
    section.addEventListener('touchcancel', cancel, { passive: true, capture: true });
    // Must not be passive: a paging wheel event is cancelled so the browser does not scroll too.
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('pointerdown', cancel, { passive: true });
    window.addEventListener('keydown', cancel);
    window.addEventListener('blur', cancel);
    return () => {
      cancel();
      section.removeEventListener('touchstart', start, true);
      section.removeEventListener('touchmove', move, true);
      section.removeEventListener('touchend', end, true);
      section.removeEventListener('touchcancel', cancel, true);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('pointerdown', cancel);
      window.removeEventListener('keydown', cancel);
      window.removeEventListener('blur', cancel);
    };
  }, [sectionRef, isEditMode]);

  return null;
}
