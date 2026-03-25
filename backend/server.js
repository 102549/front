const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());

let wss = null;
const wsClients = new Set();

const streamVotes = {
  'stream-1': { leftVotes: 12345, rightVotes: 10234 },
  'stream-2': { leftVotes: 5678, rightVotes: 4321 }
};

const mockStreams = [
  {
    id: 'stream-1',
    name: '主直播间',
    url: 'https://live.example.com/stream1',
    type: 'hls',
    description: '主辩论直播间',
    enabled: true,
    createdAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'stream-2',
    name: '分直播间',
    url: 'https://live.example.com/stream2',
    type: 'hls',
    description: '分辩论直播间',
    enabled: true,
    createdAt: '2025-01-01T00:00:00.000Z'
  }
];

const mockJudges = {
  'stream-1': [
    { id: 'judge-1', name: '张教授', role: '主评委', avatar: '', leftVotes: 60, rightVotes: 40 },
    { id: 'judge-2', name: '李老师', role: '嘉宾评委', avatar: '', leftVotes: 50, rightVotes: 50 },
    { id: 'judge-3', name: '王专家', role: '嘉宾评委', avatar: '', leftVotes: 40, rightVotes: 60 }
  ],
  'stream-2': [
    { id: 'judge-1', name: '赵教授', role: '主评委', avatar: '', leftVotes: 70, rightVotes: 30 },
    { id: 'judge-2', name: '钱老师', role: '嘉宾评委', avatar: '', leftVotes: 55, rightVotes: 45 }
  ]
};

const mockDebateFlows = {
  'stream-1': [
    { name: '正方发言', duration: 180, side: 'left', order: 1 },
    { name: '反方发言', duration: 180, side: 'right', order: 2 },
    { name: '正方质问', duration: 120, side: 'left', order: 3 },
    { name: '反方质问', duration: 120, side: 'right', order: 4 },
    { name: '自由辩论', duration: 300, side: 'both', order: 5 },
    { name: '总结陈词', duration: 180, side: 'both', order: 6 }
  ],
  'stream-2': [
    { name: '开场白', duration: 60, side: 'both', order: 1 },
    { name: '正方陈述', duration: 120, side: 'left', order: 2 },
    { name: '反方陈述', duration: 120, side: 'right', order: 3 }
  ]
};

const mockDebateTopic = {
  id: 'debate-default-001',
  title: '如果有一个能一键消除痛苦的按钮，你会按吗？',
  description: '这是一个关于痛苦、成长与人性选择的深度辩论',
  leftPosition: '会按',
  rightPosition: '不会按'
};

const mockUsers = [
  { id: 'user-1', nickname: '张三', avatar: '👤', createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 'user-2', nickname: '李四', avatar: '👤', createdAt: '2025-01-02T00:00:00.000Z' },
  { id: 'user-3', nickname: '王五', avatar: '👤', createdAt: '2025-01-03T00:00:00.000Z' }
];

