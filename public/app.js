// public/app.js
// Talks to the Express API with fetch(). The browser never touches MySQL directly:
// browser → /tasks (Express) → controller → model → Aiven MySQL

const API = '/tasks';
const RING_LENGTH = 326.7;   // circumference of the progress ring (2 × π × 52)

let tasks = [];              // latest copy of the tasks from the server
let currentFilter = 'all';   // 'all' | 'pending' | 'done'
let editingId = null;        // id of the task being edited (pauses redraws)
let justDoneId = null;       // id of the task just ticked (for a small "pop")

// Title and motivational subtitle for each view
const viewNames = { all: 'All tasks', pending: 'Pending', done: 'Completed' };
const quotes = {
  all:     'Small steps every day add up to big results. 🚀',
  pending: 'A little progress each day adds up. Pick one and begin! 🏃',
  done:    'Look how far you’ve come. Be proud of yourself! 🏆',
};

function viewSubtitle() {
  return quotes[currentFilter];
}

// ---------- Elements ----------
const $ = id => document.getElementById(id);
const addForm      = $('addForm');
const titleInput   = $('titleInput');
const searchInput  = $('searchInput');
const refreshBtn   = $('refreshBtn');
const clearDoneBtn = $('clearDoneBtn');
const themeBtn     = $('themeBtn');
const toastEl      = $('toast');

// ---------- Helper: one place for every API call ----------
async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

// ---------- CRUD functions ----------
async function loadTasks() {
  try {
    tasks = await request(API);                         // GET /tasks
    if (editingId === null) render();
  } catch (err) {
    showToast('Could not load tasks: ' + err.message, true);
  }
}

async function addTask(title) {
  const task = await request(API, {                     // POST /tasks
    method: 'POST',
    body: JSON.stringify({ title }),
  });
  tasks.unshift(task);
  render();
  showToast('✨ Task added');
}

async function toggleTask(id, completed) {
  const updated = await request(`${API}/${id}`, {       // PATCH /tasks/:id
    method: 'PATCH',
    body: JSON.stringify({ completed }),
  });
  if (completed) justDoneId = id;
  replaceTask(updated);

  if (completed && tasks.length > 0 && tasks.every(t => t.completed)) {
    celebrate();
    showToast('🎉 All tasks done. Amazing work!');
  }
}

async function renameTask(id, title) {
  const old = tasks.find(t => t.id === id);
  const updated = await request(`${API}/${id}`, {       // PUT /tasks/:id
    method: 'PUT',
    body: JSON.stringify({ title, completed: Boolean(old.completed) }),
  });
  replaceTask(updated);
  showToast('✏️ Task updated');
}

async function deleteTask(id) {
  await request(`${API}/${id}`, { method: 'DELETE' });  // DELETE /tasks/:id
  tasks = tasks.filter(t => t.id !== id);
  render();
}

// Delete every completed task (one DELETE request each)
async function clearCompleted() {
  const done = tasks.filter(t => t.completed);
  if (done.length === 0) return;
  if (!confirm(`Delete ${done.length} completed task(s)?`)) return;

  try {
    await Promise.all(done.map(t => request(`${API}/${t.id}`, { method: 'DELETE' })));
    showToast(`🧹 Cleared ${done.length} task(s)`);
  } catch (err) {
    showToast(err.message, true);
  }
  loadTasks();
}

function replaceTask(updated) {
  tasks = tasks.map(t => (t.id === updated.id ? updated : t));
  render();
}

