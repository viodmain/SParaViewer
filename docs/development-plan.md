# SParaViewer 研发计划（纯前端方案）

## 一、项目概述

### 1.1 项目目标
开发一款轻量级、高性能的S参数后处理软件，采用纯前端技术栈，用户无需安装额外环境即可使用。

### 1.2 技术栈
- **核心**: HTML5 + CSS3 + JavaScript (ES6+)
- **图表**: Plotly.js
- **桌面打包**: Electron (可选)
- **无外部依赖**: 无需Python、Node.js等环境

### 1.3 项目结构

```
SParaViewer/
├── index.html              # 主页面
├── css/
│   ├── variables.css       # 主题变量
│   ├── layout.css          # 布局样式
│   ├── components.css      # 组件样式
│   └── responsive.css      # 响应式样式
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
│   │   ├── settings.js     # 设置面板
│   │   └── splitter.js     # 可拖动分割线
│   └── utils/
│       ├── math.js         # 数学工具
│       ├── shortcut.js     # 快捷键管理
│       └── theme.js        # 主题管理
├── assets/
│   ├── icons/              # SVG图标
│   └── fonts/              # 字体文件
├── electron/               # Electron配置（可选）
│   ├── main.js
│   └── package.json
└── docs/                   # 文档
```

---

## 二、开发阶段

### 阶段1：项目初始化（第1天）

#### 任务清单
| 序号 | 任务 | 预计时间 | 产出物 |
|------|------|----------|--------|
| 1.1 | 创建项目目录结构 | 0.2天 | 目录结构 |
| 1.2 | 编写index.html主页面 | 0.3天 | index.html |
| 1.3 | 实现CSS主题变量系统 | 0.2天 | variables.css |
| 1.4 | 实现基础布局CSS | 0.3天 | layout.css |

#### 验收标准
- [ ] 项目结构创建完成
- [ ] 基础HTML页面可以打开
- [ ] 主题变量系统工作正常
- [ ] 布局符合设计稿

---

### 阶段2：核心解析器（第2-3天）

#### 任务清单
| 序号 | 任务 | 预计时间 | 产出物 |
|------|------|----------|--------|
| 2.1 | 实现Touchstone文件格式解析 | 1天 | touchstone.js |
| 2.2 | 实现.s2p文件解析 | 0.5天 | 2端口支持 |
| 2.3 | 实现.s4p文件解析 | 0.5天 | 4端口支持 |
| 2.4 | 实现错误处理和验证 | 0.5天 | 错误处理 |
| 2.5 | 单元测试 | 0.5天 | 测试用例 |

#### Touchstone文件解析器
```javascript
class TouchstoneParser {
    /**
     * 解析Touchstone文件内容
     * @param {string} content - 文件内容
     * @returns {Object} 解析结果
     */
    parse(content) {
        const lines = content.split('\n');
        const result = {
            frequency: [],
            sParams: [],
            nports: 0,
            format: 'RI',
            z0: 50
        };

        // 1. 解析头部（# 行）
        // 2. 确定端口数（从文件扩展名）
        // 3. 解析数据行
        // 4. 返回结构化数据

        return result;
    }
}
```

#### 验收标准
- [ ] 可以正确解析.s2p文件
- [ ] 可以正确解析.s4p文件
- [ ] 支持RI、MA、DB三种格式
- [ ] 错误文件有明确提示

---

### 阶段3：UI框架搭建（第4-5天）

#### 任务清单
| 序号 | 任务 | 预计时间 | 产出物 |
|------|------|----------|--------|
| 3.1 | 实现Setting Bar | 0.5天 | 顶部工具栏 |
| 3.2 | 实现Explore面板 | 0.5天 | 文件浏览器 |
| 3.3 | 实现Plot Area框架 | 0.5天 | 图表区域 |
| 3.4 | 实现右侧面板框架 | 0.5天 | 配置区域 |
| 3.5 | 实现Info Bar | 0.2天 | 状态栏 |
| 3.6 | 实现可拖动分割线 | 0.3天 | splitter.js |

