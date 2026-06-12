# SParaViewer UI设计评估报告（纯前端方案）

## 一、整体布局评估

### 1.1 布局结构

```
┌─────────────────────────────────────────────────────────┐
│                      Setting Bar                        │
├──────────┬──────────────────────────┬───────────────────┤
│          │                          │  SNP Port Mapping │
│          │                          ├───────────────────┤
│ Explore  │       Plot Area          │   TDR Calculate   │
│          │                          ├───────────────────┤
│          │                          │   Other Option    │
├──────────┴──────────────────────────┴───────────────────┤
│                       Info Bar                          │
└─────────────────────────────────────────────────────────┘
```

### 1.2 布局评估

| 评估维度 | 评分 | 说明 |
|---------|------|------|
| 空间利用率 | ⭐⭐⭐⭐ | 左右分栏，主次分明 |
| 视觉层次 | ⭐⭐⭐⭐⭐ | 参考VSCode，层次清晰 |
| 可操作性 | ⭐⭐⭐⭐ | 区域划分合理 |
| 响应式设计 | ⭐⭐⭐⭐ | 纯前端方案更容易适配 |

### 1.3 响应式布局实现

```css
/* 响应式断点 */
:root {
    --sidebar-width: 250px;
    --right-panel-width: 300px;
    --setting-bar-height: 40px;
    --info-bar-height: 25px;
}

/* 桌面端 */
@media (min-width: 1200px) {
    .app-container {
        grid-template-columns: var(--sidebar-width) 1fr var(--right-panel-width);
    }
}

/* 平板端 */
@media (max-width: 1199px) {
    .app-container {
        grid-template-columns: var(--sidebar-width) 1fr;
    }
    .right-panel {
        display: none;
    }
}

/* 移动端 */
@media (max-width: 768px) {
    .sidebar {
        display: none;
    }
    .app-container {
        grid-template-columns: 1fr;
    }
}
```

---

## 二、Setting Bar设计

### 2.1 功能按钮

```html
<div class="setting-bar">
    <div class="left-section">
        <button id="openBtn" title="打开文件 (Ctrl+O)">
            <svg><!-- 文件图标 --></svg>
            <span>Open</span>
        </button>
        <button id="windowBtn" title="新建窗口">
            <svg><!-- 窗口图标 --></svg>
            <span>Window</span>
        </button>
    </div>
    <div class="right-section">
        <button id="settingBtn" title="设置 (Ctrl+,)">
            <svg><!-- 齿轮图标 --></svg>
        </button>
        <button id="helpBtn" title="帮助">
            <svg><!-- 问号图标 --></svg>
        </button>
    </div>
</div>
```

### 2.2 样式设计

```css
.setting-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: var(--setting-bar-height);
    padding: 0 10px;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
}

.setting-bar button {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
    background: transparent;
    border: none;
    color: var(--text-primary);
    cursor: pointer;
    border-radius: 4px;
}

.setting-bar button:hover {
    background: var(--bg-hover);
}
```

---

## 三、Explore面板设计

### 3.1 文件树组件

```html
<div class="explore-panel">
    <div class="panel-header">
        <span>EXPLORER</span>
        <button class="collapse-btn">▼</button>
    </div>
    <div class="file-tree">
        <!-- 文件节点动态生成 -->
    </div>
</div>
```

### 3.2 文件节点样式

```css
.file-node {
    display: flex;
    align-items: center;
    padding: 6px 10px;
    cursor: pointer;
    transition: background 0.2s;
}

.file-node:hover {
    background: var(--bg-hover);
}

.file-node.active {
    background: var(--bg-active);
    border-left: 3px solid var(--accent-color);
}

.file-icon {
    margin-right: 8px;
    font-size: 16px;
}

.file-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.file-ports {
    font-size: 12px;
    color: var(--text-secondary);
    background: var(--bg-tertiary);
    padding: 2px 6px;
    border-radius: 3px;
}
```

### 3.3 交互功能

