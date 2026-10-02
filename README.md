# KIMI · AROUND THE WORLD

**Three.js r169 四场景 3D 互动体验 · 中英双语 · 移动端适配 · 零构建零依赖**

---

<p align="center">
  <a href="https://ariefenv-hash.github.io/kimi-mobile/" style="font-size:1.1rem">
    <b>🌍 在线体验（手机 / 电脑均可）</b><br><br>
  </a>
</p>

<table align="center">
  <tr>
    <td align="center"><sub><b>Three.js r169</b>（本地内置）</sub></td>
    <td align="center"><sub><b>四个独立场景</b></sub></td>
    <td align="center"><sub><b>中英双语 i18n</b></sub></td>
    <td align="center"><sub><b>移动端触控优化</b></sub></td>
    <td align="center"><sub><b>零构建 · 零外部依赖</b></sub></td>
  </tr>
</table>

> 四个风格迥异的场景共享一个入口菜单，随时点击传送切换——
> 不需要加载页、不需要等待，瞬间沉浸。

---

## 🎮 四个场景

| 场景 | 内容 | 操控 |
|---|---|---|
| **LUNAR LOBBY** 月球大厅 | 低重力自由探索，环形陨石坑地貌，KIMI 宇航员角色跟随 | 点击 / 触摸移动方向 |
| **MOON RACE** 环形竞速 | 8.8 KM 环形陨石坑赛道，计时 + 圈速记录 | 方向键 / 触屏滑动 |
| **VENICE SPEED** 晨光运河 | 贡多拉穿行威尼斯运河，水雾光柱与建筑剪影 | WASD / 触屏方向 |
| **CYBER SPACESHIP** 赛博出租车 | 雨夜霓虹高空飞行，未来城市天际线 | WASD / 触屏滑动 |

---

## 🚀 怎么运行

**方式一（双击即玩）**：解压后直接双击 `index.html`，Three.js 已内置在 `vendor/`，无需联网、无需服务器。

**方式二（本地服务器 / PWA）**：
```bash
cd kimi-mobile
python3 -m http.server 8080
# 浏览器打开 http://localhost:8080
```
**手机 PWA**：托管到任意静态服务（GitHub Pages / Netlify / 局域网 http）后，手机浏览器打开，「添加到主屏幕」即可全屏游玩，**完全离线可玩**。

---

## 📁 文件结构

```
kimi-mobile/
├── index.html              # 入口：菜单 + 四个场景视图容器
├── css/
│   └── style.css           # 全部样式（桌面 + 移动端响应式）
├── js/
│   ├── hub.js              # 主入口：菜单、设置、暂停、场景调度
│   ├── common.js           # 通用工具：KIMI角色、音效合成、设置持久化
│   ├── i18n.js             # 中英双语词表 + 语言切换（localStorage 持久化）
│   ├── lobby.js            # 月球大厅（低重力物理 + 陨石坑）
│   ├── moonrace.js         # 环形竞速（8.8KM赛道 + 圈速记录）
│   ├── venice.js           # 威尼斯贡多拉（水雾 + 建筑剪影）
│   ├── cyber.js            # 赛博出租车（霓虹城市 + 雨夜效果）
│   └── touch.js            # 移动端触屏手势（滑动/双指缩放/方向控制）
└── vendor/
    └── three.module.js     # Three.js r169（ES Module，本地化离线可玩）
```

---

## 🔧 技术亮点

- **场景热切换**：各场景独立 `dispose()`，切换无残影、无内存泄漏
- **KIMI 角色**：程序化几何体拼装（无外部模型文件），跟随 / 待机 / 跳跃三态
- **Web Audio 合成音效**：零音频资源，所有音效实时合成
- **localStorage 持久化**：最佳圈速、音量、画质、语言偏好
- **移动端深度适配**：防双指缩放、防 iOS 橡皮筋滚动、竖屏锁定提示、触屏方向控制
- **画质档位**：`high / medium / low` 自动调节抗锯齿、阴影、粒子密度
