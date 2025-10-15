// === ui-animations.js ===
// Non-intrusive micro-animation layer and UI glue.
// Safe to load alongside your existing `script.js` — uses event delegation and feature checks.

(function(){
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const body = document.body;

  /* ---------- small helpers ---------- */
  function showToast(text, ms=2500){
    const t = $('#toast');
    if(!t) return;
    t.textContent = text; t.classList.remove('hidden'); t.style.opacity = '1';
    clearTimeout(t._hideT);
    t._hideT = setTimeout(()=>{ t.style.opacity='0'; setTimeout(()=>t.classList.add('hidden'),300); }, ms);
  }

  /* ---------- Intersection reveal ---------- */
  const revealTargets = $$('[data-reveal]');
  if('IntersectionObserver' in window && revealTargets.length){
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if(e.isIntersecting){
          e.target.classList.add('in-view');
          io.unobserve(e.target);
        }
      });
    }, {threshold: 0.12});
    revealTargets.forEach(t => io.observe(t));
  } else {
    // fallback: reveal after small delay
    revealTargets.forEach(t => setTimeout(()=>t.classList.add('in-view'), 200));
  }

  /* ---------- Floating add button opens modal (non-invasive) ---------- */
  const fab = document.getElementById('fabAdd');
  const modal = document.getElementById('recipeModal');
  const openAdd = document.getElementById('openAdd');
  const addBtn = document.getElementById('addRecipeBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const saveRecipeBtn = document.getElementById('saveRecipeBtn');

  function openModal(){
    if(!modal) return;
    modal.classList.remove('hidden');
    setTimeout(()=> modal.querySelector('.modal-content')?.classList.add('modal-open'), 20);
    document.body.style.overflow = 'hidden';
  }
  function closeModal(){ if(!modal) return; modal.querySelector('.modal-content')?.classList.remove('modal-open'); setTimeout(()=>{ modal.classList.add('hidden'); document.body.style.overflow=''; }, 260) }

  fab?.addEventListener('click', openModal);
  openAdd?.addEventListener('click', openModal);
  addBtn?.addEventListener('click', openModal);
  cancelBtn?.addEventListener('click', closeModal);

  // close when clicking overlay
  modal?.addEventListener('click', (ev)=>{
    if(ev.target === modal) closeModal();
  });

  // show toast after saving (non-intrusive — your existing submit likely handles storage)
  const recipeForm = document.getElementById('recipeForm');
  if(recipeForm){
    recipeForm.addEventListener('submit', (ev)=>{
      // allow existing script.js to handle save. just show a toast and close modal.
      setTimeout(()=>{ showToast('Recipe saved'); closeModal(); }, 260);
    });
  }

  /* ---------- card tilt on pointer move (lightweight) ---------- */
  const cardSelector = '.recipe-card';
  const damp = 20; // lower = more tilt
  document.addEventListener('pointermove', (e)=>{
    const cards = $$(cardSelector);
    if(!cards.length) return;
    cards.forEach(card=>{
      const rect = card.getBoundingClientRect();
      const cx = rect.left + rect.width/2;
      const cy = rect.top + rect.height/2;
      const dx = (e.clientX - cx)/rect.width;
      const dy = (e.clientY - cy)/rect.height;
      const dist = Math.hypot(dx,dy);
      // small influence only for close pointers
      if(dist < 0.8){
        const rx = (dy * 10) * (1 - dist);
        const ry = (-dx * 14) * (1 - dist);
        card.style.transform = `perspective(800px) rotateX(${rx/damp}deg) rotateY(${ry/damp}deg) translateZ(${(1-dist)*6}px)`;
      } else {
        card.style.transform = '';
      }
    });
  });
  // reset transform when pointer leaves viewport
  document.addEventListener('pointerleave', ()=> $$(cardSelector).forEach(c=>c.style.transform=''));

  /* ---------- tiny ripple effect for primary buttons ---------- */
  document.addEventListener('click', (e)=>{
    const b = e.target.closest('.btn');
    if(!b) return;
    // create ripple node (short lived)
    const r = document.createElement('span');
    r.style.position='absolute';
    r.style.pointerEvents='none';
    r.style.borderRadius='999px';
    r.style.transform='translate(-50%,-50%)';
    r.style.left = e.clientX - b.getBoundingClientRect().left + 'px';
    r.style.top = e.clientY - b.getBoundingClientRect().top + 'px';
    r.style.width = r.style.height = '8px';
    r.style.opacity = '0.18';
    r.style.background = 'radial-gradient(circle, rgba(255,255,255,0.9), rgba(255,255,255,0.2))';
    r.style.transition = 'width .42s ease-out, height .42s ease-out, opacity .45s ease-out';
    r.className = 'btn-ripple';
    b.style.position = b.style.position || 'relative';
    b.appendChild(r);
    requestAnimationFrame(()=>{ r.style.width='220px'; r.style.height='220px'; r.style.opacity='0'; });
    setTimeout(()=> r.remove(), 520);
  });

  /* ---------- simple theme toggle persisted (light/dark-like) ---------- */
  const themeToggle = document.getElementById('themeToggle');
  const THEME_KEY = 'rb_theme';
  function applyTheme(t){
    if(t === 'light'){
      document.documentElement.style.setProperty('--bg-1','#f8fafc');
      document.documentElement.style.setProperty('--glass','rgba(8,12,20,0.03)');
      document.body.classList.add('light-mode');
    } else {
      document.documentElement.style.setProperty('--bg-1','#0f172a');
      document.documentElement.style.setProperty('--glass','rgba(255,255,255,0.06)');
      document.body.classList.remove('light-mode');
    }
    localStorage.setItem(THEME_KEY, t);
  }
  (function initTheme(){
    const t = localStorage.getItem(THEME_KEY) || 'dark';
    applyTheme(t);
    if(themeToggle) themeToggle.textContent = t === 'dark' ? 'Dark' : 'Light';
  })();
  themeToggle?.addEventListener('click', ()=>{
    const cur = localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
    const next = cur === 'light' ? 'dark' : 'light';
    applyTheme(next);
    themeToggle.textContent = next === 'dark' ? 'Dark' : 'Light';
    showToast(`${next[0].toUpperCase()+next.slice(1)} theme`);
  });

  /* ---------- small accessibility: close modals via ESC ---------- */
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape'){
      closeModal();
      const conf = document.getElementById('confirmationModal');
      if(conf && !conf.classList.contains('hidden')) conf.classList.add('hidden');
    }
  });

  /* ---------- subtle spinner keyframes fallback ---------- */
  const styleSheet = document.createElement('style');
  styleSheet.innerHTML = '@keyframes spin{to{transform:rotate(360deg)}}';
  document.head.appendChild(styleSheet);

  /* ---------- Expose a small API for existing code if needed ---------- */
  window.UI_ANIM = {
    showToast, openModal, closeModal
  };

  // ready notice (comment this out if you don't want console noise)
  // console.debug('UI_ANIM ready');
})();