```javascript
class ExplorePanel {
    constructor(container) {
        this.container = container;
        this.files = new Map();
        this.activeFile = null;
    }

    addFile(fileInfo) {
        const node = this.createNode(fileInfo);
        this.container.appendChild(node);
        this.files.set(fileInfo.path, { info: fileInfo, node: node });

        // 自动选中第一个文件
        if (this.files.size === 1) {
            this.selectFile(fileInfo.path);
        }
    }

    createNode(fileInfo) {
        const node = document.createElement('div');
        node.className = 'file-node';
        node.dataset.path = fileInfo.path;
        node.innerHTML = `
            <span class="file-icon">📄</span>
            <span class="file-name">${fileInfo.name}</span>
            <span class="file-ports">${fileInfo.nports}P</span>
        `;

        node.addEventListener('click', () => this.selectFile(fileInfo.path));
        node.addEventListener('contextmenu', (e) => this.showContextMenu(e, fileInfo));

        return node;
    }

    selectFile(path) {
        // 移除旧的active状态
        if (this.activeFile) {
            this.files.get(this.activeFile).node.classList.remove('active');
        }

        // 设置新的active状态
        this.activeFile = path;
        this.files.get(path).node.classList.add('active');

        // 触发文件选择事件
        this.onFileSelect(this.files.get(path).info);
    }

    showContextMenu(e, fileInfo) {
        e.preventDefault();
        // 显示右键菜单：删除、重命名、属性
    }
}
```

---

## 四、Plot Area设计

### 4.1 图表容器

```html
<div class="plot-area">
    <div class="plot-toolbar">
        <div class="view-mode">
            <button class="active" data-mode="rectangular">直角坐标</button>
            <button data-mode="smith">史密斯圆图</button>
        </div>
        <div class="y-axis-mode">
            <select id="yAxisMode">
                <option value="db">Magnitude (dB)</option>
                <option value="phase">Phase (°)</option>
                <option value="linear">Magnitude (Linear)</option>
            </select>
        </div>
        <div class="plot-actions">
            <button id="resetZoom">重置</button>
            <button id="exportPng">导出PNG</button>
        </div>
    </div>
    <div id="plotContainer" class="plot-container"></div>
</div>
```

### 4.2 工具栏样式

```css
.plot-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
}

.view-mode button,
.y-axis-mode select,
.plot-actions button {
    padding: 5px 10px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    cursor: pointer;
    border-radius: 4px;
}

.view-mode button.active {
    background: var(--accent-color);
    color: white;
    border-color: var(--accent-color);
}
```

### 4.3 图表管理器

```javascript
class PlotManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.traces = [];
        this.currentMode = 'rectangular';
        this.yAxisMode = 'db';

        this.layout = {
            xaxis: {
                title: 'Frequency (GHz)',
                type: 'log',
                gridcolor: 'var(--border-color)'
            },
            yaxis: {
                title: 'Magnitude (dB)',
                gridcolor: 'var(--border-color)'
            },
            showlegend: true,
            legend: { x: 1, y: 1 },
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            font: { color: 'var(--text-primary)' }
        };

        this.config = {
            responsive: true,
            displayModeBar: true,
            modeBarButtonsToRemove: ['lasso2d', 'select2d'],
            displaylogo: false
        };
    }

    addTrace(frequency, sParam, name) {
        const trace = {
            x: frequency,
            y: this.convertYAxis(sParam),
            type: 'scatter',
            mode: 'lines',
            name: name,
            line: { width: 2 }
        };

        this.traces.push(trace);
        this.render();
    }

    convertYAxis(data) {
        switch (this.yAxisMode) {
            case 'db':
                return data.map(v => 20 * Math.log10(Math.abs(v)));
            case 'phase':
                return data.map(v => Math.atan2(v.imag, v.real) * 180 / Math.PI);
            case 'linear':
                return data.map(v => Math.abs(v));
            default:
                return data;
        }
    }

    render() {
        Plotly.newPlot(this.container, this.traces, this.layout, this.config);
    }

    setYAxisMode(mode) {
        this.yAxisMode = mode;
        // 重新计算并渲染所有曲线
        this.traces = this.traces.map(trace => ({
            ...trace,
            y: this.convertYAxis(trace._rawData)
        }));
        this.render();
    }

    resetZoom() {
        Plotly.relayout(this.container, {
            'xaxis.autorange': true,
            'yaxis.autorange': true
        });
    }

    exportPng() {
        Plotly.downloadImage(this.container, {
            format: 'png',
            width: 1920,
            height: 1080,
            filename: 's-parameter-plot'
        });
    }
}
```

