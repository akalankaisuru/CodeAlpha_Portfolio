/* =========================================================
   Portfolio: Isuru Akalanka
   3D background (Three.js) + scroll animations (GSAP)
   ========================================================= */

// ---------- Helpers ----------
const $  = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

const hasGSAP  = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
const hasThree = typeof THREE !== 'undefined';
const calm     = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (hasGSAP) gsap.registerPlugin(ScrollTrigger);

let scene3D = null;   // filled in by initThree()
let particles = null; // star field, moved a little while scrolling

// =========================================================
// 1. TYPING EFFECT (hero role text)
// =========================================================
(function typingEffect() {
  const el = $('#typed-text');
  if (!el) return;

  const roles = [
    'QA Engineer',
    'Software Engineering Undergraduate',
    'Software Tester',
    'Web Developer'
  ];
  let roleIndex = 0;
  let charIndex = 0;
  let deleting = false;

  function tick() {
    const word = roles[roleIndex];

    if (!deleting) {
      charIndex++;
      el.textContent = word.slice(0, charIndex);
      if (charIndex === word.length) {
        deleting = true;
        return setTimeout(tick, 1600); // pause when the word is complete
      }
      return setTimeout(tick, 90);
    }

    charIndex--;
    el.textContent = word.slice(0, charIndex);
    if (charIndex === 0) {
      deleting = false;
      roleIndex = (roleIndex + 1) % roles.length;
      return setTimeout(tick, 400);
    }
    setTimeout(tick, 45);
  }

  tick();
})();

// =========================================================
// 2. NAVBAR, PROGRESS BAR, MOBILE MENU
// =========================================================
const navbar   = $('#navbar');
const progress = $('#progress-bar');
const menuBtn  = $('#menu-toggle');
const navLinks = $('#nav-links');

function onScroll() {
  navbar.classList.toggle('scrolled', window.scrollY > 50);

  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const percent = maxScroll > 0 ? (window.scrollY / maxScroll) * 100 : 0;
  progress.style.width = percent + '%';

  if (particles) particles.position.y = window.scrollY * 0.0006;
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

menuBtn.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', open);
});

$$('.nav-links a').forEach(link => {
  link.addEventListener('click', () => navLinks.classList.remove('open'));
});

function setActiveLink(id) {
  $$('.nav-links a').forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === '#' + id);
  });
}