#### 验收标准
- [ ] 所有UI区域显示正确
- [ ] 面板可以拖动调整大小
- [ ] 主题切换正常工作
- [ ] 响应式布局适配

---

### 阶段4：图表功能（第6-8天）

#### 任务清单
| 序号 | 任务 | 预计时间 | 产出物 |
|------|------|----------|--------|
| 4.1 | 集成Plotly.js | 0.3天 | 依赖加载 |
| 4.2 | 实现直角坐标图 | 1天 | plot.js |
| 4.3 | 实现Y轴模式切换 | 0.5天 | dB/Phase/Linear |
| 4.4 | 实现史密斯圆图 | 1.5天 | smith-chart.js |
| 4.5 | 实现图表交互 | 0.7天 | 缩放/平移 |
| 4.6 | 实现图表工具栏 | 0.5天 | 工具栏按钮 |
| 4.7 | 实现导出功能 | 0.5天 | 导出PNG |

#### 验收标准
- [ ] 直角坐标图显示正确
- [ ] 史密斯圆图显示正确
- [ ] 缩放、平移功能正常
- [ ] 可以切换Y轴模式
- [ ] 可以导出PNG图片

---

### 阶段5：高级功能（第9-11天）

#### 任务清单
| 序号 | 任务 | 预计时间 | 产出物 |
|------|------|----------|--------|
| 5.1 | 实现SNP Port Mapping | 1天 | port-mapping.js |
| 5.2 | 实现TDR计算 | 1天 | tdr.js |
| 5.3 | 实现TDR配置面板 | 0.5天 | TDR配置UI |
| 5.4 | 实现TDR结果显示 | 0.5天 | TDR图表 |
| 5.5 | 实现多文件管理 | 0.5天 | 文件切换 |
| 5.6 | 实现快捷键系统 | 0.5天 | shortcut.js |

#### 验收标准
- [ ] Port Mapping矩阵显示正确
- [ ] 点击矩阵可以显示/隐藏曲线
- [ ] TDR计算结果正确
- [ ] TDR配置可以调整
- [ ] 快捷键可以正常使用

---

### 阶段6：完善与优化（第12-14天）

#### 任务清单
| 序号 | 任务 | 预计时间 | 产出物 |
|------|------|----------|--------|
| 6.1 | 实现设置面板 | 0.5天 | 设置UI |
| 6.2 | 实现帮助文档 | 0.3天 | 帮助内容 |
| 6.3 | 实现状态持久化 | 0.5天 | localStorage |
| 6.4 | 性能优化 | 1天 | 优化代码 |
| 6.5 | UI细节打磨 | 0.7天 | 样式调整 |
| 6.6 | 错误处理完善 | 0.5天 | 错误提示 |
| 6.7 | 响应式适配 | 0.5天 | 移动端支持 |

#### 验收标准
- [ ] 设置可以保存和恢复
- [ ] 大文件加载流畅
- [ ] 错误提示友好
- [ ] 移动端可以使用

---

### 阶段7：打包与测试（第15-16天）

#### 任务清单
| 序号 | 任务 | 预计时间 | 产出物 |
|------|------|----------|--------|
| 7.1 | 配置Electron打包 | 0.5天 | electron配置 |
| 7.2 | 打包Windows版本 | 0.5天 | .exe文件 |
| 7.3 | 打包Mac版本 | 0.5天 | .dmg文件 |
| 7.4 | 功能测试 | 1天 | 测试报告 |
| 7.5 | Bug修复 | 1天 | 修复代码 |
| 7.6 | 性能测试 | 0.5天 | 性能报告 |

#### 验收标准
- [ ] 可以打包为可执行文件
- [ ] 所有功能测试通过
- [ ] 性能满足要求
- [ ] 无严重Bug

---

## 三、关键技术实现

### 3.1 Touchstone文件解析