---

## 五、SNP Port Mapping设计

### 5.1 矩阵组件

```html
<div class="port-mapping-panel">
    <div class="panel-header">
        <span>SNP Port Mapping</span>
    </div>
    <div class="port-matrix-container">
        <!-- 矩阵动态生成 -->
    </div>
</div>
```

### 5.2 矩阵样式

```css
.port-matrix {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
}

.port-matrix td {
    padding: 8px;
    text-align: center;
    border: 1px solid var(--border-color);
    cursor: pointer;
    transition: all 0.2s;
    font-family: monospace;
    font-size: 12px;
}

.port-matrix td:hover {
    background: var(--bg-hover);
}

.port-matrix td.selected {
    background: var(--accent-color);
    color: white;
    font-weight: bold;
}

.port-matrix td.header {
    background: var(--bg-tertiary);
    font-weight: bold;
    cursor: default;
}
```

### 5.3 端口映射组件

```javascript
class PortMappingMatrix {
    constructor(container, nports) {
        this.container = container;
        this.nports = nports;
        this.selected = new Set();
        this.render();
    }

    render() {
        const table = document.createElement('table');
        table.className = 'port-matrix';

        // 表头行
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = '<td class="header"></td>';
        for (let j = 0; j < this.nports; j++) {
            headerRow.innerHTML += `<td class="header">Port ${j + 1}</td>`;
        }
        table.appendChild(headerRow);

        // 数据行
        for (let i = 0; i < this.nports; i++) {
            const row = document.createElement('tr');
            row.innerHTML = `<td class="header">Port ${i + 1}</td>`;

            for (let j = 0; j < this.nports; j++) {
                const cell = document.createElement('td');
                cell.textContent = `S${i + 1}${j + 1}`;
                cell.dataset.row = i;
                cell.dataset.col = j;
                cell.addEventListener('click', (e) => this.handleClick(i, j, e));
                row.appendChild(cell);
            }

            table.appendChild(row);
        }

        this.container.appendChild(table);
    }

    handleClick(i, j, event) {
        const key = `${i}${j}`;
        const cell = event.target;

        if (event.ctrlKey || event.metaKey) {
            // 多选模式
            if (this.selected.has(key)) {
                this.selected.delete(key);
                cell.classList.remove('selected');
            } else {
                this.selected.add(key);
                cell.classList.add('selected');
            }
        } else {
            // 单选模式
            this.clearSelection();
            this.selected.clear();
            this.selected.add(key);
            cell.classList.add('selected');
        }

        this.onSelectionChange(Array.from(this.selected));
    }

    clearSelection() {
        this.container.querySelectorAll('td.selected').forEach(cell => {
            cell.classList.remove('selected');
        });
    }

    onSelectionChange(selectedKeys) {
        // 触发选择变化事件
        // selectedKeys: ['00', '11', '21'] 表示 S11, S22, S32
    }
}
```

---

## 六、TDR Calculate设计

### 6.1 配置面板

```html
<div class="tdr-panel">
    <div class="panel-header">
        <span>TDR Calculate</span>
    </div>
    <div class="tdr-config">
        <div class="config-item">
            <label for="riseTime">上升时间:</label>
            <div class="input-group">
                <input type="number" id="riseTime" value="35" min="1" max="1000">
                <span class="unit">ps</span>
            </div>
        </div>
        <div class="config-item">
            <label for="z0">参考阻抗:</label>
            <div class="input-group">
                <input type="number" id="z0" value="50" min="1" max="1000">
                <span class="unit">Ω</span>
            </div>
        </div>
        <div class="config-item">
            <label for="windowType">窗函数:</label>
            <select id="windowType">
                <option value="hanning">汉宁窗</option>
                <option value="hamming">汉明窗</option>
                <option value="blackman">布莱克曼窗</option>
                <option value="none">无</option>
            </select>
        </div>
        <div class="config-item">
            <label for="propSpeed">传播速度:</label>
            <div class="input-group">
                <input type="number" id="propSpeed" value="0.5" min="0.01" max="1" step="0.01">
                <span class="unit">c</span>
            </div>
        </div>
        <div class="config-actions">
            <button id="calculateTdr">计算</button>
            <button id="resetTdr">重置</button>
        </div>
    </div>
    <div class="tdr-results">
        <div id="tdrChart" class="tdr-chart"></div>
        <div class="tdr-info">
            <span>阻抗范围: <strong id="impedanceRange">-</strong></span>
            <span>特征阻抗: <strong id="charImpedance">-</strong></span>
        </div>
    </div>
</div>
```

