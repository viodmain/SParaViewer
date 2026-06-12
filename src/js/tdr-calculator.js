/**
 * TDR/TDT计算器
 * 支持时域反射(TDR)和时域传输(TDT)计算
 */

class TDRCalculator {
  constructor() {
    this.defaultConfig = {
      riseTime: 100e-12,    // 上升时间：100ps
      impedance: 50,        // 参考阻抗：50Ω
      numPoints: 1024,      // 采样点数
      windowType: 'hanning' // 窗函数类型
    };
  }

  /**
   * 计算TDR响应
   * @param {Object} sParamData - S参数数据
   * @param {Object} config - 配置参数
   * @returns {Object} TDR计算结果
   */
  calculateTDR(sParamData, config = {}) {
    const { frequencies, sParams, options } = sParamData;
    const { riseTime, impedance, numPoints } = { ...this.defaultConfig, ...config };

    // 获取S11参数（反射）
    const s11 = sParams['S11'];
    if (!s11) {
      throw new Error('缺少S11参数');
    }

    // 计算时间分辨率和总时间
    const maxFreq = Math.max(...frequencies);
    const dt = 1 / (2 * maxFreq);
    const totalTime = numPoints * dt;

    // 生成时间轴
    const time = Array.from({ length: numPoints }, (_, i) => i * dt);

    // 计算阶跃响应
    const stepResponse = this.computeStepResponse(s11, frequencies, time, riseTime);

    // 计算阻抗响应
    const impedanceResponse = stepResponse.map(v => {
      // TDR阻抗公式：Z = Z0 * (1 + Γ) / (1 - Γ)
      const gamma = v;
      if (Math.abs(gamma) >= 1) {
        return impedance * 10; // 限制最大阻抗
      }
      return impedance * (1 + gamma) / (1 - gamma);
    });

    return {
      type: 'tdr',
      time,
      response: impedanceResponse,
      rawResponse: stepResponse,
      config: {
        riseTime,
        impedance,
        numPoints,
        dt,
        totalTime
      },
      metadata: {
        minImpedance: Math.min(...impedanceResponse),
        maxImpedance: Math.max(...impedanceResponse),
        avgImpedance: impedanceResponse.reduce((a, b) => a + b, 0) / impedanceResponse.length
      }
    };
  }

  /**
   * 计算TDT响应
   * @param {Object} sParamData - S参数数据
   * @param {Object} config - 配置参数
   * @returns {Object} TDT计算结果
   */
  calculateTDT(sParamData, config = {}) {
    const { frequencies, sParams, options } = sParamData;
    const { riseTime, impedance, numPoints } = { ...this.defaultConfig, ...config };

    // 获取S21参数（传输）
    const s21 = sParams['S21'];
    if (!s21) {
      throw new Error('缺少S21参数');
    }

    // 计算时间分辨率和总时间
    const maxFreq = Math.max(...frequencies);
    const dt = 1 / (2 * maxFreq);
    const totalTime = numPoints * dt;

    // 生成时间轴
    const time = Array.from({ length: numPoints }, (_, i) => i * dt);

    // 计算阶跃响应
    const stepResponse = this.computeStepResponse(s21, frequencies, time, riseTime);

    // TDT响应是传输系数的阶跃响应
    const tdtResponse = stepResponse.map(v => (1 + v) / 2);

    return {
      type: 'tdt',
      time,
      response: tdtResponse,
      rawResponse: stepResponse,
      config: {
        riseTime,
        impedance,
        numPoints,
        dt,
        totalTime
      },
      metadata: {
        minResponse: Math.min(...tdtResponse),
        maxResponse: Math.max(...tdtResponse),
        delay: this.calculateDelay(tdtResponse, time)
      }
    };
  }

  /**
   * 计算阶跃响应
   */
  computeStepResponse(sParams, frequencies, time, riseTime) {
    const numPoints = time.length;
    const numFreqs = frequencies.length;
    const response = new Array(numPoints).fill(0);

    // 应用窗函数
    const window = this.applyWindow(numFreqs, 'hanning');

    for (let i = 0; i < numPoints; i++) {
      const t = time[i];
      let sum = 0;

      for (let j = 0; j < numFreqs; j++) {
        const freq = frequencies[j];
        const omega = 2 * Math.PI * freq;
        const s = sParams[j];

        // 幅度和相位
        const mag = Math.sqrt(s.real ** 2 + s.imag ** 2);
        const phase = Math.atan2(s.imag, s.real);

        // 阶跃响应：积分 sinc 函数
        const sincValue = omega * t > 0 ? Math.sin(omega * t) / (omega * t) : 1;

        // 应用上升时间滤波
        const riseTimeEffect = Math.exp(-(omega * riseTime / 2) ** 2);

        sum += mag * Math.cos(phase) * sincValue * riseTimeEffect * window[j];
      }

      response[i] = sum * 2 / numFreqs;
    }

    // 归一化
    const maxAbs = Math.max(...response.map(Math.abs));
    if (maxAbs > 0) {
      response.forEach((v, i) => response[i] = v / maxAbs);
    }

    return response;
  }

