// State Management
let tasks = [];
let activeStatusFilter = 'all';
let activeTagFilter = 'all';
let activePriorityFilter = 'all';
let searchQuery = '';
let currentSort = 'dueDate-asc';
let isOnline = navigator.onLine;

const API_BASE = '/api/tasks';

// DOM Elements
const taskListEl = document.getElementById('task-list');
const emptyStateEl = document.getElementById('empty-state');
const searchInputEl = document.getElementById('search-input');
const priorityFilterEl = document.getElementById('priority-filter');
const tagChipsContainerEl = document.getElementById('tag-chips-container');
const sortSelectEl = document.getElementById('sort-select');
const taskModalEl = document.getElementById('task-modal');
const taskFormEl = document.getElementById('task-form');
const networkStatusEl = document.getElementById('network-status');
const networkTextEl = document.getElementById('network-text');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  initNetworkListener();
  loadTasks();
  registerServiceWorker();
});

// Service Worker Registration
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('ServiceWorker registered:', reg.scope))
      .catch(err => console.error('ServiceWorker registration failed:', err));
  }
}

// Network Status Monitor
function initNetworkListener() {
  window.addEventListener('online', () => updateNetworkStatus(true));
  window.addEventListener('offline', () => updateNetworkStatus(false));
  updateNetworkStatus(navigator.onLine);
}

function updateNetworkStatus(online) {
  isOnline = online;
  if (online) {
    networkStatusEl.className = "flex items-center space-x-2 text-xs px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
    networkTextEl.textContent = "オンライン";
    syncOfflineTasks();
  } else {
    networkStatusEl.className = "flex items-center space-x-2 text-xs px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20";
    networkTextEl.textContent = "オフライン (ローカル保存)";
  }
}

// Task Loading Logic
async function loadTasks() {
  // Load local first for immediate render
  const cached = localStorage.getItem('taskcraft_tasks');
  if (cached) {
    try { tasks = JSON.parse(cached); } catch (e) { tasks = []; }
    renderTasks();
  }

  if (isOnline) {
    try {
      const res = await fetch(API_BASE);
      if (res.ok) {
        tasks = await res.json();
        saveLocalTasks();
        renderTasks();
      }
    } catch (err) {
      console.warn('API fetch failed, fallback to offline local store.', err);
    }
  }
}

function saveLocalTasks() {
  localStorage.setItem('taskcraft_tasks', JSON.stringify(tasks));
}