// ---------- Rendering ----------
function render() {
  const search = searchInput.value.trim().toLowerCase();
  const matches = tasks.filter(t => t.title.toLowerCase().includes(search));
  const pending = matches.filter(t => !t.completed);
  const done    = matches.filter(t => t.completed);

  // Which columns to show for the current view
  const showPending = currentFilter !== 'done';
  const showDone    = currentFilter !== 'pending';
  $('pendingCol').hidden = !showPending;
  $('doneCol').hidden    = !showDone;
  $('board').classList.toggle('single', !(showPending && showDone));

  fillColumn('pendingList', 'pendingEmpty', pending, search,
    '🌱', 'Nothing to do. Add a task above!', 'All caught up. Enjoy your free time! 🎉');
  fillColumn('doneList', 'doneEmpty', done, search,
    '🏁', 'Nothing completed yet. You can do it!', 'Nothing completed yet. You can do it!');
  justDoneId = null;

  $('pendingCount').textContent = pending.length;
  $('doneCount').textContent = done.length;

  const doneCount = tasks.filter(t => t.completed).length;
  setCount('countAll', tasks.length);
  setCount('countDone', doneCount);
  setCount('countOpen', tasks.length - doneCount);
  clearDoneBtn.disabled = doneCount === 0;

  renderTagList(search);
  updateProgress(doneCount, tasks.length);
  $('viewSub').textContent = viewSubtitle();
}

function fillColumn(listId, emptyId, items, search, icon, emptyText, allDoneText) {
  const list = $(listId);
  const empty = $(emptyId);
  list.innerHTML = '';
  items.forEach((t, i) => {
    const li = createTaskItem(t);
    li.style.animationDelay = Math.min(i * 30, 300) + 'ms';   // gentle cascade
    list.appendChild(li);
  });

  empty.hidden = items.length > 0;
  empty.dataset.icon = search ? '🔍' : icon;
  if (search) empty.textContent = `Nothing matches “${searchInput.value.trim()}”.`;
  else if (listId === 'pendingList' && tasks.length > 0) empty.textContent = allDoneText;
  else empty.textContent = emptyText;
}

// Sidebar list of every #tag with how many tasks use it
function renderTagList(search) {
  const counts = {};
  tasks.forEach(t => {
    (t.title.match(/#[\w-]+/g) || []).forEach(tag => {
      const key = tag.toLowerCase();
      counts[key] = (counts[key] || 0) + 1;
    });
  });

  const box = $('tagList');
  box.innerHTML = '';
  const tags = Object.keys(counts).sort();
  if (tags.length === 0) {
    const hint = document.createElement('span');
    hint.className = 'muted';
    hint.textContent = 'Add #tags to task titles, e.g. #exam';
    box.appendChild(hint);
    return;
  }

  tags.forEach(tag => {
    const chip = document.createElement('span');
    chip.className = 'tag tag--' + tagColour(tag) + (search === tag ? ' is-selected' : '');
    chip.textContent = tag;
    const n = document.createElement('small');
    n.textContent = counts[tag];
    chip.appendChild(n);
    chip.title = search === tag ? 'Click to show all tasks' : `Show ${tag} tasks`;
    chip.addEventListener('click', () => {
      searchInput.value = search === tag ? '' : tag;   // click again to clear
      render();
    });
    box.appendChild(chip);
  });
}

// Update a number and give it a little "bump" when it changes
function setCount(id, value) {
  const el = $(id);
  if (el.textContent !== String(value)) {
    el.textContent = value;
    el.classList.remove('bump');
    void el.offsetWidth;          // restart the animation
    el.classList.add('bump');
  }
}

function updateProgress(done, total) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const ring = $('ringFg');
  ring.style.strokeDashoffset = RING_LENGTH * (1 - pct / 100);
  ring.classList.toggle('is-complete', pct === 100);
  $('progressPct').textContent = pct + '%';
  $('progressBar').style.width = pct + '%';
  document.querySelectorAll('.progress-steps span').forEach(s => {
    s.classList.toggle('is-reached', total > 0 && pct >= Number(s.dataset.step));
  });

  const text = $('progressText');
  if (total === 0)      text.textContent = "Let's get started ✍️";
  else if (pct === 100) text.textContent = 'Everything done. Time for a break ☕';
  else if (pct >= 75)   text.textContent = 'Almost there, keep going! 💪';
  else if (pct >= 40)   text.textContent = `Good progress: ${done} of ${total} done`;
  else if (pct > 0)     text.textContent = `Nice start: ${done} of ${total} done`;
  else                  text.textContent = `${total} task${total > 1 ? 's' : ''} waiting for you`;
}

