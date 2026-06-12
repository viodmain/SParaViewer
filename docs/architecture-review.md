# SParaViewer 软件架构评估报告（纯前端方案）

## 一、技术选型评估

### 1.1 纯前端架构方案

| 方案 | 轻量级 | 性能 | 开发效率 | 推荐度 |
|------|--------|------|----------|--------|
| **方案A: 纯HTML/JS** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 方案B: Electron | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 方案C: Tauri | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |

### 1.2 推荐方案：纯HTML/JS + WebAssembly

```
┌─────────────────────────────────────────────────────────┐
│                    浏览器 / Electron                     │
├─────────────────────────────────────────────────────────┤
│  UI层: HTML + CSS + JavaScript                         │
├─────────────────────────────────────────────────────────┤
│  图表层: Plotly.js / ECharts                           │
├─────────────────────────────────────────────────────────┤
│  计算层: JavaScript + WebAssembly (可选)                │
├─────────────────────────────────────────────────────────┤
│  数据层: 前端直接解析Touchstone文件                     │
└─────────────────────────────────────────────────────────┘
```

### 1.3 技术栈选型

| 组件 | 技术选择 | 说明 |
|------|----------|------|
| **UI框架** | 原生HTML/CSS/JS | 轻量、无依赖 |
| **图表库** | Plotly.js | 功能丰富，支持史密斯圆图 |
| **文件解析** | 自研JS解析器 | 直接解析.s2p/.s4p文件 |
| **数值计算** | Math.js / 自研 | TDR计算、FFT变换 |
| **桌面打包** | Electron (可选) | 轻量打包 |

---

## 二、核心模块设计

### 2.1 模块结构

```
SParaViewer/
├── index.html              # 主页面
├── css/
│   ├── variables.css       # 主题变量
│   ├── layout.css          # 布局样式
│   └── components.css      # 组件样式
├── js/
│   ├── app.js              # 应用入口
│   ├── parser/
│   │   └── touchstone.js   # Touchstone文件解析器
│   ├── calculator/
│   │   └── tdr.js          # TDR计算
│   ├── ui/
│   │   ├── explore.js      # 文件浏览器
│   │   ├── plot.js         # 图表管理
│   │   ├── smith-chart.js  # 史密斯圆图
│   │   ├── port-mapping.js # 端口映射
│   │   └── settings.js     # 设置面板
│   └── utils/
│       ├── math.js         # 数学工具
│       └── theme.js        # 主题管理
├── assets/
│   └── icons/              # 图标资源
└── electron/               # Electron打包配置（可选）
    └── main.js
```

### 2.2 模块职责

| 模块 | 职责 | 核心功能 |
|------|------|----------|
| parser/ | 文件解析 | 解析Touchstone文件格式 |
| calculator/ | 数值计算 | TDR计算、FFT变换 |
| ui/ | 界面渲染 | 图表显示、交互处理 |
| utils/ | 工具函数 | 主题切换、数学计算 |

---

## 三、文件解析方案

### 3.1 Touchstone文件格式

Touchstone文件（.s1p, .s2p, .s4p等）是RF/Microwave行业的标准数据格式。

```
! 注释行
# Hz S RI R 50
! 频率 Real Imag Real Imag ...
1000000000 0.5 0.3 0.2 0.1 0.2 0.1 0.5 0.3
2000000000 0.4 0.2 0.3 0.2 0.3 0.2 0.4 0.2
...
```

### 3.2 JavaScript解析器实现

```javascript
// parser/touchstone.js
class TouchstoneParser {
    constructor() {
        this.data = {
            frequency: [],
            sParams: [],
            nports: 0,
            format: 'RI',  // RI, MA, DB
            z0: 50
        };
    }

    parse(content) {
        const lines = content.split('\n');
        let dataStart = 0;

        // 解析头部信息
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('#')) {
                this.parseHeader(line);
                dataStart = i + 1;
                break;
            }
        }

        // 解析数据行
        for (let i = dataStart; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line && !line.startsWith('!')) {
                this.parseDataLine(line);
            }
        }

        return this.data;
    }

    parseHeader(line) {
        const parts = line.split(/\s+/);
        // 解析单位、格式、阻抗等
    }

    parseDataLine(line) {
        const values = line.split(/\s+/).map(Number);
        // 根据端口数解析S参数矩阵
    }
}
```