```javascript
// 解析2端口S参数
function parse2Port(values) {
    // 每行8个值：freq, S11_re, S11_im, S21_re, S21_im, S12_re, S12_im, S22_re, S22_im
    return {
        frequency: values[0],
        s11: { real: values[1], imag: values[2] },
        s21: { real: values[3], imag: values[4] },
        s12: { real: values[5], imag: values[6] },
        s22: { real: values[7], imag: values[8] }
    };
}

// 解析4端口S参数
function parse4Port(values) {
    // 每行33个值：freq + 16个S参数（实部+虚部）
    const sParams = [];
    for (let i = 0; i < 16; i++) {
        sParams.push({
            real: values[1 + i * 2],
            imag: values[2 + i * 2]
        });
    }
    return { frequency: values[0], sParams };
}
```

### 3.2 TDR计算实现

```javascript
class TDRCalculator {
    calculate(s11, frequency, options) {
        // 1. 应用窗函数
        const windowed = this.applyWindow(s11, options.windowType);

        // 2. IFFT变换
        const timeDomain = this.ifft(windowed);

        // 3. 计算阻抗
        const impedance = timeDomain.map(g => 
            options.z0 * (1 + g) / (1 - g)
        );

        // 4. 计算时间轴
        const dt = 1 / (frequency[frequency.length - 1] - frequency[0]);
        const time = Array.from({ length: timeDomain.length }, (_, i) => i * dt);

        return { time, impedance };
    }

    applyWindow(data, type) {
        const n = data.length;
        const window = new Float64Array(n);

        switch (type) {
            case 'hanning':
                for (let i = 0; i < n; i++) {
                    window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (n - 1)));
                }
                break;
            // ... 其他窗函数
        }

        return data.map((val, i) => val * window[i]);
    }

    ifft(data) {
        // 使用库或自研IFFT实现
    }
}
```

### 3.3 史密斯圆图实现

```javascript
class SmithChart {
    constructor(container) {
        this.container = container;
        this.traces = [];
        this.initLayout();
    }

    initLayout() {
        this.layout = {
            polar: {
                radialaxis: {
                    visible: true,
                    range: [0, 1],
                    gridcolor: 'var(--border-color)'
                },
                angularaxis: {
                    tickmode: 'array',
                    tickvals: [0, 90, 180, 270],
                    gridcolor: 'var(--border-color)'
                }
            },
            showlegend: true,
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent'
        };
    }

    drawBackground() {
        // 绘制电阻圆
        const rCircles = [0, 0.2, 0.5, 1, 2, 5];
        rCircles.forEach(r => {
            const trace = this.createResistanceCircle(r);
            this.traces.push(trace);
        });

        // 绘制电抗弧
        const xArcs = [0.2, 0.5, 1, 2, 5];
        xArcs.forEach(x => {
            this.traces.push(this.createReactanceArc(x));
            this.traces.push(this.createReactanceArc(-x));
        });
    }

    plot(sParams, name) {
        const trace = {
            type: 'scatterpolar',
            mode: 'lines',
            r: sParams.map(s => Math.sqrt(s.real ** 2 + s.imag ** 2)),
            theta: sParams.map(s => Math.atan2(s.imag, s.real) * 180 / Math.PI),
            name: name,
            line: { width: 2 }
        };

        this.traces.push(trace);
        Plotly.newPlot(this.container, this.traces, this.layout);
    }
}
```

---

## 四、性能优化策略

### 4.1 大文件处理

```javascript
// 流式解析
async function parseLargeFile(file) {
    const chunkSize = 1024 * 1024; // 1MB
    const reader = new FileReader();
    let offset = 0;
    const result = { frequency: [], sParams: [] };

    while (offset < file.size) {
        const chunk = await readChunk(file, offset, chunkSize);
        parseChunk(chunk, result);
        offset += chunkSize;

        // 更新进度条
        updateProgress(offset / file.size);
    }

    return result;
}
```

### 4.2 数据采样

```javascript
// 大数据集采样显示
function downsample(data, maxPoints) {
    if (data.length <= maxPoints) return data;

    const step = Math.ceil(data.length / maxPoints);
    const sampled = [];
    for (let i = 0; i < data.length; i += step) {
        sampled.push(data[i]);
    }
    return sampled;
}
```

