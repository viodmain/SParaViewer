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
  theme: 'dark',           // 主题 (默认深色)
  plotData: null,          // 图表数据
  selectedParams: new Set() // 已选中的S参数
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
  btnAnalyzeSnp: document.getElementById('btn-analyze-snp'),
  snpResults: document.getElementById('snp-results'),
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
  updateStatus('Ready');

  console.log('SParaViewer initialized');
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

  // S-Parameter Validation
  DOM.btnAnalyzeSnp.addEventListener('click', handleAnalyzeSnp);
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
  updateStatus('Loading files...');

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

      updateStatus(`Loaded: ${fileInfo.name}`);
      showToast(`Loaded: ${fileInfo.name}`, 'success');
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
        <p>No files loaded</p>
        <p class="hint">Click "Open File" to add S-parameter files</p>
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
        <span class="file-tree__close" data-file="${name}" title="Remove">✕</span>
      </div>
    `;
  }

  DOM.fileTree.innerHTML = html;

  // 绑定点击事件
  DOM.fileTree.querySelectorAll('.file-tree__item').forEach(item => {
    item.addEventListener('click', (e) => {
      // 点击关闭按钮时不选中文件
      if (e.target.classList.contains('file-tree__close')) return;
      selectFile(item.dataset.file);
    });
  });

  // 绑定关闭按钮事件
  DOM.fileTree.querySelectorAll('.file-tree__close').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeFile(btn.dataset.file);
    });
  });
}

/**
 * 移除文件
 */
function removeFile(filename) {
  AppState.files.delete(filename);

  // 如果移除的是当前活动文件，切换到第一个文件
  if (AppState.activeFile === filename) {
    AppState.activeFile = null;
    const firstFile = AppState.files.keys().next().value;
    if (firstFile) {
      selectFile(firstFile);
    } else {
      // 没有文件了，清空图表和面板
      Plotly.purge(DOM.plotContainer);
      const placeholder = DOM.plotContainer.querySelector('.plot-placeholder');
      if (placeholder) {
        placeholder.style.display = '';
        placeholder.querySelector('p').textContent = 'Open an S-parameter file to start analysis';
      }
      DOM.portMapping.innerHTML = '<p class="placeholder">Load a file to view port mapping</p>';
      DOM.btnExport.disabled = true;
      DOM.btnCalculateTdr.disabled = true;
      DOM.btnAnalyzeSnp.disabled = true;
      AppState.plotData = null;
    }
  }

  updateFileTree();
  updateFileInfo();
  showToast(`Removed: ${filename}`, 'info');
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
    DOM.btnAnalyzeSnp.disabled = false;
  }
}

/**
 * 更新端口映射
 */
function updatePortMapping(data) {
  const { numPorts, sParams } = data;

  // 重置选中参数
  AppState.selectedParams.clear();
  // 默认选中 S11 和 S21
  if (sParams['S11']) AppState.selectedParams.add('S11');
  if (sParams['S21']) AppState.selectedParams.add('S21');

  let html = '<table class="port-mapping-table"><thead><tr><th>From \\ To</th>';
  for (let j = 1; j <= numPorts; j++) {
    html += `<th>Port ${j}</th>`;
  }
  html += '</tr></thead><tbody>';

  for (let i = 1; i <= numPorts; i++) {
    html += `<tr data-row="${i}"><td class="row-header">Port ${i}</td>`;
    for (let j = 1; j <= numPorts; j++) {
      const param = `S${i}${j}`;
      const isActive = AppState.selectedParams.has(param);
      html += `<td class="param-cell ${isActive ? 'active' : ''}" data-param="${param}">${param}</td>`;
    }
    html += '</tr>';
  }

  html += '</tbody></table>';

  DOM.portMapping.innerHTML = html;

  // 绑定单元格点击事件 — 点击切换S参数选中状态
  DOM.portMapping.querySelectorAll('.param-cell').forEach(cell => {
    cell.addEventListener('click', () => {
      const param = cell.dataset.param;
      if (AppState.selectedParams.has(param)) {
        AppState.selectedParams.delete(param);
        cell.classList.remove('active');
      } else {
        AppState.selectedParams.add(param);
        cell.classList.add('active');
      }
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

  // 隐藏占位符
  const placeholder = DOM.plotContainer.querySelector('.plot-placeholder');
  if (placeholder) placeholder.style.display = 'none';

  // 使用 AppState.selectedParams
  const selectedParams = Array.from(AppState.selectedParams);

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

  // 如果没有选中参数，显示提示
  if (traces.length === 0 && AppState.activeTab !== 'smith') {
    Plotly.purge(DOM.plotContainer);
    if (placeholder) {
      placeholder.style.display = '';
      placeholder.querySelector('p').textContent = 'Select S-parameters from Port Mapping';
    }
    return;
  }

  // 图表配置
  const config = {
    responsive: true,
    displayModeBar: true,
    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
    displaylogo: false
  };

  // 图表布局 (深色主题适配)
  const isDark = AppState.theme === 'dark';
  const isLog = scale === 'log';
  const layout = {
    title: {
      text: AppState.activeTab === 'magnitude' ? 'Magnitude' : AppState.activeTab === 'phase' ? 'Phase' : AppState.activeTab === 'vswr' ? 'VSWR' : 'Smith Chart',
      font: { color: isDark ? '#cccccc' : '#333333' }
    },
    xaxis: {
      title: 'Frequency (GHz)',
      type: isLog ? 'log' : 'linear',
      showgrid: true,
      gridcolor: isDark ? '#3c3c3c' : '#e0e0e0',
      color: isDark ? '#969696' : '#616161'
    },
    yaxis: {
      title: getYAxisTitle(),
      showgrid: true,
      gridcolor: isDark ? '#3c3c3c' : '#e0e0e0',
      color: isDark ? '#969696' : '#616161'
    },
    margin: { t: 40, r: 20, b: 50, l: 60 },
    showlegend: true,
    legend: {
      x: 1,
      y: 1,
      xanchor: 'right',
      font: { color: isDark ? '#cccccc' : '#333333' }
    },
    paper_bgcolor: isDark ? '#1e1e1e' : '#ffffff',
    plot_bgcolor: isDark ? '#1e1e1e' : '#ffffff'
  };

  // 渲染图表
  if (AppState.activeTab === 'smith') {
    renderSmithChart(traces);
  } else {
    // 恢复容器大小（Smith 圆图会修改为正方形）
    DOM.plotContainer.style.width = '';
    DOM.plotContainer.style.height = '';
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
      return scale === 'dB' ? 'Magnitude (dB)' : 'Magnitude (Linear)';
    case 'phase':
      return 'Phase (deg)';
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
        <p>Select S-parameters from Port Mapping</p>
      </div>
    `;
    return;
  }

  const file = AppState.files.get(AppState.activeFile);
  if (!file) return;

  // 强制容器为正方形（Smith 圆图需要等比例坐标）
  const rect = DOM.plotContainer.getBoundingClientRect();
  const size = Math.min(rect.width, rect.height);
  DOM.plotContainer.style.width = size + 'px';
  DOM.plotContainer.style.height = size + 'px';

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
    showToast('Please load an S-parameter file first', 'warning');
    return;
  }

  const tdrType = DOM.tdrType.value;
  const riseTime = parseFloat(DOM.riseTime.value) * 1e-12; // 转换为秒
  const impedance = parseFloat(DOM.impedance.value);

  updateStatus(`Calculating ${tdrType.toUpperCase()}...`);

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

    showToast(`${tdrType.toUpperCase()} calculation complete`, 'success');
    updateStatus('Ready');
  } catch (error) {
    console.error('TDR calculation failed:', error);
    showToast(`Calculation failed: ${error.message}`, 'error');
    updateStatus('Calculation failed');
  }
}

