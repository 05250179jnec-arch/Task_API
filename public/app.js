// public/app.js
// Talks to the Express API with fetch(). The browser never touches MySQL directly:
// browser → /tasks (Express) → controller → model → Aiven MySQL

const API = '/tasks';

let tasks = [];   // latest copy of the tasks from the server

// ---------- Elements (found by their id in index.html) ----------
const taskList = document.getElementById('taskList');
const emptyMsg = document.getElementById('emptyMsg');
const statusEl = document.getElementById('status');
const toastEl  = document.getElementById('toast');

// ---------- Helper: one place for every API call ----------
async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  // 204 No Content (DELETE) has no body to read
  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

// ---------- Load tasks (GET /tasks) ----------
async function loadTasks() {
  try {
    tasks = await request(API);
    setStatus(true);
    render();
  } catch (err) {
    setStatus(false);
    showToast('Could not load tasks: ' + err.message, true);
  }
}

// ---------- Draw the list ----------
function render() {
  taskList.innerHTML = '';                 // clear the old list
  tasks.forEach(t => taskList.appendChild(createTaskItem(t)));
  emptyMsg.hidden = tasks.length > 0;

  // MySQL returns completed as 0 or 1
  const doneCount = tasks.filter(t => t.completed).length;
  document.getElementById('countAll').textContent  = tasks.length;
  document.getElementById('countDone').textContent = doneCount;
  document.getElementById('countOpen').textContent = tasks.length - doneCount;
}

// Build one <li> for one task
function createTaskItem(task) {
  const done = Boolean(task.completed);    // 1 → true, 0 → false

  const li = document.createElement('li');
  li.className = 'task' + (done ? ' is-done' : '');

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = done;

  const body = document.createElement('div');
  body.className = 'task-body';

  const title = document.createElement('p');
  title.className = 'task-title';
  title.textContent = task.title;          // textContent = safe, shows as plain text

  const meta = document.createElement('p');
  meta.className = 'task-meta';
  meta.textContent = `#${task.id} · created ${formatDate(task.created_at)}`;

  body.append(title, meta);
  li.append(checkbox, body);
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

// ---------- Start ----------
loadTasks();