### 3.3 文件格式检测

```javascript
function detectFileType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const nports = parseInt(ext.replace('s', '').replace('p', ''));
    return { extension: ext, nports: nports };
}
```

---

## 四、TDR计算方案

### 4.1 TDR计算原理

TDR（时域反射）通过IFFT将频域S参数转换为时域响应。

### 4.2 JavaScript实现

```javascript
// calculator/tdr.js
class TDRCalculator {
    constructor(options = {}) {
        this.riseTime = options.riseTime || 35;  // ps
        this.z0 = options.z0 || 50;  // Ω
        this.windowType = options.windowType || 'hanning';
    }

    calculate(s11, frequency) {
        // 1. 应用窗函数
        const windowed = this.applyWindow(s11);

        // 2. IFFT变换
        const timeDomain = this.ifft(windowed);

        // 3. 计算阻抗
        const impedance = this.calculateImpedance(timeDomain);

        // 4. 计算时间轴
        const time = this.calculateTimeAxis(frequency);

        return { time, impedance };
    }

    applyWindow(data) {
        const n = data.length;
        const window = new Float64Array(n);

        switch (this.windowType) {
            case 'hanning':
                for (let i = 0; i < n; i++) {
                    window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (n - 1)));
                }
                break;
            case 'hamming':
                for (let i = 0; i < n; i++) {
                    window[i] = 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (n - 1));
                }
                break;
        }

        return data.map((val, i) => val * window[i]);
    }

    ifft(data) {
        // 使用FFT.js库或自研IFFT
        // 返回时域数据
    }

    calculateImpedance(gamma) {
        // Z = Z0 * (1 + Γ) / (1 - Γ)
        return gamma.map(g => this.z0 * (1 + g) / (1 - g));
    }
}
```

### 4.3 FFT库选择

| 库 | 性能 | 易用性 | 推荐度 |
|----|------|--------|--------|
| fft.js | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| math.js | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 自研 | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |

---

## 五、图表方案

### 5.1 Plotly.js配置

```javascript
// ui/plot.js
class PlotManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.traces = [];
        this.layout = {
            xaxis: {
                title: 'Frequency (GHz)',
                type: 'log'
            },
            yaxis: {
                title: 'Magnitude (dB)'
            },
            showlegend: true,
            legend: {
                x: 1,
                y: 1
            }
        };
    }

    addTrace(frequency, sParam, name, options = {}) {
        const trace = {
            x: frequency,
            y: sParam,
            type: 'scatter',
            mode: 'lines',
            name: name,
            line: {
                color: options.color || this.getNextColor(),
                width: options.width || 2
            }
        };

        this.traces.push(trace);
        this.render();
    }

    render() {
        Plotly.newPlot(this.container, this.traces, this.layout, {
            responsive: true,
            displayModeBar: true,
            modeBarButtonsToAdd: [{
                name: 'Export to PNG',
                icon: Plotly.Icons.camera,
                click: (gd) => {
                    Plotly.downloadImage(gd, { format: 'png' });
                }
            }]
        });
    }

    setYAxisMode(mode) {
        switch (mode) {
            case 'db':
                this.layout.yaxis.title = 'Magnitude (dB)';
                break;
            case 'phase':
                this.layout.yaxis.title = 'Phase (°)';
                break;
            case 'linear':
                this.layout.yaxis.title = 'Magnitude (Linear)';
                break;
        }
        this.render();
    }
}
```

### 5.2 史密斯圆图实现