/**
 * 显示TDR/TDT计算结果（在主 Plot 区域）
 */
function displayTDRResult(result) {
  const { type, time, response, config } = result;

  // 隐藏占位符
  const placeholder = DOM.plotContainer.querySelector('.plot-placeholder');
  if (placeholder) placeholder.style.display = 'none';

  // 转换时间单位为ps
  const timeInPs = time.map(t => t * 1e12);

  const isDark = AppState.theme === 'dark';
  const trace = {
    x: timeInPs,
    y: response,
    type: 'scatter',
    mode: 'lines',
    name: type.toUpperCase(),
    line: {
      color: type === 'tdr' ? '#569cd6' : '#4ec9b0',
      width: 2
    }
  };

  const layout = {
    title: {
      text: `${type.toUpperCase()} Response`,
      font: { color: isDark ? '#cccccc' : '#333333' }
    },
    xaxis: {
      title: 'Time (ps)',
      showgrid: true,
      gridcolor: isDark ? '#3c3c3c' : '#e0e0e0',
      color: isDark ? '#969696' : '#616161'
    },
    yaxis: {
      title: type === 'tdr' ? 'Impedance (Ω)' : 'Response',
      showgrid: true,
      gridcolor: isDark ? '#3c3c3c' : '#e0e0e0',
      color: isDark ? '#969696' : '#616161'
    },
    paper_bgcolor: isDark ? '#1e1e1e' : '#ffffff',
    plot_bgcolor: isDark ? '#1e1e1e' : '#ffffff',
    margin: { t: 40, r: 20, b: 50, l: 60 },
    showlegend: true,
    legend: {
      font: { color: isDark ? '#cccccc' : '#333333' }
    }
  };

  const plotConfig = {
    responsive: true,
    displayModeBar: true,
    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
    displaylogo: false
  };

  // 在主 Plot 区域显示图表
  Plotly.newPlot(DOM.plotContainer, [trace], layout, plotConfig);

  // 存储图表数据（支持导出）
  AppState.plotData = { traces: [trace], layout, config: plotConfig };
}

