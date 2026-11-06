// UBITS · Programa de Resellers — interacciones sin librerías.
document.documentElement.classList.add('js');

// Header: fondo sólido al bajar.
const hdr = document.getElementById('hdr');
const onScroll = () => hdr.classList.toggle('solid', window.scrollY > 12);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

// Menú móvil.
const drawer = document.getElementById('drawer');
const burger = document.getElementById('burger');
const setDrawer = (open) => {
  drawer.classList.toggle('open', open);
  drawer.setAttribute('aria-hidden', String(!open));
  burger.setAttribute('aria-expanded', String(open));
  document.body.style.overflow = open ? 'hidden' : '';
};
burger.addEventListener('click', () => setDrawer(true));
document.getElementById('drawerX').addEventListener('click', () => setDrawer(false));
drawer.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setDrawer(false)));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setDrawer(false); });

// Aparición suave al entrar en pantalla.
const rise = document.querySelectorAll('[data-rise]');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const sibs = [...en.target.parentElement.children].filter((n) => n.hasAttribute('data-rise'));
      en.target.style.transitionDelay = Math.min(sibs.indexOf(en.target), 5) * 70 + 'ms';
      en.target.classList.add('in');
      io.unobserve(en.target);
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  rise.forEach((el) => io.observe(el));
} else {
  rise.forEach((el) => el.classList.add('in'));
}

// Formulario: validación y envío a Netlify Forms sin salir de la página.
const form = document.getElementById('applyForm');
const msg = document.getElementById('formMsg');
const legal = msg.textContent;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const fieldOk = (el) => {
  const v = el.value.trim();
  if (el.type === 'email') return EMAIL.test(v);
  if (el.type === 'tel') return v.replace(/\D/g, '').length >= 7;
  return v !== '';
};

form.addEventListener('input', (e) => {
  const el = e.target;
  if (el.classList.contains('bad') && fieldOk(el)) el.classList.remove('bad');
  if (el.name === 'perfil') el.closest('fieldset').classList.remove('bad');
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  let first = null;
  form.querySelectorAll('input[required]:not([type=radio]), select[required]').forEach((el) => {
    const ok = fieldOk(el);
    el.classList.toggle('bad', !ok);
    el.setAttribute('aria-invalid', String(!ok));
    if (!ok && !first) first = el;
  });
  const fs = form.querySelector('fieldset');
  const perfilOk = !!form.querySelector('input[name=perfil]:checked');
  fs.classList.toggle('bad', !perfilOk);
  if (!perfilOk && !first) first = fs.querySelector('input');

  if (first) {
    msg.textContent = 'Revisa los campos marcados en rojo.';
    msg.classList.add('err');
    first.focus();
    return;
  }

  const btn = form.querySelector('button[type=submit]');
  btn.disabled = true;
  msg.classList.remove('err');
  msg.textContent = 'Enviando…';
  try {
    const res = await fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(new FormData(form)).toString(),
    });
    if (!res.ok) throw new Error(String(res.status));
    const name = (form.elements.nombre.value.trim().split(/\s+/)[0] || '');
    form.innerHTML =
      '<div class="okst"><img src="img/glass/glass-tick.png" alt="">' +
      '<b>¡Recibimos tu solicitud' + (name ? ', ' + name.replace(/[<>&"]/g, '') : '') + '!</b>' +
      '<p>Nuestro equipo de partners te escribirá pronto con la tarifa y los siguientes pasos.</p></div>';
  } catch {
    btn.disabled = false;
    msg.textContent = 'No pudimos enviar tu solicitud. Inténtalo de nuevo en un momento.';
    msg.classList.add('err');
  }
});
form.addEventListener('reset', () => { msg.textContent = legal; });
