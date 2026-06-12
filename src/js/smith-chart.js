/**
 * Smith圆图渲染器
 * 基于Plotly.js实现标准Smith圆图
 */

class SmithChart {
  constructor(container) {
    this.container = container;
    this.traces = [];
    this.shapes = [];
    this.annotations = [];
  }

  /**
   * 绘制Smith圆图
   * @param {Array} traces - S参数数据轨迹
   * @param {Object} options - 配置选项
   */
  draw(traces, options = {}) {
    const {
      showImpedanceCircles = true,
      showAdmittanceCircles = true,
      showReactanceCircles = true,
      width = 800,
      height = 600
    } = options;

    // 清空之前的图形
    this.shapes = [];
    this.annotations = [];

    // 绘制背景圆
    this.drawBackgroundCircles(showImpedanceCircles, showAdmittanceCircles, showReactanceCircles);

    // 准备数据轨迹
    const plotTraces = traces.map(trace => ({
      x: trace.real,
      y: trace.imag,
      name: trace.name,
      type: 'scatter',
      mode: 'lines+markers',
      marker: { size: 4 },
      line: { width: 2 }
    }));

    // 布局配置
    const layout = {
      title: {
        text: 'Smith圆图',
        font: { size: 16 }
      },
      xaxis: {
        title: '实部 (Γr)',
        range: [-1.15, 1.15],
        showgrid: false,
        zeroline: true,
        zerolinecolor: '#999',
        scaleanchor: 'y',
        scaleratio: 1
      },
      yaxis: {
        title: '虚部 (Γi)',
        range: [-1.15, 1.15],
        showgrid: false,
        zeroline: true,
        zerolinecolor: '#999'
      },
      margin: { t: 50, r: 30, b: 50, l: 50 },
      showlegend: true,
      legend: {
        x: 1.05,
        y: 1,
        xanchor: 'left',
        yanchor: 'top'
      },
      shapes: this.shapes,
      annotations: this.annotations,
      width,
      height,
      plot_bgcolor: '#fafafa',
      paper_bgcolor: '#ffffff'
    };

    const config = {
      responsive: true,
      displayModeBar: true,
      modeBarButtonsToRemove: ['lasso2d', 'select2d'],
      displaylogo: false
    };

    Plotly.newPlot(this.container, plotTraces, layout, config);
  }

