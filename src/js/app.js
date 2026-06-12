/**
 * SParaViewer - S参数后处理软件
 * 主应用入口
 * 基于Electron桌面应用
 */

// 应用状态
const AppState = {
  files: new Map(),        // 已加载的文件
  activeFile: null,        // 当前活动文件
  activeTab: 'magnitude',  // 当前图表标签
  theme: 'light',          // 主题
  plotData: null           // 图表数据
};

// 初始化Touchstone解析器和TDR计算器
const parser = new TouchstoneParser();
const tdrCalculator = new TDRCalculator();

// DOM 元素引用
const DOM = {
  fileInput: document.getElementById('file-input'),
  btnOpen: document.getElementById('btn-open'),
  btnExport: document.getElementById('btn-export'),
  btnTheme: document.getElementById('btn-theme'),
  fileTree: document.getElementById('file-tree'),
  plotContainer: document.getElementById('plot-container'),
  plotTabs: document.getElementById('plot-tabs'),
  plotScale: document.getElementById('plot-scale'),
  portMapping: document.getElementById('port-mapping'),
  tdrType: document.getElementById('tdr-type'),
  riseTime: document.getElementById('rise-time'),
  impedance: document.getElementById('impedance'),
  btnCalculateTdr: document.getElementById('btn-calculate-tdr'),
  statusText: document.getElementById('status-text'),
  fileInfo: document.getElementById('file-info'),
  memoryUsage: document.getElementById('memory-usage')
};

/**
 * 应用初始化
 */
function initApp() {
  // 绑定事件
  bindEvents();

  // 初始化主题
  initTheme();

  // 更新状态
  updateStatus('就绪');

  console.log('SParaViewer 已初始化');
}

/**
 * 绑定事件处理器
 */
function bindEvents() {
  // 打开文件
  DOM.btnOpen.addEventListener('click', handleOpenFile);
  DOM.fileInput.addEventListener('change', handleFileInputChange);

  // 导出图表
  DOM.btnExport.addEventListener('click', handleExportChart);

  // 主题切换
  DOM.btnTheme.addEventListener('click', toggleTheme);

  // 图表标签切换
  DOM.plotTabs.addEventListener('click', handleTabClick);

  // 图表缩放
  DOM.plotScale.addEventListener('change', handleScaleChange);

  // TDR计算
  DOM.btnCalculateTdr.addEventListener('click', handleCalculateTDR);
}

/**
 * 处理打开文件
 */
async function handleOpenFile() {
  // 检查是否在Electron环境
  if (window.electronAPI) {
    const files = await window.electronAPI.openFile();
    if (files && files.length > 0) {
      loadFiles(files);
    }
  } else {
    // 浏览器环境：使用file input
    DOM.fileInput.click();
  }
}

/**
 * 处理文件输入变化
 */
function handleFileInputChange(event) {
  const fileList = event.target.files;
  if (fileList.length > 0) {
    const files = Array.from(fileList).map(file => ({
      path: file.name,
      name: file.name,
      file: file
    }));
    loadFiles(files);
  }
}

/**
 * 加载文件
 */
async function loadFiles(fileList) {
  updateStatus('正在加载文件...');

  for (const fileInfo of fileList) {
    try {
      let content;
      if (fileInfo.content) {
        // Electron环境：已有内容
        content = fileInfo.content;
      } else if (fileInfo.file) {
        // 浏览器环境：读取文件
        content = await readFileAsText(fileInfo.file);
      }

      // 使用TouchstoneParser解析文件
      const parsedData = parser.parse(content, fileInfo.name);

      // 存储到状态
      AppState.files.set(fileInfo.name, {
        path: fileInfo.path,
        name: fileInfo.name,
        data: parsedData,
        content: content
      });

      // 更新UI
      updateFileTree();
      updateFileInfo();

      // 如果是第一个文件，自动选中
      if (AppState.files.size === 1) {
        selectFile(fileInfo.name);
      }

      updateStatus(`已加载: ${fileInfo.name}`);
      showToast(`成功加载: ${fileInfo.name}`, 'success');
    } catch (error) {
      console.error(`加载文件失败: ${fileInfo.name}`, error);
      showToast(`加载失败: ${error.message}`, 'error');
    }
  }
}

/**
 * 读取文件为文本
 */
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
}

/**
 * 更新文件树
 */
