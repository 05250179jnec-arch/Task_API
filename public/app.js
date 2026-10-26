// public/app.js
// Talks to the Express API with fetch(). The browser never touches MySQL directly:
// browser → /tasks (Express) → controller → model → Aiven MySQL

const API = '/tasks';

let tasks = [];   // latest copy of the tasks from the server

// ---------- Elements ----------
const taskList   = document.getElementById('taskList');
const emptyMsg   = document.getElementById('emptyMsg');
const statusEl   = document.getElementById('status');
const toastEl    = document.getElementById('toast');
const addForm    = document.getElementById('addForm');     // NEW
const titleInput = document.getElementById('titleInput');  // NEW

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
    render();
  } catch (err) {
    setStatus(false);
    showToast('Could not load tasks: ' + err.message, true);
  }
}

// NEW: create a task
async function addTask(title) {
  const task = await request(API, {                     // POST /tasks
    method: 'POST',
    body: JSON.stringify({ title }),
  });
  tasks.unshift(task);          // add to the START of the list (newest first)
  render();
  showToast('Task added');
}

// NEW: tick / untick
async function toggleTask(id, completed) {
  const updated = await request(`${API}/${id}`, {       // PATCH /tasks/:id
    method: 'PATCH',
    body: JSON.stringify({ completed }),
  });
  replaceTask(updated);
}

// NEW: delete
async function deleteTask(id) {
  await request(`${API}/${id}`, { method: 'DELETE' });  // DELETE /tasks/:id
  tasks = tasks.filter(t => t.id !== id);
  render();
  showToast('Task deleted');
}

// NEW: swap one task in the array for its updated version
function replaceTask(updated) {
  tasks = tasks.map(t => (t.id === updated.id ? updated : t));
  render();
}

// ---------- Rendering ----------
function render() {
  taskList.innerHTML = '';
  tasks.forEach(t => taskList.appendChild(createTaskItem(t)));
  emptyMsg.hidden = tasks.length > 0;

  const doneCount = tasks.filter(t => t.completed).length;
  document.getElementById('countAll').textContent  = tasks.length;
  document.getElementById('countDone').textContent = doneCount;
  document.getElementById('countOpen').textContent = tasks.length - doneCount;
}

function createTaskItem(task) {
  const done = Boolean(task.completed);

  const li = document.createElement('li');
  li.className = 'task' + (done ? ' is-done' : '');

  // Checkbox → PATCH
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = done;
  checkbox.title = 'Mark as done';
  checkbox.addEventListener('change', () =>                           // NEW
    toggleTask(task.id, checkbox.checked).catch(err => {
      checkbox.checked = !checkbox.checked;   // undo the tick if the API failed
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

  // NEW: action buttons
  const actions = document.createElement('div');
  actions.className = 'task-actions';

  const delBtn = document.createElement('button');
  delBtn.className = 'icon-btn delete';
  delBtn.innerHTML = '✕ <span class="label">Delete</span>';   // our own fixed text, so innerHTML is safe here
  delBtn.addEventListener('click', () => {
    if (confirm(`Delete "${task.title}"?`)) {
      deleteTask(task.id).catch(err => showToast(err.message, true));
    }
  });

  actions.append(delBtn);
  li.append(checkbox, body, actions);
  return li;
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
// NEW: the Add form
addForm.addEventListener('submit', async e => {
  e.preventDefault();                    // stop the browser reloading the page
  const title = titleInput.value.trim();
  if (!title) return;

  const button = addForm.querySelector('button');
  button.disabled = true;                // stop double-clicks creating 2 tasks
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

// ---------- Start ----------
loadTasks();