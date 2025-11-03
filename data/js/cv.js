// Koden ligger inuti (async function) vilket låter dig använda wait och håller
//  variablerna privata och i const state lagras CV-data och filkatergorier 
(async () =>{
  const state ={data:null, filter: 'all'};
//här anropas datan och om datan inte kan anropas så kommer ett felmeddelande ut. 
  async function loadCV () {
    const res = await fetch('./data/cv.json');
    if (!res.ok) throw new Error('Kunde inte läsa data/cv.json');
    return res.json();
  }

  const $header = document.querySelector('#about-heading');
  const $summary = document.querySelector('.aboutme-text');
  const $cvMount = document.querySelector('#cv-mount');

  function appendChildren(parent, ...children) {
    const flat = children.flat(Infinity).filter(c => c != null && c !==false);
    for (const child of flat) {
      if (child instanceof Node) parent.appendChild(child);
      else parent.appendChild(document.createTextNode(String(child)));
    }
  }

  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v])=> {
      if (k === 'class') node.className = v;
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) node.setAttribute(k, v);
    });
    for (const c of children) node.append(c?.nodeType ? c : document.createTextNode(c ?? ''));
    return node;
  }

  function renderHeader(cv) {
    if ($header) $header.textContent = 'CV';
    if ($summary) {
      const lines = [];
      lines.push(cv.summary || '');
      lines.push(`${cv.location} ${cv.contacts?.email  || ''}`);
      $summary.innerHTML = `<p>${lines.filter(Boolean).join('<br>')}</p>`;
    }
  }

  function renderExperience(items) {
    const ul = el('ul', { class: 'list'});
    items.forEach(job => {
      ul.append(
        el('li', {class: 'item reveal' },
          el('header', {class: 'item-head'},
            el('h3', { class: 'role' }, job.role),
            el('span', { class: 'button fulltime' }, job.type || '—'),
            el('p', { class: 'dates' },
              el('time', { datetime: job.start }, fmt(job.start)), ' – ',
              el('time', { datetime: job.end || '' }, fmt(job.end) || 'pågår')
            )
          ),
          el('div', { class: 'meta-wrapper' },
            el('div', { class: 'meta-grid' },
              row('company', job.company),
              row('location', job.location)
            )
          ),
          el('button', { class: 'btn btn-link readmore', onclick: () => openModal(`${job.role} – ${job.company}`, job.description || '—') }, 'Läs mer')
        )
      ); 
    });
    return ul;
  }

  function renderEducation(items) {
    const ul = el('ul', {class: 'list'});
    items.forEach(ed => {
      ul.append(
        el('li', {class: 'item reveal'},
          el('header', {class: 'item-head'},
            el('h3', {class: 'role'}, ed.program),
            el('span', {class: 'button fulltime'}, ed.type || '—'),
            el('p', {class: 'dates'},
              el('time', { datetime: ed.start }, fmt(ed.start)), ' – ',
              el('time', { datetime: ed.end || '' }, fmt(ed.end) || 'pågår')
              
            )
          ),
          el('div', {class: 'meta-wrapper'},
            el('div', {class: 'meta-grid'},
              row('company', ed.school),
              row('location', ed.location)
            )
          ),
          ed.details ? el('p', {class: 'text-stack'}, ed.details) :null
          )
        );
    });
    return ul;
  }
  function row(icon,text) {
    return el('p', {class: 'meta-row', 'data-icon': icon}, text || '—');
  }
  function fmt(s) {
    if (!s) return '';
    // YYYY-MM → kort månad på engelska är ok; kan bytas till sv-SE vid behov
    const parts = s.split('-');
    if (parts.length === 2) {
      const [y, m] = parts;
      const d = new Date(Number(y), Number(m) - 1, 1);
      return d.toLocaleString('sv-SE', { month: 'short', year: 'numeric' });
    }
    return s;
  }

  function renderContent(cv) {
    $cvMount.replaceChildren();

    // Filter-kontroller (All/Work/Edu)
    const controls = el('div', { class: 'cv-controls', role: 'toolbar', 'aria-label': 'Filtrera' },
      chip('Alla', 'all'),
      chip('Arbete', 'experience'),
      chip('Utbildning', 'education')
    );
    $cvMount.append(controls);

    if (state.filter === 'all' || state.filter === 'experience') {
      $cvMount.append(el('h2', {}, 'Work Experience'));
      $cvMount.append(renderExperience(cv.experience || []));
    }
    if (state.filter === 'all' || state.filter === 'education') {
      $cvMount.append(el('h2', {}, 'Education'));
      $cvMount.append(renderEducation(cv.education || []));
    }
    observeReveal();
  }

  function chip(label, key) {
    const btn = el('button', { class: 'chip' + (state.filter === key ? ' active' : ''), onclick: () => {
      state.filter = key;
      renderContent(state.data);
    } }, label);
    return btn;
  }

  // === Interaktivitet 1: Modal (Läs mer) ===
  const modal = document.getElementById('cv-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');
  function openModal(title, body) {
    modalTitle.textContent = title;
    modalBody.textContent = body;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    modal.querySelector('.modal-close').focus();
  }
  function closeModal() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }
  modal?.addEventListener('click', (e) => {
    if (e.target.matches('[data-close], .modal')) closeModal();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // === Interaktivitet 2: Scroll-reveal ===
  let io;
  function observeReveal() {
    io?.disconnect?.();
    io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));
  }

  // Init
  try {
    state.data = await loadCV();
    renderHeader(state.data);
    renderContent(state.data);
  } catch (err) {
    console.error(err);
    $cvMount.textContent = 'Fel: ' + err.message;
  }
})();
  