// =========================================================
// 3. THREE.JS 3D BACKGROUND
// =========================================================
function initThree() {
  const canvas = $('#bg-canvas');
  let renderer;

  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (error) {
    console.warn('WebGL is not available, skipping the 3D background.');
    return null;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    60, window.innerWidth / window.innerHeight, 0.1, 100
  );
  camera.position.z = 6;

  // One shape for each section (the shape morphs as you scroll)
  const geometries = [
    new THREE.IcosahedronGeometry(1.6, 1),          // Home
    new THREE.TorusKnotGeometry(1, 0.32, 120, 16),  // About
    new THREE.OctahedronGeometry(1.7, 1),           // Skills
    new THREE.TorusGeometry(1.3, 0.45, 16, 60),     // Projects
    new THREE.DodecahedronGeometry(1.7, 0),         // Education
    new THREE.SphereGeometry(1.6, 28, 20)           // Contact
  ];

  // What the 3D object does in each section
  const states = [
    { x:  3.2, scale: 1.2, color: 0x38bdf8, opacity: 0.60 }, // Home
    { x: -3.2, scale: 1.1, color: 0xa855f7, opacity: 0.55 }, // About
    { x:  3.2, scale: 1.2, color: 0xec4899, opacity: 0.55 }, // Skills
    { x:  0,   scale: 1.6, color: 0x22d3ee, opacity: 0.22 }, // Projects (faint, cards sit on top)
    { x: -3.2, scale: 1.2, color: 0x818cf8, opacity: 0.55 }, // Education
    { x:  3.2, scale: 1.2, color: 0x38bdf8, opacity: 0.55 }  // Contact
  ];

  // Structure: holder (moves with scroll) > shape (spins) > wire + solid
  const holder = new THREE.Group();
  const shape  = new THREE.Group();

  const wireMat = new THREE.MeshBasicMaterial({
    color: states[0].color, wireframe: true, transparent: true, opacity: states[0].opacity
  });
  const solidMat = new THREE.MeshBasicMaterial({
    color: states[0].color, transparent: true, opacity: 0.07
  });

  const wire  = new THREE.Mesh(geometries[0], wireMat);
  const solid = new THREE.Mesh(geometries[0], solidMat);

  shape.add(solid, wire);
  holder.add(shape);
  scene.add(holder);

  // Floating particles
  const count = 800;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 22;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 22;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 14;
  }
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particleMat = new THREE.PointsMaterial({
    color: states[0].color, size: 0.03, transparent: true, opacity: 0.7
  });
  particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  // Mouse movement tilts the object slightly
  const mouse = { x: 0, y: 0 };
  window.addEventListener('mousemove', event => {
    mouse.x = (event.clientX / window.innerWidth  - 0.5) * 2;
    mouse.y = (event.clientY / window.innerHeight - 0.5) * 2;
  });

  // Animation loop
  const clock = new THREE.Clock();
  const speed = calm ? 0.2 : 1;

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    shape.rotation.x += 0.003 * speed;
    shape.rotation.y += 0.005 * speed;
    shape.position.y = Math.sin(t) * 0.15 * speed;

    holder.rotation.y += (mouse.x * 0.4 - holder.rotation.y) * 0.05;
    holder.rotation.x += (mouse.y * 0.3 - holder.rotation.x) * 0.05;

    particles.rotation.y = t * 0.02 * speed;

    renderer.render(scene, camera);
  }
  animate();

  // Move / morph / recolor the object for a section
  let current = 0;
  let swapTimeline = null;

  function goTo(index, instant = false) {
    current = index;
    const state = states[index];
    const mobile = window.innerWidth < 768;
    const duration = instant ? 0 : 1.4;
    const color = new THREE.Color(state.color);

    // On phones the text is full width, so the object goes to the middle and gets smaller and fainter
    gsap.to(holder.position, { x: mobile ? 0 : state.x, duration, ease: 'power3.inOut' });
    gsap.to(holder.scale, {
      x: mobile ? state.scale * 0.6 : state.scale,
      y: mobile ? state.scale * 0.6 : state.scale,
      z: mobile ? state.scale * 0.6 : state.scale,
      duration, ease: 'power3.inOut'
    });
    gsap.to(wireMat, { opacity: mobile ? state.opacity * 0.6 : state.opacity, duration });
    [wireMat.color, solidMat.color, particleMat.color].forEach(c => {
      gsap.to(c, { r: color.r, g: color.g, b: color.b, duration });
    });

    // Shrink, swap the shape, then grow back
    if (wire.geometry !== geometries[index]) {
      if (instant) {
        wire.geometry = solid.geometry = geometries[index];
      } else {
        if (swapTimeline) swapTimeline.kill();
        swapTimeline = gsap.timeline()
          .to(shape.scale, {
            x: 0, y: 0, z: 0, duration: 0.35, ease: 'back.in(2)',
            onComplete: () => { wire.geometry = solid.geometry = geometries[index]; }
          })
          .to(shape.scale, { x: 1, y: 1, z: 1, duration: 0.7, ease: 'back.out(2)' });
        gsap.to(shape.rotation, { y: '+=3.14', duration: 1.4, ease: 'power2.out' });
      }
    }
  }

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    goTo(current, true);
  });

  return { goTo };
}

if (hasThree && hasGSAP) {
  scene3D = initThree();
  if (scene3D) scene3D.goTo(0, true);
}