function createTaskItem(task) {
  const done = Boolean(task.completed);

  const li = document.createElement('li');
  li.className = 'task' + (done ? ' is-done' : '') + (task.id === justDoneId ? ' just-done' : '');

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = done;
  checkbox.title = done ? 'Move back to To do' : 'Mark as done';
  checkbox.addEventListener('change', () =>
    toggleTask(task.id, checkbox.checked).catch(err => {
      checkbox.checked = !checkbox.checked;
      showToast(err.message, true);
    })
  );

  const body = document.createElement('div');
  body.className = 'task-body';

  const title = document.createElement('p');
  title.className = 'task-title';
  title.title = 'Double-click to rename';
  appendTitleWithTags(title, task.title);
  title.addEventListener('dblclick', () => startEdit(li, task));

  const meta = document.createElement('p');
  meta.className = 'task-meta';
  meta.textContent = `#${task.id} · ${timeAgo(task.created_at)}`;
  meta.title = formatDate(task.created_at);
  body.append(title, meta);

  const actions = document.createElement('div');
  actions.className = 'task-actions';

  const editBtn = document.createElement('button');
  editBtn.className = 'icon-btn';
  editBtn.title = 'Rename';
  editBtn.innerHTML = '✎ <span class="label">Edit</span>';
  editBtn.addEventListener('click', () => startEdit(li, task));

  const delBtn = document.createElement('button');
  delBtn.className = 'icon-btn delete';
  delBtn.title = 'Delete';
  delBtn.innerHTML = '✕ <span class="label">Delete</span>';
  delBtn.addEventListener('click', async () => {
    if (!confirm(`Delete "${task.title}"?`)) return;
    li.classList.add('is-leaving');                     // slide out first
    await new Promise(r => setTimeout(r, 250));
    try {
      await deleteTask(task.id);
      showToast('🗑️ Task deleted');
    } catch (err) {
      li.classList.remove('is-leaving');
      showToast(err.message, true);
    }
  });

  actions.append(editBtn, delBtn);
  li.append(checkbox, body, actions);
  return li;
}

// Turn "#words" into coloured, clickable tags (built with textContent, so safe from XSS)
function appendTitleWithTags(el, text) {
  text.split(/(#[\w-]+)/g).forEach(part => {
    if (!part) return;
    if (/^#[\w-]+$/.test(part)) {
      const tag = document.createElement('span');
      tag.className = 'tag tag--' + tagColour(part);
      tag.textContent = part;
      tag.title = `Show all ${part} tasks`;
      tag.addEventListener('click', e => {
        e.stopPropagation();
        searchInput.value = part.toLowerCase();
        render();
      });
      el.appendChild(tag);
    } else {
      el.appendChild(document.createTextNode(part));
    }
  });
}

// Same tag → same colour every time
function tagColour(tag) {
  let sum = 0;
  for (const ch of tag.toLowerCase()) sum += ch.charCodeAt(0);
  return sum % 6;
}

// Inline edit: swap the title for a text box. Enter saves, Esc cancels.
function startEdit(li, task) {
  if (editingId !== null) return;
  editingId = task.id;
  const body = li.querySelector('.task-body');

  const input = document.createElement('input');
  input.className = 'edit-input';
  input.value = task.title;
  input.maxLength = 255;
  body.replaceChildren(input);
  input.focus();
  input.select();

  let finished = false;
  const finish = async (save) => {
    if (finished) return;
    finished = true;
    editingId = null;

    const newTitle = input.value.trim();
    if (save && newTitle && newTitle !== task.title) {
      try {
        await renameTask(task.id, newTitle);
      } catch (err) {
        showToast(err.message, true);
        render();
      }
    } else {
      render();
    }
  };

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') finish(true);
    if (e.key === 'Escape') finish(false);
  });
  input.addEventListener('blur', () => finish(true));
}

