const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'tasks.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper to read tasks
function readTasks() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return [
        {
          id: '1',
          title: 'TaskCraft Proの初期セットアップ',
          description: 'アプリの機能確認およびタスク管理の体験をする。',
          status: 'in_progress',
          priority: 'high',
          tags: ['チュートリアル', '初期設定'],
          dueDate: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: '2',
          title: '週次ミーティング資料準備',
          description: '進捗レポートのまとめとアジェンダ作成',
          status: 'pending',
          priority: 'medium',
          tags: ['仕事', '会議'],
          dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
    }
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading file:', err);
    return [];
  }
}

// Helper to write tasks
function writeTasks(tasks) {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(tasks, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing file:', err);
  }
}

// API Endpoints
app.get('/api/tasks', (req, res) => {
  const tasks = readTasks();
  res.json(tasks);
});

app.post('/api/tasks', (req, res) => {
  const tasks = readTasks();
  const newTask = req.body;
  tasks.unshift(newTask);
  writeTasks(tasks);
  res.status(201).json(newTask);
});

app.put('/api/tasks/:id', (req, res) => {
  let tasks = readTasks();
  const { id } = req.params;
  const updated = req.body;
  tasks = tasks.map(t => t.id === id ? { ...t, ...updated } : t);
  writeTasks(tasks);
  res.json({ success: true, task: updated });
});

app.patch('/api/tasks/:id/status', (req, res) => {
  let tasks = readTasks();
  const { id } = req.params;
  const { status } = req.body;
  let updatedTask = null;
  tasks = tasks.map(t => {
    if (t.id === id) {
      updatedTask = { ...t, status, updatedAt: new Date().toISOString() };
      return updatedTask;
    }
    return t;
  });
  writeTasks(tasks);
  res.json(updatedTask);
});

app.delete('/api/tasks/:id', (req, res) => {
  let tasks = readTasks();
  const { id } = req.params;
  tasks = tasks.filter(t => t.id !== id);
  writeTasks(tasks);
  res.json({ success: true, id });
});

app.post('/api/tasks/sync', (req, res) => {
  const clientTasks = req.body.tasks || [];
  writeTasks(clientTasks);
  res.json(clientTasks);
});

// SPA Fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`TaskCraft Pro server running on http://localhost:${PORT}`);
});