// =========================================================
// 4. SCROLL ANIMATIONS (GSAP ScrollTrigger)
// =========================================================
if (hasGSAP) {

  // 4a. Detect which section is on screen: highlights the nav link and changes the 3D object
  $$('section[data-section]').forEach((section, index) => {
    ScrollTrigger.create({
      trigger: section,
      start: 'top 55%',
      end: 'bottom 55%',
      onToggle: self => {
        if (!self.isActive) return;
        setActiveLink(section.id);
        if (scene3D) scene3D.goTo(index);
      }
    });
  });

  if (!calm) {

    // 4b. Hero lines appear one after another
    gsap.from('[data-hero]', {
      y: 40,
      opacity: 0,
      duration: 0.9,
      stagger: 0.15,
      delay: 0.2,
      ease: 'power3.out',
      clearProps: 'transform,opacity'
    });

    // 4c. Hero fades and drifts up while you scroll away
    gsap.to('.hero-content', {
      opacity: 0,
      y: -60,
      ease: 'none',
      scrollTrigger: {
        trigger: '#home',
        start: 'top top',
        end: 'bottom 30%',
        scrub: true
      }
    });

    // 4d. Step-by-step reveal: every [data-anim] element slides in as you reach it
    const offsetFor = el => {
      const type = el.dataset.anim;
      return {
        x: type === 'left' ? -80 : type === 'right' ? 80 : 0,
        y: type === 'up' ? 60 : 0
      };
    };

    const items = $$('[data-anim]');
    gsap.set(items, {
      opacity: 0,
      x: (i, el) => offsetFor(el).x,
      y: (i, el) => offsetFor(el).y
    });

    ScrollTrigger.batch(items, {
      start: 'top 88%',
      onEnter: batch => {
        batch.forEach(el => { el.style.transition = 'none'; }); // CSS hover transitions would fight GSAP
        gsap.to(batch, {
          opacity: 1, x: 0, y: 0,
          duration: 0.9,
          stagger: 0.12,
          ease: 'power3.out',
          overwrite: true,
          onComplete: () => batch.forEach(el => {
            gsap.set(el, { clearProps: 'transform,opacity' });
            el.style.transition = ''; // hover effects work again
          })
        });
      },
      onLeaveBack: batch => {
        batch.forEach(el => { el.style.transition = 'none'; });
        gsap.to(batch, {
          opacity: 0,
          x: (i, el) => offsetFor(el).x,
          y: (i, el) => offsetFor(el).y,
          duration: 0.5,
          overwrite: true
        });
      }
    });
  }

  // 4e. Animated counters (15+, 3, 12+)
  $$('.counter').forEach(counter => {
    const target = Number(counter.dataset.target);
    ScrollTrigger.create({
      trigger: counter,
      start: 'top 90%',
      once: true,
      onEnter: () => {
        const obj = { value: 0 };
        gsap.to(obj, {
          value: target,
          duration: 2,
          ease: 'power1.out',
          onUpdate: () => { counter.textContent = Math.round(obj.value); }
        });
      }
    });
  });

  // Heights change after images and videos load, so recalculate trigger positions
  window.addEventListener('load', () => ScrollTrigger.refresh());
}

// =========================================================
// 5. PROJECT VIDEOS (hover preview + popup)
// =========================================================
const modal = $('#video-modal');
const modalVideo = $('#modal-video');

function openModal(src) {
  modalVideo.src = src;
  modal.classList.add('show');
  document.body.style.overflow = 'hidden';
  modalVideo.play().catch(() => {});
}

function closeModal() {
  modalVideo.pause();
  modalVideo.removeAttribute('src');
  modalVideo.load();
  modal.classList.remove('show');
  document.body.style.overflow = '';
}

$$('.video-wrap').forEach(wrap => {
  const preview = $('video', wrap);

  wrap.addEventListener('mouseenter', () => preview.play().catch(() => {}));
  wrap.addEventListener('mouseleave', () => preview.pause());
  wrap.addEventListener('click', () => openModal(wrap.dataset.video));

  // Keyboard access
  wrap.tabIndex = 0;
  wrap.addEventListener('keydown', event => {
    if (event.key === 'Enter') openModal(wrap.dataset.video);
  });
});

// Touch screens have no hover, so previews play while they are on screen
if (window.matchMedia('(hover: none)').matches && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.play().catch(() => {});
      else entry.target.pause();
    });
  }, { threshold: 0.6 });

  $$('.video-wrap video').forEach(video => observer.observe(video));
}

$('#modal-close').addEventListener('click', closeModal);
modal.addEventListener('click', event => {
  if (event.target === modal) closeModal();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && modal.classList.contains('show')) closeModal();
});

// =========================================================
// 6. CONTACT FORM (opens the visitor's email app)
// =========================================================
const form = $('#contact-form');
const note = $('#form-note');

form.addEventListener('submit', event => {
  event.preventDefault();

  const name = $('#name').value.trim();
  const email = $('#email').value.trim();
  const message = $('#message').value.trim();

  const subject = encodeURIComponent('Portfolio message from ' + name);
  const body = encodeURIComponent(message + '\n\nFrom: ' + name + ' (' + email + ')');

  note.textContent = 'Opening your email app...';
  window.location.href = 'mailto:isuruakalanka28@gmail.com?subject=' + subject + '&body=' + body;

  form.reset();
});