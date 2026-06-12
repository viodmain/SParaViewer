# SParaViewer - S参数后处理软件

一款轻量级的S参数后处理软件，支持Touchstone格式文件解析、TDR/TDT计算、Smith圆图等功能。

## 功能特性

- 📊 **S参数可视化** - 支持幅度、相位、VSWR、Smith圆图等多种显示方式
- 📁 **Touchstone格式支持** - 支持.s1p到.s10p的Touchstone文件格式
- 🔄 **TDR/TDT计算** - 支持时域反射和时域传输计算
- 🎨 **主题切换** - 支持深色/浅色主题
- 💾 **图表导出** - 支持导出为PNG、SVG格式

## 技术栈

- HTML5 / CSS3 / JavaScript (ES6+)
- Plotly.js - 图表渲染
- Electron - 桌面应用打包

## 快速开始

### 开发环境

```bash
# 安装依赖
npm install

# 启动开发模式
npm run dev
```

### 构建安装包

```bash
# 构建Windows安装包
npm run build:win
```

## 项目结构

```
SParaViewer/
├── src/
│   ├── index.html        # 主页面
│   ├── main.js           # Electron主进程
│   ├── preload.js        # 预加载脚本
│   ├── css/
│   │   ├── main.css      # 主样式
│   │   └── components.css # 组件样式
│   └── js/
│       └── app.js        # 应用逻辑
├── example/              # 示例文件
├── docs/                 # 文档
├── assets/               # 资源文件
├── package.json          # 项目配置
└── README.md             # 项目说明
```

## 使用说明

1. 启动应用后，点击"打开文件"按钮
2. 选择S参数文件（支持.s1p到.s10p格式）
3. 在Explore面板中选择要查看的文件
4. 使用图表标签切换不同的显示方式
5. 在Port Mapping面板中选择要显示的S参数
6. 使用TDR/TDT面板进行时域计算

## 开发计划

详见 [开发计划文档](docs/development-plan.md)

## 许可证

MIT License