### 4.3 Web Workers

```javascript
// 使用Web Worker进行后台计算
const tdrWorker = new Worker('js/calculator/tdr-worker.js');

tdrWorker.postMessage({
    command: 'calculate',
    data: { s11, frequency, options }
});

tdrWorker.onmessage = (e) => {
    const result = e.data;
    updateTDRChart(result);
};
```

---

## 五、测试计划

### 5.1 测试用例

| 测试项 | 测试数据 | 预期结果 |
|--------|----------|----------|
| 2端口文件解析 | test.s2p | 正确识别401个频率点 |
| 4端口文件解析 | AA_Original4PortVictim.s4p | 正确识别16个S参数 |
| TDR计算 | test.s2p | 阻抗曲线正确 |
| 图表渲染 | 所有测试文件 | 渲染时间<500ms |
| 主题切换 | - | 即时切换，无闪烁 |
| 响应式布局 | 不同屏幕尺寸 | 布局自适应 |

### 5.2 性能指标

| 指标 | 目标值 | 测试方法 |
|------|--------|----------|
| 首次加载 | <2秒 | 浏览器Network面板 |
| 文件解析 | <500ms | 计时测试 |
| 图表渲染 | <300ms | 计时测试 |
| 内存占用 | <200MB | 任务管理器 |
| 交互响应 | <100ms | 用户感知 |

---

## 六、里程碑

| 里程碑 | 日期 | 交付物 | 验收标准 |
|--------|------|--------|----------|
| M1: 项目启动 | 第1天 | 基础框架 | HTML页面可以打开 |
| M2: 解析器完成 | 第3天 | 文件解析 | 可以解析.s2p/.s4p |
| M3: UI框架 | 第5天 | 基础界面 | 所有区域显示正确 |
| M4: 图表功能 | 第8天 | 可视化 | 图表显示正确 |
| M5: 功能完整 | 第11天 | 全部功能 | 所有功能可用 |
| M6: 优化完成 | 第14天 | 优化版本 | 性能达标 |
| M7: 项目交付 | 第16天 | 最终产品 | 可打包发布 |

---

## 七、资源需求

### 7.1 开发环境
- 浏览器：Chrome/Firefox/Edge
- 编辑器：VS Code / Cursor
- 版本控制：Git

### 7.2 外部依赖
```html
<!-- Plotly.js (CDN) -->
<script src="https://cdn.plot.ly/plotly-2.27.0.min.js"></script>

<!-- 或者本地引入 -->
<script src="lib/plotly-2.27.0.min.js"></script>
```

### 7.3 测试数据
- test.s2p (2端口，401个频率点)
- Cap1.s2p (2端口)
- AA_Original4PortVictim.s4p (4端口)

---

## 八、风险与应对

| 风险项 | 影响 | 概率 | 应对措施 |
|--------|------|------|----------|
| 史密斯圆图实现复杂 | 中 | 高 | 参考开源实现，渐进完善 |
| 大文件性能问题 | 中 | 中 | 流式解析，数据采样 |
| 浏览器兼容性 | 低 | 低 | 使用标准API，Polyfill |
| Plotly.js体积大 | 低 | 中 | CDN加载，按需引入 |

---

## 九、总结

### 9.1 纯前端方案优势

| 优势 | 说明 |
|------|------|
| ✅ 零依赖 | 用户无需安装任何环境 |
| ✅ 轻量级 | 应用体积小（<10MB） |
| ✅ 易部署 | 可直接用浏览器打开 |
| ✅ 跨平台 | 一套代码，多平台运行 |
| ✅ 启动快 | 首次加载<2秒 |
| ✅ 开发效率高 | 前端技术栈成熟 |

### 9.2 预期成果

- **16天完成全部开发**
- 功能完整，性能达标
- 代码质量高，可维护性强
- 用户体验良好

---

*计划日期：2026-06-12*
*计划工具：Claude Code Development Plan*