  /**
   * 应用窗函数
   */
  applyWindow(size, type) {
    const window = new Array(size);

    switch (type) {
      case 'hanning':
        for (let i = 0; i < size; i++) {
          window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (size - 1)));
        }
        break;

      case 'hamming':
        for (let i = 0; i < size; i++) {
          window[i] = 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (size - 1));
        }
        break;

      case 'blackman':
        for (let i = 0; i < size; i++) {
          window[i] = 0.42 - 0.5 * Math.cos(2 * Math.PI * i / (size - 1)) + 0.08 * Math.cos(4 * Math.PI * i / (size - 1));
        }
        break;

      case 'rectangular':
      default:
        window.fill(1);
        break;
    }

    return window;
  }

  /**
   * 计算传播延迟
   */
  calculateDelay(response, time) {
    // 找到响应达到50%的时间
    const threshold = 0.5;
    for (let i = 1; i < response.length; i++) {
      if (response[i - 1] < threshold && response[i] >= threshold) {
        // 线性插值
        const fraction = (threshold - response[i - 1]) / (response[i] - response[i - 1]);
        return time[i - 1] + fraction * (time[i] - time[i - 1]);
      }
    }
    return time[time.length - 1];
  }

  /**
   * 计算阻抗不连续性
   */
  findImpedanceDiscontinuities(tdrResult, threshold = 0.1) {
    const { response, time, config } = tdrResult;
    const discontinuities = [];

    // 计算响应的导数
    for (let i = 1; i < response.length; i++) {
      const derivative = Math.abs(response[i] - response[i - 1]) / (time[i] - time[i - 1]);

      if (derivative > threshold * config.impedance) {
        // 找到不连续点
        const startIdx = Math.max(0, i - 5);
        const endIdx = Math.min(response.length - 1, i + 5);

        const avgImpedance = response.slice(startIdx, endIdx + 1)
          .reduce((a, b) => a + b, 0) / (endIdx - startIdx + 1);

        discontinuities.push({
          time: time[i],
          distance: time[i] * 1.5e8 / 2, // 假设传播速度为1.5e8 m/s
          impedance: avgImpedance,
          severity: derivative / (threshold * config.impedance)
        });
      }
    }

    // 合并相邻的不连续点
    return this.mergeDiscontinuities(discontinuities);
  }

  /**
   * 合并相邻的不连续点
   */
  mergeDiscontinuities(discontinuities) {
    if (discontinuities.length === 0) return [];

    const merged = [discontinuities[0]];
    const minDistance = 1e-12; // 最小距离：1ps

    for (let i = 1; i < discontinuities.length; i++) {
      const last = merged[merged.length - 1];
      const current = discontinuities[i];

      if (current.time - last.time < minDistance) {
        // 合并
        last.impedance = (last.impedance + current.impedance) / 2;
        last.severity = Math.max(last.severity, current.severity);
      } else {
        merged.push(current);
      }
    }

    return merged;
  }

  /**
   * 生成报告
   */
  generateReport(tdrResult) {
    const { type, config, metadata } = tdrResult;

    let report = `TDR/TDT 分析报告\n`;
    report += `${'='.repeat(50)}\n\n`;

    report += `计算类型: ${type.toUpperCase()}\n`;
    report += `上升时间: ${(config.riseTime * 1e12).toFixed(2)} ps\n`;
    report += `参考阻抗: ${config.impedance} Ω\n`;
    report += `采样点数: ${config.numPoints}\n`;
    report += `时间分辨率: ${(config.dt * 1e12).toFixed(4)} ps\n`;
    report += `总时间: ${(config.totalTime * 1e12).toFixed(2)} ps\n\n`;

    if (type === 'tdr') {
      report += `阻抗统计:\n`;
      report += `  最小阻抗: ${metadata.minImpedance.toFixed(2)} Ω\n`;
      report += `  最大阻抗: ${metadata.maxImpedance.toFixed(2)} Ω\n`;
      report += `  平均阻抗: ${metadata.avgImpedance.toFixed(2)} Ω\n\n`;

      // 查找不连续性
      const discontinuities = this.findImpedanceDiscontinuities(tdrResult);
      if (discontinuities.length > 0) {
        report += `阻抗不连续性:\n`;
        discontinuities.forEach((d, i) => {
          report += `  ${i + 1}. 时间: ${(d.time * 1e12).toFixed(2)} ps, `;
          report += `距离: ${(d.distance * 100).toFixed(2)} cm, `;
          report += `阻抗: ${d.impedance.toFixed(2)} Ω\n`;
        });
      } else {
        report += `未发现明显的阻抗不连续性\n`;
      }
    } else {
      report += `传输统计:\n`;
      report += `  最小响应: ${metadata.minResponse.toFixed(4)}\n`;
      report += `  最大响应: ${metadata.maxResponse.toFixed(4)}\n`;
      report += `  传播延迟: ${(metadata.delay * 1e12).toFixed(2)} ps\n`;
    }

    return report;
  }
}

// 导出计算器
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TDRCalculator;
} else {
  window.TDRCalculator = TDRCalculator;
}