// ---------- Fun + helpers ----------
function celebrate() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const colours = ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#38bdf8'];
  for (let i = 0; i < 120; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti';
    piece.style.left = Math.random() * 100 + 'vw';
    piece.style.background = colours[i % colours.length];
    piece.style.setProperty('--drift', (Math.random() * 240 - 120) + 'px');
    piece.style.setProperty('--spin', (Math.random() * 720) + 'deg');
    piece.style.setProperty('--duration', (1.6 + Math.random() * 1.6) + 's');
    piece.style.animationDelay = Math.random() * 0.3 + 's';
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 3800);
  }
}

function setGreeting() {
  const h = new Date().getHours();
  $('greeting').textContent = h < 12 ? 'Good morning ☀️' : h < 17 ? 'Good afternoon 🌤️' : 'Good evening 🌙';
}

// Live clock: updates every second
function updateClock() {
  const now = new Date();
  $('clockTime').textContent = now.toLocaleTimeString(undefined, {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  $('clockDate').textContent = now.toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  if (now.getMinutes() === 0 && now.getSeconds() === 0) setGreeting();
}

// "just now", "5 min ago", "2 h ago", "3 days ago"
function timeAgo(value) {
  if (!value) return '';
  const secs = Math.floor((Date.now() - new Date(value)) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)} min ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)} h ago`;
  const days = Math.floor(secs / 86400);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleString(undefined, {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

// Light / dark mode, remembered in this browser
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeBtn.textContent = theme === 'dark' ? '☀️ Light mode' : '🌙 Dark mode';
}
function loadTheme() {
  let saved = 'light';
  try { saved = localStorage.getItem('theme') || 'light'; } catch {}
  applyTheme(saved);
}
themeBtn.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  try { localStorage.setItem('theme', next); } catch {}
});

let toastTimer;
function showToast(message, isError = false) {
  toastEl.textContent = message;
  toastEl.className = 'toast' + (isError ? ' is-error' : '');
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toastEl.hidden = true), 2500);
}

// ---------- Events ----------
addForm.addEventListener('submit', async e => {
  e.preventDefault();
  const title = titleInput.value.trim();
  if (!title) return;

  const button = addForm.querySelector('button');
  button.disabled = true;
  try {
    await addTask(title);
    titleInput.value = '';
  } catch (err) {
    showToast(err.message, true);
  } finally {
    button.disabled = false;
    titleInput.focus();
  }
});

document.querySelectorAll('.filter').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelector('.filter.is-active').classList.remove('is-active');
    btn.classList.add('is-active');
    currentFilter = btn.dataset.filter;
    $('viewTitle').textContent = viewNames[currentFilter];
    $('viewSub').textContent = viewSubtitle();
    render();
  });
});

searchInput.addEventListener('input', render);
searchInput.addEventListener('keydown', e => {
  if (e.key === 'Escape') { searchInput.value = ''; render(); searchInput.blur(); }
});

refreshBtn.addEventListener('click', async () => {
  refreshBtn.classList.remove('is-spinning');
  void refreshBtn.offsetWidth;
  refreshBtn.classList.add('is-spinning');
  await loadTasks();
  showToast('🔄 Reloaded from database');
});

clearDoneBtn.addEventListener('click', clearCompleted);

// Keyboard shortcuts: N = new task, / = search (ignored while typing in a box)
document.addEventListener('keydown', e => {
  const typing = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
  if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === 'n' || e.key === 'N') { e.preventDefault(); titleInput.focus(); }
  if (e.key === '/') { e.preventDefault(); searchInput.focus(); }
});

// ---------- Start ----------
loadTheme();
setGreeting();
updateClock();
setInterval(updateClock, 1000);
loadTasks();

// Re-read the database every 10 s so edits made in MySQL Workbench show up here
setInterval(loadTasks, 10000);