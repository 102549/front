# 直播辩论系统 - 完整项目

## 📌 基本信息

### 项目名称
直播辩论系统 (Live Debate System)

### 🚀 演示地址

- **前端访问地址**:
- https://debate-api-uu51.onrender.com/health
- https://debate-api-uu51.onrender.com/api/admin/dashboard
- https://debate-api-uu51.onrender.com/api/admin/streams
- https://debate-api-uu51.onrender.com/api/admin/votes
- **后端 API 地址**: `https://live-debate-backend.up.railway.app` (Railway部署)
- **WebSocket 地址**: `wss://live-debate-backend.up.railway.app/ws`

---

## 🧱 技术栈说明

### 后端框架
- **Node.js + Express** - 轻量级后端服务框架
- **WebSocket (ws)** - 实时通信支持

### Mock 数据生成方案
- 内置 Mock JSON 数据
- 支持多直播流独立数据 (stream-1, stream-2)
- 实时模拟投票变化 (每5秒自动增加票数)

### 部署平台
- **Railway** - Node.js 应用部署 (后端)
- **前端**: uni-app 小程序，需要使用 uniCloud 或小程序开发者工具

---

## 🔗 项目结构与接口说明

### 后端目录结构

```
backend/
├── server.js          # 主服务文件，包含所有API接口
├── package.json       # 依赖配置
└── railway.json       # Railway部署配置
```

### 主要接口列表

| 功能 | 方法 | 路径 | 描述 |
|------|------|------|------|
| 健康检查 | GET | `/health` | 服务状态检查 |
| 获取仪表盘数据 | GET | `/api/admin/dashboard` | 返回完整数据概览 |
| 获取票数 | GET | `/api/admin/votes` | 获取当前投票数据 |
| 设置票数 | PUT | `/api/admin/votes` | 管理员设置票数 |
| 更新票数 | POST | `/api/admin/live/update-votes` | 增加/重置票数 |
| 获取直播流列表 | GET | `/api/admin/streams` | 获取所有直播流 |
| 获取评委列表 | GET | `/api/admin/judges` | 获取评委配置 |
| 保存评委 | POST | `/api/admin/judges` | 保存评委配置 |
| 获取辩论流程 | GET | `/api/admin/debate-flow` | 获取辩论流程配置 |
| 保存辩论流程 | POST | `/api/admin/debate-flow` | 保存辩论流程配置 |
| 辩论流程控制 | POST | `/api/admin/debate-flow/control` | 开始/暂停/重置等 |
| 获取用户列表 | GET | `/api/admin/users` | 获取用户列表 |
| 用户投票 | POST | `/api/user-vote` | 用户提交投票 |
| 获取辩题 | GET | `/api/debate-topic` | 获取当前辩题 |

### WebSocket 事件

| 事件类型 | 描述 |
|----------|------|
| `connected` | 连接成功 |
| `votes-updated` | 票数更新 |
| `judges-updated` | 评委更新 |
| `debate-flow-updated` | 辩论流程更新 |
| `debate-flow-control` | 辩论流程控制命令 |

---

## 🧠 项目开发过程笔记

### 项目实现思路

1. **分析现有项目**: 项目包含 uni-app 前端、Express 网关、文件数据库
2. **创建独立后端**: 创建 `backend/` 目录，实现完整的 REST API
3. **保留多流支持**: 延续原有的多直播流架构，每个流独立管理数据
4. **实现 WebSocket**: 添加实时通信功能，支持票数实时推送

### 接口设计遵循

- **统一响应格式**: `{ success: true/false, data: {...}, message: "..." }`
- **多流支持**: 所有接口支持 `stream_id` 参数
- **实时更新**: 所有数据变更通过 WebSocket 广播

### 本地联调经验

1. 后端服务运行在 3000 端口
2. 网关服务运行在 8080 端口
3. 前端需要配置正确的 API 地址

---

## 🧍 个人介绍

- **技术背景**: 全栈开发，熟悉 Node.js、Vue、React
- **擅长方向**: 后端服务设计、REST API 开发、WebSocket 实时通信
- **学习目标**: 深入理解微服务架构和云原生部署

---

## 📦 部署说明

### 后端部署 (Railway)

1. **创建 Railway 账号**: https://railway.app
2. **连接 GitHub 仓库**
3. **部署 backend 目录**
4. **自动获取访问地址**

Railway 会自动：
- 检测 Node.js 环境
- 安装依赖 (`npm install`)
- 启动服务 (`npm start`)

### 前端部署 (uniCloud)

uni-app 前端项目需要部署到 uniCloud：

1. 在 https://unicloud.dcloud.net.cn 创建项目
2. 使用 HBuilderX 上传前端代码
3. 配置 API 接口地址为后端部署地址

### 网关部署

现有的 `live-gateway-main` 网关服务也需要部署：

1. 确保与后端和前端配置协调
2. 启用 WebSocket 支持
3. 配置正确的跨域策略

---

## ⚠️ 注意事项

1. **跨域配置**: 后端已配置 `origin: '*'`，允许所有来源访问
2. **Mock 模式**: 所有数据均为模拟数据，不连接真实数据库
3. **WebSocket**: 需要使用 WSS (WSS://) 用于生产环境
4. **端口**: 后端默认使用 3000 端口，可通过环境变量 `PORT` 修改
5. 由于电脑系统问题导致HBuilderX不兼容，无法进行小程序等内容部署

---

## 🔧 本地开发

```bash
# 进入后端目录
cd backend

# 安装依赖
npm install

# 启动服务
npm start

# 服务地址
# HTTP: http://localhost:3000
# WebSocket: ws://localhost:3000/ws
```

---

## 📝 版本信息

- **版本**: 1.0.0
- **更新日期**: 2026-03-25
- **后端框架**: Express 4.18.2
- **Node.js**: >= 14.0.0
