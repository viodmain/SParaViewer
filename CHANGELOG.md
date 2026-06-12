# Changelog

## [0.1.0] - 2026-06-12

### ✅ 已完成

#### 项目基础
- [x] Electron桌面应用框架搭建
- [x] 项目目录结构规范
- [x] package.json配置（含electron-builder打包配置）
- [x] .gitignore、LICENSE、README.md

#### 核心功能
- [x] Touchstone文件解析器（`touchstone-parser.js`）
  - 支持 .s1p ~ .s10p 格式
  - 支持 MA/DB/RI 数据格式
  - 支持 HZ/KHZ/MHZ/GHZ 频率单位
  - 数据验证与错误处理
- [x] TDR/TDT计算器（`tdr-calculator.js`）
  - TDR时域反射计算
  - TDT时域传输计算
  - 上升时间、阻抗参数可配置
  - 阻抗不连续性检测
  - 分析报告生成
- [x] Smith圆图渲染器（`smith-chart.js`）
  - 等电阻圆、等电抗圆、等电导圆
  - 特殊点标注（短路、开路、匹配）

#### UI界面
- [x] Setting Bar（文件操作、主题切换）
- [x] Explore面板（文件树）
- [x] Plot Area（图表区域，支持标签切换）
- [x] SNP Port Mapping（端口映射显示）
- [x] TDR Calculate面板（参数配置）
- [x] Other Option面板（预留）
- [x] Info Bar（状态栏）
- [x] 深色/浅色主题切换

#### 图表功能
- [x] 幅度图（线性/dB）
- [x] 相位图
- [x] VSWR图
- [x] Smith圆图
- [x] 多曲线叠加显示
- [x] 图表导出（PNG/SVG/CSV）

#### Electron功能
- [x] 文件打开对话框
- [x] 文件保存对话框
- [x] 文件读写API
- [x] preload安全脚本

#### 文档
- [x] 架构评估报告
- [x] UI设计评估报告
- [x] 研发计划
- [x] 可视化报告页面

#### 测试
- [x] Touchstone解析器测试页面
- [x] TDR计算测试页面

---

### ⏳ 未完成

#### 依赖安装
- [ ] Electron二进制文件下载（需配置镜像源）

#### 打包部署
- [ ] Windows安装包构建（NSIS）
- [ ] 应用图标转换（SVG → ICO）

#### 功能完善
- [ ] Web Worker后台计算（避免UI阻塞）
- [ ] 文件拖拽打开
- [ ] 最近文件记录
- [ ] 快捷键支持
- [ ] 数据标注功能
- [ ] 图表缩放/平移优化
- [ ] 多文件数据对比
- [ ] 参数搜索/过滤

#### 测试
- [ ] 单元测试
- [ ] 集成测试
- [ ] 性能测试

---

### 📝 待确认需求

- Other Option面板具体功能（用户暂不实现）
- 数据标注的具体形式
- 图表导出的更多格式支持