function updateFileTree() {
  if (AppState.files.size === 0) {
    DOM.fileTree.innerHTML = `
      <div class="file-tree__empty">
        <p>暂无文件</p>
        <p class="hint">点击"打开文件"添加S参数文件</p>
      </div>
    `;
    return;
  }

  let html = '';
  for (const [name, file] of AppState.files) {
    const isActive = name === AppState.activeFile;
    html += `
      <div class="file-tree__item ${isActive ? 'active' : ''}" data-file="${name}">
        <span class="icon">📊</span>
        <span class="name">${name}</span>
        <span class="ports">${file.data.numPorts}P</span>
      </div>
    `;
  }

  DOM.fileTree.innerHTML = html;

  // 绑定点击事件
  DOM.fileTree.querySelectorAll('.file-tree__item').forEach(item => {
    item.addEventListener('click', () => {
      selectFile(item.dataset.file);
    });
  });
}

/**
 * 选择文件
 */
function selectFile(filename) {
  AppState.activeFile = filename;
  const file = AppState.files.get(filename);

  if (file) {
    // 更新UI
    updateFileTree();
    updatePortMapping(file.data);
    updatePlot();
    updateFileInfo();

    // 启用按钮
    DOM.btnExport.disabled = false;
    DOM.btnCalculateTdr.disabled = false;
  }
}

/**
 * 更新端口映射
 */
function updatePortMapping(data) {
  const { numPorts, sParams } = data;

  let html = '<table class="port-mapping-table"><thead><tr><th>参数</th>';
  for (let j = 1; j <= numPorts; j++) {
    html += `<th>Port ${j}</th>`;
  }
  html += '</tr></thead><tbody>';

  for (let i = 1; i <= numPorts; i++) {
    html += `<tr><td>Port ${i}</td>`;
    for (let j = 1; j <= numPorts; j++) {
      html += `<td>S${i}${j}</td>`;
    }
    html += '</tr>';
  }

  html += '</tbody></table>';

  // 添加参数列表
  html += '<div class="param-list" style="margin-top: 12px;">';
  for (const key of Object.keys(sParams)) {
    html += `<span class="param-tag" data-param="${key}">${key}</span>`;
  }
  html += '</div>';

  DOM.portMapping.innerHTML = html;

  // 绑定参数点击事件
  DOM.portMapping.querySelectorAll('.param-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      tag.classList.toggle('active');
      updatePlot();
    });
  });
}

/**
 * 更新图表
 */
function updatePlot() {
  const file = AppState.files.get(AppState.activeFile);
  if (!file) return;

  const { data } = file;
  const { frequencies, sParams, options } = data;
  const scale = DOM.plotScale.value;

  // 获取选中的参数
  const selectedParams = [];
  DOM.portMapping.querySelectorAll('.param-tag.active').forEach(tag => {
    selectedParams.push(tag.dataset.param);
  });

  // 如果没有选中参数，默认选中S11和S21
  if (selectedParams.length === 0) {
    selectedParams.push('S11', 'S21');
    // 更新UI
    DOM.portMapping.querySelectorAll('.param-tag').forEach(tag => {
      if (['S11', 'S21'].includes(tag.dataset.param)) {
        tag.classList.add('active');
      }
    });
  }

  // 准备图表数据
  const traces = [];
  const freqInGHz = frequencies.map(f => f / 1e9); // 转换为GHz显示

  for (const param of selectedParams) {
    const values = sParams[param];
    if (!values) continue;

    let yValues;
    if (AppState.activeTab === 'magnitude') {
      yValues = values.map(v => {
        return scale === 'dB' ? TouchstoneParser.magnitudeDB(v) : TouchstoneParser.magnitude(v);
      });
    } else if (AppState.activeTab === 'phase') {
      yValues = values.map(v => TouchstoneParser.phase(v));
    } else if (AppState.activeTab === 'vswr') {
      yValues = values.map(v => TouchstoneParser.vswr(v));
    }

    traces.push({
      x: freqInGHz,
      y: yValues,
      name: param,
      type: 'scatter',
      mode: 'lines'
    });
  }

  // 图表配置
  const config = {
    responsive: true,
    displayModeBar: true,
    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
    displaylogo: false
  };

  // 图表布局
  const layout = {
    title: `${AppState.activeTab === 'magnitude' ? '幅度' : AppState.activeTab === 'phase' ? '相位' : AppState.activeTab === 'vswr' ? 'VSWR' : 'Smith圆图'}`,
    xaxis: {
      title: '频率 (GHz)',
      showgrid: true
    },
    yaxis: {
      title: getYAxisTitle(),
      showgrid: true
    },
    margin: { t: 40, r: 20, b: 50, l: 60 },
    showlegend: true,
    legend: {
      x: 1,
      y: 1,
      xanchor: 'right'
    }
  };

  // 渲染图表
  if (AppState.activeTab === 'smith') {
    renderSmithChart(traces);
  } else {
    Plotly.newPlot(DOM.plotContainer, traces, layout, config);
  }

  // 存储图表数据
  AppState.plotData = { traces, layout, config };
}