function broadcast(type, data) {
  if (!wss || wsClients.size === 0) return;
  const message = JSON.stringify({ type, data, timestamp: Date.now() });
  wsClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

function getVotesByStreamId(streamId) {
  if (streamId && streamVotes[streamId]) {
    return streamVotes[streamId];
  }
  let left = 0, right = 0;
  Object.values(streamVotes).forEach(v => {
    left += v.leftVotes;
    right += v.rightVotes;
  });
  return { leftVotes: left, rightVotes: right };
}

app.get('/api/admin/dashboard', (req, res) => {
  const { stream_id } = req.query;
  const votes = getVotesByStreamId(stream_id);
  const total = votes.leftVotes + votes.rightVotes;
  res.json({
    success: true,
    data: {
      totalUsers: mockUsers.length,
      activeUsers: wsClients.size,
      isLive: true,
      streamId: stream_id || 'stream-1',
      totalVotes: total,
      leftVotes: votes.leftVotes,
      rightVotes: votes.rightVotes,
      leftPercentage: total > 0 ? Math.round((votes.leftVotes / total) * 100) : 50,
      rightPercentage: total > 0 ? Math.round((votes.rightVotes / total) * 100) : 50,
      debateTopic: mockDebateTopic
    }
  });
});

app.get('/api/admin/votes', (req, res) => {
  const { stream_id } = req.query;
  const votes = getVotesByStreamId(stream_id);
  const total = votes.leftVotes + votes.rightVotes;
  res.json({
    success: true,
    data: {
      leftVotes: votes.leftVotes,
      rightVotes: votes.rightVotes,
      totalVotes: total,
      leftPercentage: total > 0 ? Math.round((votes.leftVotes / total) * 100) : 50,
      rightPercentage: total > 0 ? Math.round((votes.rightVotes / total) * 100) : 50
    }
  });
});

app.put('/api/admin/votes', (req, res) => {
  const { leftVotes, rightVotes, stream_id } = req.body;
  const sid = stream_id || 'stream-1';
  if (!streamVotes[sid]) {
    streamVotes[sid] = { leftVotes: 0, rightVotes: 0 };
  }
  if (leftVotes !== undefined) streamVotes[sid].leftVotes = leftVotes;
  if (rightVotes !== undefined) streamVotes[sid].rightVotes = rightVotes;
  const votes = streamVotes[sid];
  const total = votes.leftVotes + votes.rightVotes;
  broadcast('votes-updated', {
    leftVotes: votes.leftVotes,
    rightVotes: votes.rightVotes,
    totalVotes: total,
    streamId: sid,
    leftPercentage: total > 0 ? Math.round((votes.leftVotes / total) * 100) : 50,
    rightPercentage: total > 0 ? Math.round((votes.rightVotes / total) * 100) : 50
  });
  res.json({ success: true, data: { leftVotes: votes.leftVotes, rightVotes: votes.rightVotes, totalVotes: total } });
});

app.post('/api/admin/live/update-votes', (req, res) => {
  const { action, leftVotes, rightVotes, streamId } = req.body;
  const sid = streamId || 'stream-1';
  if (!streamVotes[sid]) {
    streamVotes[sid] = { leftVotes: 0, rightVotes: 0 };
  }
  if (action === 'set') {
    streamVotes[sid].leftVotes = leftVotes || 0;
    streamVotes[sid].rightVotes = rightVotes || 0;
  } else if (action === 'add') {
    streamVotes[sid].leftVotes += leftVotes || 0;
    streamVotes[sid].rightVotes += rightVotes || 0;
  } else if (action === 'reset') {
    streamVotes[sid].leftVotes = 0;
    streamVotes[sid].rightVotes = 0;
  }
  const votes = streamVotes[sid];
  const total = votes.leftVotes + votes.rightVotes;
  broadcast('votes-updated', {
    leftVotes: votes.leftVotes,
    rightVotes: votes.rightVotes,
    totalVotes: total,
    streamId: sid,
    leftPercentage: total > 0 ? Math.round((votes.leftVotes / total) * 100) : 50,
    rightPercentage: total > 0 ? Math.round((votes.rightVotes / total) * 100) : 50
  });
  res.json({ success: true, data: votes });
});

app.get('/api/admin/streams', (req, res) => {
  res.json({
    success: true,
    data: {
      streams: mockStreams,
      total: mockStreams.length
    }
  });
});

app.get('/api/admin/judges', (req, res) => {
  const { stream_id } = req.query;
  const sid = stream_id || 'stream-1';
  res.json({
    success: true,
    data: {
      streamId: sid,
      judges: mockJudges[sid] || []
    }
  });
});

app.post('/api/admin/judges', (req, res) => {
  const { stream_id, judges } = req.body;
  const sid = stream_id || 'stream-1';
  mockJudges[sid] = judges || [];
  broadcast('judges-updated', {
    streamId: sid,
    judges: mockJudges[sid],
    timestamp: new Date().toISOString()
  });
  res.json({ success: true, data: { streamId: sid, judges: mockJudges[sid] } });
});

app.get('/api/admin/debate-flow', (req, res) => {
  const { stream_id } = req.query;
  const sid = stream_id || 'stream-1';
  res.json({
    success: true,
    data: {
      streamId: sid,
      flow: mockDebateFlows[sid] || []
    }
  });
});

app.post('/api/admin/debate-flow', (req, res) => {
  const { stream_id, flow } = req.body;
  const sid = stream_id || 'stream-1';
  mockDebateFlows[sid] = flow || [];
  broadcast('debate-flow-updated', {
    streamId: sid,
    flow: mockDebateFlows[sid],
    timestamp: new Date().toISOString()
  });
  res.json({ success: true, data: { streamId: sid, flow: mockDebateFlows[sid] } });
});

app.post('/api/admin/debate-flow/control', (req, res) => {
  const { stream_id, action, segmentIndex } = req.body;
  const sid = stream_id || 'stream-1';
  broadcast('debate-flow-control', {
    streamId: sid,
    action,
    segmentIndex,
    timestamp: new Date().toISOString()
  });
  res.json({ success: true, message: `执行 ${action} 成功`, data: { streamId: sid, action, segmentIndex } });
});

app.get('/api/admin/users', (req, res) => {
  res.json({ success: true, data: mockUsers });
});

app.get('/api/votes', (req, res) => {
  const { stream_id } = req.query;
  const votes = getVotesByStreamId(stream_id);
  const total = votes.leftVotes + votes.rightVotes;
  res.json({
    success: true,
    data: {
      leftVotes: votes.leftVotes,
      rightVotes: votes.rightVotes,
      totalVotes: total,
      leftPercentage: total > 0 ? Math.round((votes.leftVotes / total) * 100) : 50,
      rightPercentage: total > 0 ? Math.round((votes.rightVotes / total) * 100) : 50
    }
  });
});

app.get('/api/debate-topic', (req, res) => {
  res.json({ success: true, data: mockDebateTopic });
});

app.post('/api/user-vote', (req, res) => {
  const { side, votes, leftVotes, rightVotes, streamId } = req.body;
  const sid = streamId || 'stream-1';
  if (!streamVotes[sid]) {
    streamVotes[sid] = { leftVotes: 0, rightVotes: 0 };
  }
  if (leftVotes !== undefined && rightVotes !== undefined) {
    streamVotes[sid].leftVotes += leftVotes;
    streamVotes[sid].rightVotes += rightVotes;
  } else if (side && votes) {
    if (side === 'left') streamVotes[sid].leftVotes += votes;
    else streamVotes[sid].rightVotes += votes;
  }
  const votes_data = streamVotes[sid];
  const total = votes_data.leftVotes + votes_data.rightVotes;
  broadcast('votes-updated', {
    leftVotes: votes_data.leftVotes,
    rightVotes: votes_data.rightVotes,
    totalVotes: total,
    streamId: sid,
    leftPercentage: total > 0 ? Math.round((votes_data.leftVotes / total) * 100) : 50,
    rightPercentage: total > 0 ? Math.round((votes_data.rightVotes / total) * 100) : 50
  });
  res.json({
    success: true,
    data: {
      leftVotes: votes_data.leftVotes,
      rightVotes: votes_data.rightVotes,
      totalVotes: total,
      leftPercentage: total > 0 ? Math.round((votes_data.leftVotes / total) * 100) : 50,
      rightPercentage: total > 0 ? Math.round((votes_data.rightVotes / total) * 100) : 50
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.path} not found` });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[${new Date().toISOString()}] Backend server running on port ${PORT}`);
  console.log(`[${new Date().toISOString()}] Health check: http://localhost:${PORT}/health`);
});

try {
  wss = new WebSocket.Server({ server, path: '/ws' });
  wss.on('connection', (ws) => {
    wsClients.add(ws);
    ws.send(JSON.stringify({ type: 'connected', message: 'Connected to backend WebSocket' }));
    ws.on('close', () => wsClients.delete(ws));
    ws.on('error', () => wsClients.delete(ws));
  });
  console.log(`[${new Date().toISOString()}] WebSocket server started on ws://localhost:${PORT}/ws`);
} catch (e) {
  console.warn('WebSocket not available:', e.message);
}

setInterval(() => {
  const sid = 'stream-1';
  if (streamVotes[sid]) {
    streamVotes[sid].leftVotes += Math.floor(Math.random() * 5) + 1;
    streamVotes[sid].rightVotes += Math.floor(Math.random() * 5) + 1;
    const votes = streamVotes[sid];
    const total = votes.leftVotes + votes.rightVotes;
    broadcast('votes-updated', {
      leftVotes: votes.leftVotes,
      rightVotes: votes.rightVotes,
      totalVotes: total,
      streamId: sid,
      leftPercentage: total > 0 ? Math.round((votes.leftVotes / total) * 100) : 50,
      rightPercentage: total > 0 ? Math.round((votes.rightVotes / total) * 100) : 50
    });
  }
}, 5000);

module.exports = app;