  /**
   * 绘制背景圆
   */
  drawBackgroundCircles(showImpedance, showAdmittance, showReactance) {
    // 外圆（单位圆）
    this.shapes.push({
      type: 'circle',
      xref: 'x',
      yref: 'y',
      x0: -1,
      y0: -1,
      x1: 1,
      y1: 1,
      line: { color: '#333', width: 2 },
      fillcolor: 'transparent'
    });

    // 实轴
    this.shapes.push({
      type: 'line',
      xref: 'x',
      yref: 'y',
      x0: -1,
      y0: 0,
      x1: 1,
      y1: 0,
      line: { color: '#666', width: 1 }
    });

    if (showImpedance) {
      // 等电阻圆 (r = 0.2, 0.5, 1, 2, 5)
      const resistances = [0.2, 0.5, 1, 2, 5];
      resistances.forEach(r => {
        const center = r / (1 + r);
        const radius = 1 / (1 + r);
        this.shapes.push({
          type: 'circle',
          xref: 'x',
          yref: 'y',
          x0: center - radius,
          y0: -radius,
          x1: center + radius,
          y1: radius,
          line: { color: '#2196F3', width: 1, dash: 'dot' },
          fillcolor: 'transparent'
        });

        // 标注
        this.annotations.push({
          x: center + radius,
          y: 0,
          text: `r=${r}`,
          showarrow: false,
          font: { size: 10, color: '#2196F3' },
          xanchor: 'left',
          yanchor: 'middle'
        });
      });
    }

    if (showReactance) {
      // 等电抗圆 (x = ±0.2, ±0.5, ±1, ±2, ±5)
      const reactances = [0.2, 0.5, 1, 2, 5];
      reactances.forEach(x => {
        // 上半圆（正电抗）
        this.shapes.push({
          type: 'circle',
          xref: 'x',
          yref: 'y',
          x0: 1 - 1/x,
          y0: 1/x - Math.sqrt(1 + 1/(x*x)),
          x1: 1,
          y1: 1/x + Math.sqrt(1 + 1/(x*x)),
          line: { color: '#4CAF50', width: 1, dash: 'dot' },
          fillcolor: 'transparent'
        });

        // 下半圆（负电抗）
        this.shapes.push({
          type: 'circle',
          xref: 'x',
          yref: 'y',
          x0: 1 - 1/x,
          y0: -1/x - Math.sqrt(1 + 1/(x*x)),
          x1: 1,
          y1: -1/x + Math.sqrt(1 + 1/(x*x)),
          line: { color: '#F44336', width: 1, dash: 'dot' },
          fillcolor: 'transparent'
        });
      });
    }

    if (showAdmittance) {
      // 等电导圆 (g = 0.2, 0.5, 1, 2, 5)
      const conductances = [0.2, 0.5, 1, 2, 5];
      conductances.forEach(g => {
        const center = -g / (1 + g);
        const radius = 1 / (1 + g);
        this.shapes.push({
          type: 'circle',
          xref: 'x',
          yref: 'y',
          x0: center - radius,
          y0: -radius,
          x1: center + radius,
          y1: radius,
          line: { color: '#FF9800', width: 1, dash: 'dashdot' },
          fillcolor: 'transparent'
        });
      });
    }

    // 标注特殊点
    const specialPoints = [
      { x: -1, y: 0, text: '短路', color: '#F44336' },
      { x: 1, y: 0, text: '开路', color: '#4CAF50' },
      { x: 0, y: 0, text: '匹配', color: '#2196F3' }
    ];

    specialPoints.forEach(point => {
      this.annotations.push({
        x: point.x,
        y: point.y,
        text: point.text,
        showarrow: true,
        arrowhead: 2,
        arrowsize: 1,
        arrowwidth: 1,
        arrowcolor: point.color,
        font: { size: 12, color: point.color },
        xanchor: point.x < 0 ? 'right' : 'left',
        yanchor: 'bottom'
      });
    });
  }

  /**
   * 转换S参数为反射系数
   * @param {Array} sParams - S参数数组 [{real, imag}, ...]
   * @returns {Object} {real: [], imag: []}
   */
  static toReflectionCoefficients(sParams) {
    return {
      real: sParams.map(s => s.real),
      imag: sParams.map(s => s.imag)
    };
  }

  /**
   * 反射系数转归一化阻抗
   * @param {Object} gamma - {real, imag}
   * @param {number} z0 - 参考阻抗
   * @returns {Object} {real, imag}
   */
  static toImpedance(gamma, z0 = 50) {
    const { real: gr, imag: gi } = gamma;
    const denom = (1 - gr) ** 2 + gi ** 2;
    return {
      real: z0 * (1 - gr ** 2 - gi ** 2) / denom,
      imag: z0 * (2 * gi) / denom
    };
  }

  /**
   * 反射系数转归一化导纳
   * @param {Object} gamma - {real, imag}
   * @param {number} y0 - 参考导纳
   * @returns {Object} {real, imag}
   */
  static toAdmittance(gamma, y0 = 1/50) {
    // 导纳对应于反射系数的负值
    const negGamma = { real: -gamma.real, imag: -gamma.imag };
    const z = SmithChart.toImpedance(negGamma, 1/y0);
    return {
      real: z.real / (z.real ** 2 + z.imag ** 2),
      imag: -z.imag / (z.real ** 2 + z.imag ** 2)
    };
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SmithChart;
} else {
  window.SmithChart = SmithChart;
}