document.addEventListener("DOMContentLoaded", () => {
  /* ---- Scroll reveal animation ---- */
  const revealEls = document.querySelectorAll("[data-reveal], .reveal-up");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("in-view");
    });
  }, { threshold: 0.15 });
  revealEls.forEach((el) => observer.observe(el));

  /* ---- Button ripple glow ---- */
  document.querySelectorAll(".btn").forEach((btn) => {
    btn.addEventListener("click", function (e) {
      const circle = document.createElement("span");
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      circle.style.width = circle.style.height = `${size}px`;
      circle.style.left = `${e.clientX - rect.left - size / 2}px`;
      circle.style.top = `${e.clientY - rect.top - size / 2}px`;
      circle.className = "ripple";
      this.appendChild(circle);
      setTimeout(() => circle.remove(), 600);
    });
  });

  /* ---- Card 3D tilt ---- */
  document.querySelectorAll(".recipe-card").forEach((card) => {
    card.dataset.tilt = true;
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * 6;
      const rotateY = ((x - centerX) / centerX) * -6;
      card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.04)`;
    });
    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  });

  /* ---- Background floating orbs ---- */
  const orbContainer = document.createElement("div");
  orbContainer.className = "floating-orbs";
  document.body.appendChild(orbContainer);
  for (let i = 0; i < 4; i++) {
    const orb = document.createElement("div");
    orb.className = "orb";
    orb.style.left = `${Math.random() * 100}%`;
    orb.style.top = `${Math.random() * 100}%`;
    orb.style.animationDelay = `${Math.random() * 10}s`;
    orbContainer.appendChild(orb);
  }

  /* ---- Theme fade transition ---- */
  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      document.body.classList.add("theme-fade");
      setTimeout(() => document.body.classList.remove("theme-fade"), 500);
    });
  }
});