async function syncOfflineTasks() {
  try {
    const res = await fetch(`${API_BASE}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks })
    });
    if (res.ok) {
      const updated = await res.json();
      tasks = updated;
      saveLocalTasks();
      renderTasks();
      showToast('サーバーとデータを同期しました', 'success');
    }
  } catch (err) {
    console.error('Sync failed:', err);
  }
}

// Render Logic
function renderTasks() {
  let filtered = tasks.filter(task => {
    if (activeStatusFilter !== 'all' && task.status !== activeStatusFilter) return false;
    if (activePriorityFilter !== 'all' && task.priority !== activePriorityFilter) return false;
    if (activeTagFilter !== 'all' && (!task.tags || !task.tags.includes(activeTagFilter))) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const titleMatch = task.title.toLowerCase().includes(q);
      const descMatch = (task.description || '').toLowerCase().includes(q);
      if (!titleMatch && !descMatch) return false;
    }
    return true;
  });

  // Sort
  filtered.sort((a, b) => {
    if (currentSort === 'dueDate-asc') return (a.dueDate || '9999') > (b.dueDate || '9999') ? 1 : -1;
    if (currentSort === 'dueDate-desc') return (a.dueDate || '') < (b.dueDate || '') ? 1 : -1;
    if (currentSort === 'priority-desc') {
      const pMap = { high: 3, medium: 2, low: 1 };
      return (pMap[b.priority] || 0) - (pMap[a.priority] || 0);
    }
    if (currentSort === 'createdAt-desc') return new Date(b.createdAt) - new Date(a.createdAt);
    return 0;
  });

  renderStats();
  renderTagsList();

  if (filtered.length === 0) {
    taskListEl.innerHTML = '';
    emptyStateEl.classList.remove('hidden');
    emptyStateEl.classList.add('flex');
    return;
  }

  emptyStateEl.classList.add('hidden');
  emptyStateEl.classList.remove('flex');

  taskListEl.innerHTML = filtered.map(t => createTaskCardHtml(t)).join('');
}

function createTaskCardHtml(task) {
  const priorityBadges = {
    high: '<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20"><i class="fa-solid fa-fire mr-1"></i>高</span>',
    medium: '<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20"><i class="fa-solid fa-minus mr-1"></i>中</span>',
    low: '<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20"><i class="fa-solid fa-arrow-down mr-1"></i>低</span>'
  };

  const statusBadges = {
    pending: '<span class="px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20"><i class="fa-regular fa-clock mr-1"></i>未完了</span>',
    in_progress: '<span class="px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20"><i class="fa-solid fa-spinner animate-spin-slow mr-1"></i>進行中</span>',
    completed: '<span class="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><i class="fa-solid fa-check mr-1"></i>完了</span>'
  };

  const isDone = task.status === 'completed';
  const tagsHtml = (task.tags || []).map(tg => `<span class="text-[10px] bg-slate-800 text-indigo-300 border border-slate-700 px-2 py-0.5 rounded-md">#${escapeHtml(tg)}</span>`).join(' ');

  return `
    <div class="task-card-enter bg-slate-800/70 border border-slate-800 rounded-2xl p-4 transition-all duration-200 hover:border-slate-700 hover:bg-slate-800/90 shadow-md ${isDone ? 'opacity-70' : ''}">
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-start space-x-3 flex-1 min-w-0">
          <button onclick="toggleTaskStatus('${task.id}')" class="mt-0.5 flex-shrink-0 w-6 h-6 rounded-lg border ${isDone ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-600 hover:border-indigo-500'} flex items-center justify-center transition">
            ${isDone ? '<i class="fa-solid fa-check text-xs"></i>' : ''}
          </button>
          <div class="flex-1 min-w-0 space-y-1.5">
            <div class="flex items-center space-x-2 flex-wrap gap-y-1">
              <h3 class="text-sm font-semibold text-slate-100 ${isDone ? 'line-through text-slate-400' : ''} truncate">${escapeHtml(task.title)}</h3>
              ${priorityBadges[task.priority] || ''}
            </div>
            ${task.description ? `<p class="text-xs text-slate-400 line-clamp-2 leading-relaxed">${escapeHtml(task.description)}</p>` : ''}
            <div class="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-400">
              ${task.dueDate ? `<span class="flex items-center gap-1 ${isOverdue(task.dueDate) && !isDone ? 'text-rose-400 font-semibold' : ''}"><i class="fa-regular fa-calendar"></i> ${task.dueDate}</span>` : ''}
              ${tagsHtml ? `<div class="flex flex-wrap gap-1 items-center">${tagsHtml}</div>` : ''}
            </div>
          </div>
        </div>

        <!-- Controls -->
        <div class="flex items-center space-x-2 flex-shrink-0">
          <select onchange="changeStatusSelect('${task.id}', this.value)" class="bg-slate-900 border border-slate-700/80 text-slate-300 rounded-lg text-xs px-2 py-1 outline-none">
            <option value="pending" ${task.status === 'pending' ? 'selected' : ''}>未完了</option>
            <option value="in_progress" ${task.status === 'in_progress' ? 'selected' : ''}>進行中</option>
            <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>完了</option>
          </select>
          <button onclick="openEditModal('${task.id}')" class="text-slate-400 hover:text-indigo-400 p-1.5 rounded-lg hover:bg-slate-700/50 transition">
            <i class="fa-solid fa-pen-to-square text-xs"></i>
          </button>
          <button onclick="deleteTask('${task.id}')" class="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-700/50 transition">
            <i class="fa-solid fa-trash-can text-xs"></i>
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderStats() {
  const total = tasks.length;
  const pending = tasks.filter(t => t.status === 'pending').length;
  const inProgress = tasks.filter(t => t.status === 'in_progress').length;
  const completed = tasks.filter(t => t.status === 'completed').length;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-pending').textContent = pending;
  document.getElementById('stat-in-progress').textContent = inProgress;
  document.getElementById('stat-completed-rate').textContent = `${rate}%`;
}

function renderTagsList() {
  const allTags = new Set();
  tasks.forEach(t => (t.tags || []).forEach(tg => allTags.add(tg)));
  
  let html = `<button onclick="setTagFilter('all')" class="px-2 py-0.5 rounded-md text-[11px] ${activeTagFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}">すべて</button>`;
  
  allTags.forEach(tg => {
    const active = activeTagFilter === tg;
    html += `<button onclick="setTagFilter('${escapeHtml(tg)}')" class="px-2 py-0.5 rounded-md text-[11px] ${active ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}">#${escapeHtml(tg)}</button>`;
  });
  
  tagChipsContainerEl.innerHTML = html;
}

// Event Listeners
function setupEventListeners() {
  // Status Filter Tabs
  document.querySelectorAll('.filter-status-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-status-btn').forEach(b => b.classList.remove('active-tab', 'bg-indigo-900', 'text-indigo-200'));
      e.target.classList.add('active-tab');
      activeStatusFilter = e.target.getAttribute('data-filter-status');
      renderTasks();
    });
  });

  // Search Input
  searchInputEl.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    renderTasks();
  });

  // Priority Filter
  priorityFilterEl.addEventListener('change', (e) => {
    activePriorityFilter = e.target.value;
    renderTasks();
  });

  // Sort Select
  sortSelectEl.addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderTasks();
  });

  // Modal Triggers
  document.getElementById('open-modal-btn').addEventListener('click', () => openCreateModal());
  document.getElementById('empty-add-btn').addEventListener('click', () => openCreateModal());
  document.getElementById('close-modal-btn').addEventListener('click', closeModal);
  document.getElementById('cancel-modal-btn').addEventListener('click', closeModal);

  // Form Submit
  taskFormEl.addEventListener('submit', handleFormSubmit);
}