/**
 * 处理 S-Parameter Validation 分析
 */
function handleAnalyzeSnp() {
  const file = AppState.files.get(AppState.activeFile);
  if (!file) {
    showToast('Please load an S-parameter file first', 'warning');
    return;
  }

  updateStatus('Analyzing S-parameters...');
  DOM.btnAnalyzeSnp.disabled = true;

  // Use setTimeout to allow UI to update before heavy computation
  setTimeout(() => {
    try {
      const result = SNPValidator.analyze(file.data);
      displaySnpResults(result);
      showToast('Analysis complete', 'success');
      updateStatus('Ready');
    } catch (error) {
      console.error('S-parameter analysis failed:', error);
      showToast('Analysis failed: ' + error.message, 'error');
      updateStatus('Analysis failed');
    }
    DOM.btnAnalyzeSnp.disabled = false;
  }, 50);
}

/**
 * 显示 S-Parameter Validation 结果
 */
function displaySnpResults(result) {
  const { passivity, reciprocity, causality, overallPass } = result;

  // Build causality top-5 worst
  const causalitySorted = Object.entries(causality.details)
    .sort((a, b) => b[1].ratio - a[1].ratio)
    .slice(0, 5);

  const causalityTable = causalitySorted.map(([param, d]) =>
    `<tr><td>${param}</td><td>${(d.ratio * 100).toFixed(2)}%</td><td class="${d.causal ? '' : 'val-bad'}">${d.causal ? 'OK' : 'FAIL'}</td></tr>`
  ).join('');

  // Reciprocity details: per-pair max diff
  const file = AppState.files.get(AppState.activeFile);
  const nP = file.data.numPorts;
  let reciprocityRows = '';
  for (let i = 1; i <= nP; i++) {
    for (let j = i + 1; j <= nP; j++) {
      const aKey = `S${i}${j}`, bKey = `S${j}${i}`;
      const aVals = file.data.sParams[aKey];
      const bVals = file.data.sParams[bKey];
      let maxD = 0, maxF = 0;
      for (let k = 0; k < aVals.length; k++) {
        const d = Math.sqrt((aVals[k].real - bVals[k].real) ** 2 + (aVals[k].imag - bVals[k].imag) ** 2);
        if (d > maxD) { maxD = d; maxF = file.data.frequencies[k]; }
      }
      const bad = maxD > reciprocity.tolerance;
      reciprocityRows += `<tr><td>${aKey}/${bKey}</td><td class="${bad ? 'val-bad' : ''}">${maxD.toFixed(6)}</td><td>${(maxF / 1e6).toFixed(2)} MHz</td></tr>`;
    }
  }

  DOM.snpResults.innerHTML = `
    <div class="snp-check-row" data-detail="detail-passivity">
      <span class="snp-check-badge ${passivity.pass ? 'snp-check-badge--pass' : 'snp-check-badge--fail'}">${passivity.pass ? '✓' : '✗'}</span>
      <span class="snp-check-label">Passivity</span>
      <span class="snp-check-metric">σ_max=${passivity.maxSV.toFixed(6)}</span>
    </div>
    <div class="snp-check-detail" id="detail-passivity">
      <table>
        <tr><td>Max singular value</td><td>${passivity.maxSV.toFixed(8)}</td></tr>
        <tr><td>Violations</td><td class="${passivity.pass ? '' : 'val-bad'}">${passivity.violations} / ${file.data.frequencies.length} (${passivity.violationPct}%)</td></tr>
        ${passivity.pass ? '' : `<tr><td>Worst freq</td><td>${passivity.worstFreq}</td></tr>`}
      </table>
    </div>

    <div class="snp-check-row" data-detail="detail-reciprocity">
      <span class="snp-check-badge ${reciprocity.pass ? 'snp-check-badge--pass' : 'snp-check-badge--fail'}">${reciprocity.pass ? '✓' : '✗'}</span>
      <span class="snp-check-label">Reciprocity</span>
      <span class="snp-check-metric">max Δ=${reciprocity.maxDiff.toFixed(4)}</span>
    </div>
    <div class="snp-check-detail" id="detail-reciprocity">
      <table>
        <tr><td>Tolerance</td><td>${reciprocity.tolerance}</td></tr>
        <tr><td>Violations</td><td class="${reciprocity.pass ? '' : 'val-bad'}">${reciprocity.violations} pairs</td></tr>
        <tr><td colspan="3" style="padding-top:4px;font-weight:600;">Per-pair max |Sij-Sji|:</td></tr>
        ${reciprocityRows}
      </table>
    </div>

    <div class="snp-check-row" data-detail="detail-causality">
      <span class="snp-check-badge ${causality.pass ? 'snp-check-badge--pass' : 'snp-check-badge--fail'}">${causality.pass ? '✓' : '✗'}</span>
      <span class="snp-check-label">Causality</span>
      <span class="snp-check-metric">${causality.pass ? 'All OK' : 'Has violations'}</span>
    </div>
    <div class="snp-check-detail" id="detail-causality">
      <table>
        <tr><td>Negative-time energy ratio (top 5):</td></tr>
        <tr><td><b>Param</b></td><td><b>Ratio</b></td><td><b>Status</b></td></tr>
        ${causalityTable}
      </table>
    </div>

    <div style="margin-top: 8px; font-weight: 600; color: ${overallPass ? 'var(--color-success)' : 'var(--color-danger)'}">
      Overall: ${overallPass ? 'ALL PASS ✓' : 'HAS FAILURES ✗'}
    </div>
  `;

  // Bind expand/collapse on check rows
  DOM.snpResults.querySelectorAll('.snp-check-row').forEach(row => {
    row.addEventListener('click', () => {
      const detailId = row.dataset.detail;
      const detail = document.getElementById(detailId);
      if (detail) detail.classList.toggle('expanded');
    });
  });
}