### 6.2 TDR面板样式

```css
.tdr-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.tdr-config {
    padding: 12px;
    border-bottom: 1px solid var(--border-color);
}

.config-item {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
}

.config-item label {
    width: 80px;
    font-size: 12px;
    color: var(--text-secondary);
}

.input-group {
    display: flex;
    align-items: center;
    flex: 1;
}

.input-group input {
    width: 60px;
    padding: 4px 8px;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    border-radius: 4px;
}

.input-group .unit {
    margin-left: 5px;
    font-size: 12px;
    color: var(--text-secondary);
}

.tdr-results {
    flex: 1;
    display: flex;
    flex-direction: column;
}

.tdr-chart {
    flex: 1;
    min-height: 200px;
}

.tdr-info {
    display: flex;
    justify-content: space-around;
    padding: 10px;
    background: var(--bg-tertiary);
    font-size: 12px;
}
```

---

## 七、主题系统设计

### 7.1 CSS变量定义

```css
/* 深色主题 */
[data-theme="dark"] {
    --bg-primary: #1e1e1e;
    --bg-secondary: #252526;
    --bg-tertiary: #2d2d2d;
    --bg-hover: #3c3c3c;
    --bg-active: #37373d;
    --text-primary: #cccccc;
    --text-secondary: #858585;
    --accent-color: #007acc;
    --accent-hover: #005a9e;
    --border-color: #3c3c3c;
    --success-color: #4caf50;
    --warning-color: #ff9800;
    --error-color: #f44336;
}

/* 浅色主题 */
[data-theme="light"] {
    --bg-primary: #ffffff;
    --bg-secondary: #f3f3f3;
    --bg-tertiary: #e8e8e8;
    --bg-hover: #e0e0e0;
    --bg-active: #d0d0d0;
    --text-primary: #333333;
    --text-secondary: #666666;
    --accent-color: #0066b8;
    --accent-hover: #004a8f;
    --border-color: #d4d4d4;
    --success-color: #388e3c;
    --warning-color: #f57c00;
    --error-color: #d32f2f;
}
```

### 7.2 主题管理器

```javascript
class ThemeManager {
    constructor() {
        this.currentTheme = localStorage.getItem('theme') || 'dark';
        this.init();
    }

    init() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        this.updateThemeToggle();
    }

    toggle() {
        this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        localStorage.setItem('theme', this.currentTheme);
        this.updateThemeToggle();
    }

    setTheme(theme) {
        this.currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        this.updateThemeToggle();
    }

    updateThemeToggle() {
        const toggleBtn = document.getElementById('themeToggle');
        if (toggleBtn) {
            toggleBtn.textContent = this.currentTheme === 'dark' ? '🌙' : '☀️';
        }
    }
}
```

---

## 八、可拖动分割线

### 8.1 分割线实现