/**
 * 获取Y轴标题
 */
function getYAxisTitle() {
  const scale = DOM.plotScale.value;
  switch (AppState.activeTab) {
    case 'magnitude':
      return scale === 'dB' ? '幅度 (dB)' : '幅度 (线性)';
    case 'phase':
      return '相位 (度)';
    case 'vswr':
      return 'VSWR';
    default:
      return '';
  }
}

/**
 * 渲染Smith圆图
 */
function renderSmithChart(traces) {
  if (!traces || traces.length === 0) {
    DOM.plotContainer.innerHTML = `
      <div class="plot-placeholder">
        <p>请先选择S参数</p>
      </div>
    `;
    return;
  }

  const file = AppState.files.get(AppState.activeFile);
  if (!file) return;

  // 准备Smith圆图数据
  const smithTraces = [];

  for (const trace of traces) {
    const param = trace.name;
    const sParamValues = file.data.sParams[param];
    if (!sParamValues) continue;

    // 转换为反射系数
    const gamma = SmithChart.toReflectionCoefficients(sParamValues);

    smithTraces.push({
      real: gamma.real,
      imag: gamma.imag,
      name: param
    });
  }

  // 使用SmithChart类绘制
  const smithChart = new SmithChart(DOM.plotContainer);
  smithChart.draw(smithTraces, {
    showImpedanceCircles: true,
    showAdmittanceCircles: true,
    showReactanceCircles: true
  });
}

/**
 * 处理标签点击
 */
function handleTabClick(event) {
  if (event.target.classList.contains('tab')) {
    // 更新活动标签
    DOM.plotTabs.querySelectorAll('.tab').forEach(tab => {
      tab.classList.remove('active');
    });
    event.target.classList.add('active');

    // 更新状态
    AppState.activeTab = event.target.dataset.tab;

    // 更新图表
    updatePlot();
  }
}

/**
 * 处理缩放变化
 */
function handleScaleChange() {
  updatePlot();
}

/**
 * 处理TDR计算
 */
function handleCalculateTDR() {
  const file = AppState.files.get(AppState.activeFile);
  if (!file) {
    showToast('请先加载S参数文件', 'warning');
    return;
  }

  const tdrType = DOM.tdrType.value;
  const riseTime = parseFloat(DOM.riseTime.value) * 1e-12; // 转换为秒
  const impedance = parseFloat(DOM.impedance.value);

  updateStatus(`正在计算 ${tdrType.toUpperCase()}...`);

  try {
    const config = {
      riseTime,
      impedance,
      numPoints: 1024
    };

    let result;
    if (tdrType === 'tdr') {
      result = tdrCalculator.calculateTDR(file.data, config);
    } else {
      result = tdrCalculator.calculateTDT(file.data, config);
    }

    // 显示结果图表
    displayTDRResult(result);

    // 生成报告
    const report = tdrCalculator.generateReport(result);
    console.log(report);

    showToast(`${tdrType.toUpperCase()} 计算完成`, 'success');
    updateStatus('就绪');
  } catch (error) {
    console.error('TDR计算失败:', error);
    showToast(`计算失败: ${error.message}`, 'error');
    updateStatus('计算失败');
  }
}

/**
 * 显示TDR/TDT计算结果
 */
function displayTDRResult(result) {
  const { type, time, response, config } = result;

  // 转换时间单位为ps
  const timeInPs = time.map(t => t * 1e12);

  const trace = {
    x: timeInPs,
    y: response,
    type: 'scatter',
    mode: 'lines',
    name: type.toUpperCase(),
    line: {
      color: type === 'tdr' ? '#2196F3' : '#4CAF50',
      width: 2
    }
  };

  const layout = {
    title: `${type.toUpperCase()} 响应`,
    xaxis: {
      title: '时间 (ps)',
      showgrid: true
    },
    yaxis: {
      title: type === 'tdr' ? '阻抗 (Ω)' : '响应幅度',
      showgrid: true
    },
    margin: { t: 40, r: 20, b: 50, l: 60 },
    showlegend: true
  };

  const plotConfig = {
    responsive: true,
    displayModeBar: true,
    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
    displaylogo: false
  };

  // 在TDR面板中显示图表
  const tdrContainer = document.getElementById('tdr-calculate');
  let chartDiv = tdrContainer.querySelector('.tdr-chart');

  if (!chartDiv) {
    chartDiv = document.createElement('div');
    chartDiv.className = 'tdr-chart';
    chartDiv.style.width = '100%';
    chartDiv.style.height = '200px';
    tdrContainer.appendChild(chartDiv);
  }

  Plotly.newPlot(chartDiv, [trace], layout, plotConfig);
}