/**
 * 处理导出图表
 */
async function handleExportChart() {
  if (!AppState.plotData) {
    showToast('No chart to export', 'warning');
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

        showToast('Chart exported', 'success');
      } catch (error) {
        showToast('Export failed: ' + error.message, 'error');
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
  const savedTheme = localStorage.getItem('theme') || 'dark';
  setTheme(savedTheme);
}

/**
 * 切换主题
 */
function toggleTheme() {
  const newTheme = AppState.theme === 'light' ? 'dark' : 'light';
  setTheme(newTheme);
  // 切换主题后重绘图表以适配新配色
  if (AppState.activeFile) {
    updatePlot();
  }
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
  // 更新setting bar背景色
  const settingBar = document.querySelector('.setting-bar');
  if (settingBar) {
    settingBar.style.backgroundColor = theme === 'dark' ? '#323233' : '#0078d4';
    settingBar.style.color = theme === 'dark' ? '#cccccc' : '#ffffff';
  }
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
  DOM.fileInfo.textContent = count > 0 ? `${count} file(s) loaded` : 'No file loaded';
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

/**
 * 初始化面板拖拽调整大小
 */
function initResize() {
  const explorePanel = document.getElementById('explore-panel');
  const centerArea = document.querySelector('.center-area');
  const plotArea = document.querySelector('.plot-area');
  const bottomPanels = document.getElementById('bottom-panels');
  const resizeExplore = document.getElementById('resize-explore');
  const resizePlot = document.getElementById('resize-plot');

  // Explore 面板 <-> Center Area 水平拖拽
  let isResizingExplore = false;
  resizeExplore.addEventListener('mousedown', (e) => {
    isResizingExplore = true;
    resizeExplore.classList.add('active');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  // Plot Area <-> Bottom Panels 垂直拖拽
  let isResizingPlot = false;
  resizePlot.addEventListener('mousedown', (e) => {
    isResizingPlot = true;
    resizePlot.classList.add('active');
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (isResizingExplore) {
      const newWidth = Math.max(150, Math.min(500, e.clientX));
      explorePanel.style.width = newWidth + 'px';
    }
    if (isResizingPlot) {
      const mainContent = document.querySelector('.main-content');
      const mainRect = mainContent.getBoundingClientRect();
      const offsetFromTop = e.clientY - mainRect.top;
      const totalHeight = mainRect.height;
      const plotHeight = Math.max(200, Math.min(totalHeight - 120, offsetFromTop));
      const bottomHeight = totalHeight - plotHeight - 4; // 4 = handle height
      plotArea.style.flex = 'none';
      plotArea.style.height = plotHeight + 'px';
      bottomPanels.style.height = Math.max(100, bottomHeight) + 'px';
    }
  });

  document.addEventListener('mouseup', () => {
    if (isResizingExplore) {
      isResizingExplore = false;
      resizeExplore.classList.remove('active');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      // 触发 Plotly 自适应
      if (window.Plotly) {
        Plotly.Plots.resize(DOM.plotContainer);
      }
    }
    if (isResizingPlot) {
      isResizingPlot = false;
      resizePlot.classList.remove('active');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (window.Plotly) {
        Plotly.Plots.resize(DOM.plotContainer);
      }
    }
  });
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
  initApp();
  initResize();
});