```javascript
class Splitter {
    constructor(leftPanel, rightPanel, direction = 'vertical') {
        this.leftPanel = leftPanel;
        this.rightPanel = rightPanel;
        this.direction = direction;
        this.isDragging = false;

        this.createSplitter();
        this.bindEvents();
    }

    createSplitter() {
        this.splitter = document.createElement('div');
        this.splitter.className = `splitter ${this.direction}`;
        this.splitter.innerHTML = '<div class="splitter-handle"></div>';

        this.leftPanel.parentNode.insertBefore(this.splitter, this.rightPanel);
    }

    bindEvents() {
        this.splitter.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.startX = e.clientX;
            this.startY = e.clientY;
            this.startLeftWidth = this.leftPanel.offsetWidth;
            this.startRightWidth = this.rightPanel.offsetWidth;

            document.addEventListener('mousemove', this.onMouseMove.bind(this));
            document.addEventListener('mouseup', this.onMouseUp.bind(this));
        });
    }

    onMouseMove(e) {
        if (!this.isDragging) return;

        const dx = e.clientX - this.startX;
        const dy = e.clientY - this.startY;

        if (this.direction === 'vertical') {
            const newLeftWidth = this.startLeftWidth + dx;
            const newRightWidth = this.startRightWidth - dx;

            if (newLeftWidth > 100 && newRightWidth > 100) {
                this.leftPanel.style.width = `${newLeftWidth}px`;
                this.rightPanel.style.width = `${newRightWidth}px`;
            }
        }
    }

    onMouseUp() {
        this.isDragging = false;
        document.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('mouseup', this.onMouseUp);
    }
}
```

### 8.2 分割线样式

```css
.splitter {
    background: var(--border-color);
    cursor: col-resize;
    user-select: none;
    transition: background 0.2s;
}

.splitter:hover,
.splitter.dragging {
    background: var(--accent-color);
}

.splitter-handle {
    width: 4px;
    height: 100%;
    margin: 0 auto;
}
```

---

## 九、快捷键系统

### 9.1 快捷键配置

```javascript
const SHORTCUTS = {
    'ctrl+o': 'openFile',
    'ctrl+s': 'saveFile',
    'ctrl+shift+s': 'saveAs',
    'ctrl+z': 'undo',
    'ctrl+shift+z': 'redo',
    'ctrl+0': 'resetZoom',
    'ctrl+=': 'zoomIn',
    'ctrl+-': 'zoomOut',
    'ctrl+1': 'viewRectangular',
    'ctrl+2': 'viewSmith',
    'ctrl+,': 'openSettings',
    'f11': 'toggleFullscreen',
    'escape': 'closeDialog'
};
```

### 9.2 快捷键管理器

```javascript
class ShortcutManager {
    constructor() {
        this.shortcuts = new Map();
        this.init();
    }

    init() {
        document.addEventListener('keydown', (e) => {
            const key = this.getKeyCombo(e);
            if (this.shortcuts.has(key)) {
                e.preventDefault();
                this.shortcuts.get(key)();
            }
        });
    }

    register(combo, callback) {
        this.shortcuts.set(combo.toLowerCase(), callback);
    }

    getKeyCombo(e) {
        const parts = [];
        if (e.ctrlKey || e.metaKey) parts.push('ctrl');
        if (e.shiftKey) parts.push('shift');
        if (e.altKey) parts.push('alt');
        parts.push(e.key.toLowerCase());
        return parts.join('+');
    }
}
```

---

## 十、UI改进建议汇总

### 10.1 高优先级改进

| 序号 | 改进项 | 预期收益 | 实现难度 |
|------|--------|----------|----------|
| 1 | 实现可拖动面板分割 | 用户体验提升 | 中 |
| 2 | 添加快捷键支持 | 操作效率提升 | 低 |
| 3 | 实现图表工具栏 | 功能易用性 | 低 |
| 4 | 添加状态持久化 | 用户体验 | 低 |

### 10.2 中优先级改进

| 序号 | 改进项 | 预期收益 | 实现难度 |
|------|--------|----------|----------|
| 1 | 响应式布局适配 | 多设备支持 | 中 |
| 2 | 添加数据导出功能 | 功能完整性 | 中 |
| 3 | 实现撤销/重做 | 用户体验 | 中 |
| 4 | 添加标注功能 | 功能完整性 | 高 |

### 10.3 纯前端方案UI优势

| 优势 | 说明 |
|------|------|
| ✅ CSS变量主题切换 | 无需重新渲染，即时切换 |
| ✅ 响应式布局 | 天然支持多设备 |
| ✅ 流畅动画 | CSS transition/animation |
| ✅ 轻量级组件 | 无需框架，原生实现 |

---

*评估日期：2026-06-12*
*评估工具：Claude Code UI Review*