function setTagFilter(tag) {
  activeTagFilter = tag;
  renderTasks();
}

// CRUD Actions
async function handleFormSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('task-id').value;
  const title = document.getElementById('task-title').value.trim();
  const description = document.getElementById('task-description').value.trim();
  const priority = document.getElementById('task-priority').value;
  const status = document.getElementById('task-status').value;
  const dueDate = document.getElementById('task-duedate').value;
  const rawTags = document.getElementById('task-tags').value;
  const tags = rawTags ? rawTags.split(',').map(t => t.trim()).filter(Boolean) : [];

  if (!title) return;

  if (id) {
    // Edit
    const task = tasks.find(t => t.id === id);
    if (task) {
      task.title = title;
      task.description = description;
      task.priority = priority;
      task.status = status;
      task.dueDate = dueDate;
      task.tags = tags;
      task.updatedAt = new Date().toISOString();
      
      if (isOnline) {
        fetch(`${API_BASE}/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(task)
        }).catch(err => console.error(err));
      }
      showToast('タスクを更新しました', 'info');
    }
  } else {
    // Create
    const newTask = {
      id: Date.now().toString(),
      title,
      description,
      priority,
      status,
      dueDate,
      tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    tasks.unshift(newTask);

    if (isOnline) {
      fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask)
      }).catch(err => console.error(err));
    }
    showToast('新しいタスクを作成しました', 'success');
  }

  saveLocalTasks();
  renderTasks();
  closeModal();
}

async function toggleTaskStatus(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  task.status = task.status === 'completed' ? 'pending' : 'completed';
  task.updatedAt = new Date().toISOString();
  saveLocalTasks();
  renderTasks();

  if (isOnline) {
    fetch(`${API_BASE}/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: task.status })
    }).catch(err => console.error(err));
  }
}

async function changeStatusSelect(id, newStatus) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  task.status = newStatus;
  task.updatedAt = new Date().toISOString();
  saveLocalTasks();
  renderTasks();

  if (isOnline) {
    fetch(`${API_BASE}/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    }).catch(err => console.error(err));
  }
}

async function deleteTask(id) {
  if (!confirm('このタスクを削除してもよろしいですか？')) return;
  tasks = tasks.filter(t => t.id !== id);
  saveLocalTasks();
  renderTasks();
  showToast('タスクを削除しました', 'error');

  if (isOnline) {
    fetch(`${API_BASE}/${id}`, { method: 'DELETE' }).catch(err => console.error(err));
  }
}

// Modal Controls
function openCreateModal() {
  document.getElementById('modal-title').innerHTML = '<i class="fa-solid fa-plus text-indigo-400 mr-2"></i>新規タスク追加';
  document.getElementById('task-id').value = '';
  taskFormEl.reset();
  document.getElementById('task-priority').value = 'medium';
  document.getElementById('task-status').value = 'pending';
  taskModalEl.classList.remove('hidden');
  setTimeout(() => {
    taskModalEl.classList.remove('opacity-0');
    taskModalEl.children[0].classList.remove('scale-95');
  }, 10);
}

function openEditModal(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  document.getElementById('modal-title').innerHTML = '<i class="fa-solid fa-pen-to-square text-indigo-400 mr-2"></i>タスクを編集';
  document.getElementById('task-id').value = task.id;
  document.getElementById('task-title').value = task.title;
  document.getElementById('task-description').value = task.description || '';
  document.getElementById('task-priority').value = task.priority || 'medium';
  document.getElementById('task-status').value = task.status || 'pending';
  document.getElementById('task-duedate').value = task.dueDate || '';
  document.getElementById('task-tags').value = (task.tags || []).join(', ');

  taskModalEl.classList.remove('hidden');
  setTimeout(() => {
    taskModalEl.classList.remove('opacity-0');
    taskModalEl.children[0].classList.remove('scale-95');
  }, 10);
}

function closeModal() {
  taskModalEl.classList.add('opacity-0');
  taskModalEl.children[0].classList.add('scale-95');
  setTimeout(() => {
    taskModalEl.classList.add('hidden');
  }, 200);
}

// Utilities
function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  const colors = {
    success: 'bg-emerald-600 text-white',
    error: 'bg-rose-600 text-white',
    info: 'bg-indigo-600 text-white'
  };
  toast.className = `px-4 py-2.5 rounded-xl shadow-lg text-xs font-medium flex items-center space-x-2 transition transform translate-y-2 opacity-0 pointer-events-auto ${colors[type] || colors.info}`;
  toast.innerHTML = `<i class="fa-solid fa-circle-info"></i><span>${escapeHtml(msg)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  }, 10);

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  const today = new Date().toISOString().split('T')[0];
  return dateStr < today;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&< me"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[m] || m);
}