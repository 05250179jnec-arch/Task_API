// public/app.js
// Talks to the Express API with fetch(). The browser never touches MySQL directly:
// browser → /tasks (Express) → controller → model → Aiven MySQL

const API = '/tasks';

let tasks = [];            // latest copy of the tasks from the server
let currentFilter = 'all'; // NEW: 'all' | 'pending' | 'done'
let editingId = null;      // NEW: id of the task being edited (pauses redraws)

// ---------- Elements ----------
const taskList    = document.getElementById('taskList');
const emptyMsg    = document.getElementById('emptyMsg');
const statusEl    = document.getElementById('status');
const toastEl     = document.getElementById('toast');
const addForm     = document.getElementById('addForm');
const titleInput  = document.getElementById('titleInput');
const searchInput = document.getElementById('searchInput'); // NEW
const refreshBtn  = document.getElementById('refreshBtn');  // NEW

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
    setStatus(true);
    if (editingId === null) render();                   // NEW: don't wipe an open edit box
  } catch (err) {
    setStatus(false);
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
  showToast('Task added');
}

async function toggleTask(id, completed) {
  const updated = await request(`${API}/${id}`, {       // PATCH /tasks/:id
    method: 'PATCH',
    body: JSON.stringify({ completed }),
  });
  replaceTask(updated);
}

// NEW: rename (PUT needs BOTH title and completed)
async function renameTask(id, title) {
  const old = tasks.find(t => t.id === id);
  const updated = await request(`${API}/${id}`, {       // PUT /tasks/:id
    method: 'PUT',
    body: JSON.stringify({ title, completed: Boolean(old.completed) }),
  });
  replaceTask(updated);
  showToast('Task updated');
}

async function deleteTask(id) {
  await request(`${API}/${id}`, { method: 'DELETE' });  // DELETE /tasks/:id
  tasks = tasks.filter(t => t.id !== id);
  render();
  showToast('Task deleted');
}

function replaceTask(updated) {
  tasks = tasks.map(t => (t.id === updated.id ? updated : t));
  render();
}

// ---------- Rendering ----------
function render() {
  const search = searchInput.value.trim().toLowerCase();       // NEW

  // NEW: only show tasks that match the filter AND the search
  const visible = tasks.filter(t => {
    const done = Boolean(t.completed);
    if (currentFilter === 'pending' && done) return false;
    if (currentFilter === 'done' && !done) return false;
    return t.title.toLowerCase().includes(search);
  });

  taskList.innerHTML = '';
  visible.forEach(t => taskList.appendChild(createTaskItem(t)));
  emptyMsg.hidden = visible.length > 0;

  // Counts always use ALL tasks, not just the visible ones
  const doneCount = tasks.filter(t => t.completed).length;
  document.getElementById('countAll').textContent  = tasks.length;
  document.getElementById('countDone').textContent = doneCount;
  document.getElementById('countOpen').textContent = tasks.length - doneCount;
}

function createTaskItem(task) {
  const done = Boolean(task.completed);

  const li = document.createElement('li');
  li.className = 'task' + (done ? ' is-done' : '');

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = done;
  checkbox.title = 'Mark as done';
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
  title.textContent = task.title;
  const meta = document.createElement('p');
  meta.className = 'task-meta';
  meta.textContent = `#${task.id} · created ${formatDate(task.created_at)}`;
  body.append(title, meta);

  const actions = document.createElement('div');
  actions.className = 'task-actions';

  // NEW: edit button
  const editBtn = document.createElement('button');
  editBtn.className = 'icon-btn';
  editBtn.innerHTML = '✎ <span class="label">Edit</span>';
  editBtn.addEventListener('click', () => startEdit(li, task));

  const delBtn = document.createElement('button');
  delBtn.className = 'icon-btn delete';
  delBtn.innerHTML = '✕ <span class="label">Delete</span>';
  delBtn.addEventListener('click', () => {
    if (confirm(`Delete "${task.title}"?`)) {
      deleteTask(task.id).catch(err => showToast(err.message, true));
    }
  });

  actions.append(editBtn, delBtn);
  li.append(checkbox, body, actions);
  return li;
}

// NEW: inline edit — swap the title for a text box. Enter saves, Esc cancels.
function startEdit(li, task) {
  editingId = task.id;
  const body = li.querySelector('.task-body');

  const input = document.createElement('input');
  input.className = 'edit-input';
  input.value = task.title;
  input.maxLength = 255;
  body.replaceChildren(input);
  input.focus();
  input.select();

  let finished = false;               // makes sure we only save once
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
      render();                       // cancelled or unchanged → just redraw
    }
  };

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') finish(true);
    if (e.key === 'Escape') finish(false);
  });
  input.addEventListener('blur', () => finish(true));   // clicking away also saves
}

// ---------- Small helpers ----------
function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleString(undefined, {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function setStatus(ok) {
  statusEl.textContent = ok ? '● Connected' : '● API offline';
  statusEl.className = 'status ' + (ok ? 'status--ok' : 'status--error');
}

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

// NEW: filter buttons
document.querySelectorAll('.filter').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelector('.filter.is-active').classList.remove('is-active');
    btn.classList.add('is-active');
    currentFilter = btn.dataset.filter;   // reads data-filter="..." from the HTML
    render();
  });
});

// NEW: search as you type
searchInput.addEventListener('input', render);

// NEW: manual refresh
refreshBtn.addEventListener('click', () =>
  loadTasks().then(() => showToast('Reloaded from database'))
);

// ---------- Start ----------
loadTasks();

// NEW: re-read the database every 10 s so edits made in MySQL Workbench show up here
setInterval(loadTasks, 10000);