/**
 * 处理导出图表
 */
async function handleExportChart() {
  if (!AppState.plotData) {
    showToast('没有可导出的图表', 'warning');
    return;
  }

  // 检查是否在Electron环境
  if (window.electronAPI) {
    const filePath = await window.electronAPI.saveFile({
      filters: [
        { name: 'PNG图片', extensions: ['png'] },
        { name: 'SVG图片', extensions: ['svg'] },
        { name: 'CSV数据', extensions: ['csv'] }
      ]
    });

    if (filePath) {
      try {
        // 根据文件扩展名选择格式
        const ext = filePath.split('.').pop().toLowerCase();

        if (ext === 'csv') {
          // 导出CSV数据
          await exportCSV(filePath);
        } else {
          // 导出图片
          const format = ext === 'svg' ? 'svg' : 'png';
          const imgData = await Plotly.toImage(DOM.plotContainer, {
            format: format,
            width: 1200,
            height: 800
          });

          // 在Electron中保存文件
          const base64Data = imgData.replace(/^data:image\/\w+;base64,/, '');
          await window.electronAPI.writeFile(filePath, base64Data, 'base64');
        }

        showToast('图表已导出', 'success');
      } catch (error) {
        showToast('导出失败: ' + error.message, 'error');
      }
    }
  } else {
    // 浏览器环境：使用Plotly内置导出
    Plotly.downloadImage(DOM.plotContainer, {
      format: 'png',
      width: 1200,
      height: 800,
      filename: 'sparaviewer_chart'
    });
  }
}

/**
 * 导出CSV数据
 */
async function exportCSV(filePath) {
  const file = AppState.files.get(AppState.activeFile);
  if (!file) throw new Error('没有选中的文件');

  const { data } = file;
  const { frequencies, sParams, options } = data;

  // 构建CSV内容
  let csv = 'Frequency(GHz)';

  // 添加表头
  const params = Object.keys(sParams);
  for (const param of params) {
    csv += `,${param}_Real,${param}_Imag,${param}_Mag_dB,${param}_Phase_deg`;
  }
  csv += '\n';

  // 添加数据行
  for (let i = 0; i < frequencies.length; i++) {
    csv += (frequencies[i] / 1e9).toFixed(6);

    for (const param of params) {
      const v = sParams[param][i];
      const mag = TouchstoneParser.magnitudeDB(v);
      const phase = TouchstoneParser.phase(v);
      csv += `,${v.real.toFixed(6)},${v.imag.toFixed(6)},${mag.toFixed(4)},${phase.toFixed(2)}`;
    }
    csv += '\n';
  }

  // 写入文件
  await window.electronAPI.writeFile(filePath, csv);
}

/**
 * 初始化主题
 */
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  setTheme(savedTheme);
}

/**
 * 切换主题
 */
function toggleTheme() {
  const newTheme = AppState.theme === 'light' ? 'dark' : 'light';
  setTheme(newTheme);
}

/**
 * 设置主题
 */
function setTheme(theme) {
  AppState.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);

  // 更新图标
  DOM.btnTheme.textContent = theme === 'light' ? '🌙' : '☀️';
}

/**
 * 更新状态
 */
function updateStatus(text) {
  DOM.statusText.textContent = text;
}

/**
 * 更新文件信息
 */
function updateFileInfo() {
  const count = AppState.files.size;
  DOM.fileInfo.textContent = count > 0 ? `已加载 ${count} 个文件` : '未加载文件';
}

/**
 * 显示Toast通知
 */
function showToast(message, type = 'info') {
  // 移除现有的toast
  const existingToasts = document.querySelectorAll('.toast');
  existingToasts.forEach(toast => toast.remove());

  // 创建toast容器（如果不存在）
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  // 创建toast
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  // 3秒后自动移除
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// 初始化应用
document.addEventListener('DOMContentLoaded', initApp);