```javascript
// ui/smith-chart.js
class SmithChart {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.traces = [];
        this.init();
    }

    init() {
        // 绘制史密斯圆图背景
        this.drawBackground();

        // 设置布局
        this.layout = {
            polar: {
                radialaxis: {
                    visible: true,
                    range: [0, 1]
                }
            },
            showlegend: true
        };
    }

    drawBackground() {
        // 绘制电阻圆
        const resistanceValues = [0, 0.2, 0.5, 1, 2, 5];
        resistanceValues.forEach(r => {
            this.drawResistanceCircle(r);
        });

        // 绘制电抗弧
        const reactanceValues = [0.2, 0.5, 1, 2, 5];
        reactanceValues.forEach(x => {
            this.drawReactanceArc(x);
            this.drawReactanceArc(-x);
        });
    }

    plot(sParams, name) {
        const trace = {
            type: 'scatterpolar',
            mode: 'lines',
            r: sParams.map(s => Math.sqrt(s.real ** 2 + s.imag ** 2)),
            theta: sParams.map(s => Math.atan2(s.imag, s.real) * 180 / Math.PI),
            name: name
        };

        this.traces.push(trace);
        Plotly.newPlot(this.container, this.traces, this.layout);
    }
}
```

---

## 六、性能优化

### 6.1 大文件处理

```javascript
// 流式解析大文件
async function parseLargeFile(file) {
    const chunkSize = 1024 * 1024;  // 1MB
    const reader = new FileReader();
    let offset = 0;
    const result = { frequency: [], sParams: [] };

    while (offset < file.size) {
        const chunk = await readChunk(reader, file, offset, chunkSize);
        parseChunk(chunk, result);
        offset += chunkSize;
    }

    return result;
}
```

### 6.2 数据采样

```javascript
// 大数据集采样
function downsample(data, maxPoints) {
    if (data.length <= maxPoints) return data;

    const step = Math.ceil(data.length / maxPoints);
    return data.filter((_, i) => i % step === 0);
}
```

### 6.3 Web Workers

```javascript
// 使用Web Worker进行后台计算
const worker = new Worker('js/calculator/tdr-worker.js');

worker.postMessage({
    command: 'calculate',
    data: { s11, frequency, options }
});

worker.onmessage = (e) => {
    const result = e.data;
    updateUI(result);
};
```

---

## 七、桌面打包方案

### 7.1 Electron轻量配置

```javascript
// electron/main.js
const { app, BrowserWindow } = require('electron');

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);
```

### 7.2 打包配置

```json
{
  "name": "SParaViewer",
  "version": "1.0.0",
  "main": "electron/main.js",
  "scripts": {
    "start": "electron .",
    "build": "electron-builder"
  },
  "build": {
    "appId": "com.sparaviewer.app",
    "productName": "SParaViewer",
    "win": {
      "target": "nsis"
    },
    "mac": {
      "target": "dmg"
    }
  }
}
```

---

## 八、架构优势总结

### 8.1 纯前端方案优势

| 优势 | 说明 |
|------|------|
| ✅ 零依赖 | 用户无需安装Python等环境 |
| ✅ 轻量级 | 应用体积小，启动快 |
| ✅ 易部署 | 可直接用浏览器打开 |
| ✅ 跨平台 | 一套代码，多平台运行 |
| ✅ 开发效率高 | 前端技术栈成熟 |

### 8.2 性能对比

| 指标 | 纯前端方案 | Electron+Python |
|------|------------|-----------------|
| 启动时间 | <1秒 | 3-5秒 |
| 内存占用 | 100-200MB | 500MB+ |
| 应用体积 | 5-10MB | 100MB+ |
| 文件加载 | <500ms | <1秒 |

### 8.3 推荐行动

1. **优先实现核心功能**：文件解析、图表显示
2. **渐进增强**：先实现基础功能，再添加高级特性
3. **性能优化**：使用Web Worker、数据采样
4. **可选打包**：根据需要使用Electron打包

---

*评估日期：2026-06-12*
*评估工具：Claude Code Architecture Review*
