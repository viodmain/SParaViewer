/**
 * Touchstone文件解析器
 * 支持Touchstone 1.0和2.0格式
 * 支持.s1p到.s10p的S参数文件
 */

class TouchstoneParser {
  constructor() {
    this.supportedFormats = ['MA', 'DB', 'RI'];
    this.supportedUnits = ['HZ', 'KHZ', 'MHZ', 'GHZ'];
    this.supportedParams = ['S', 'Y', 'Z', 'G', 'H'];
  }

  /**
   * 解析Touchstone文件内容
   * @param {string} content - 文件内容
   * @param {string} filename - 文件名
   * @returns {Object} 解析结果
   */
  parse(content, filename) {
    // 验证输入
    if (!content || typeof content !== 'string') {
      throw new Error('无效的文件内容');
    }

    if (!filename) {
      throw new Error('缺少文件名');
    }

    // 分割行并清理
    const lines = this.splitLines(content);

    // 从文件名推断端口数
    const numPorts = this.extractPortCount(filename);

    // 解析选项行
    const { optionLine, options, dataStartIndex } = this.parseOptions(lines);

    // 解析数据
    const { frequencies, sParams } = this.parseData(lines, dataStartIndex, numPorts, options);

    // 验证数据完整性
    this.validateData(frequencies, sParams, numPorts);

    // 转换频率单位
    const normalizedFrequencies = this.normalizeFrequencies(frequencies, options.freqUnit);

    // 转换S参数格式
    const normalizedSParams = this.normalizeSParams(sParams, options.format);

    return {
      numPorts,
      options,
      frequencies: normalizedFrequencies,
      sParams: normalizedSParams,
      metadata: {
        filename,
        dataPoints: frequencies.length,
        freqRange: {
          min: Math.min(...normalizedFrequencies),
          max: Math.max(...normalizedFrequencies)
        },
        parseTime: Date.now()
      },
      raw: {
        frequencies,
        sParams,
        optionLine
      }
    };
  }

  /**
   * 分割行并清理
   */
  splitLines(content) {
    return content
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }

  /**
   * 从文件名提取端口数
   */
  extractPortCount(filename) {
    const match = filename.match(/\.s(\d+)p$/i);
    if (!match) {
      throw new Error(`无法从文件名推断端口数: ${filename}`);
    }

    const numPorts = parseInt(match[1]);
    if (numPorts < 1 || numPorts > 10) {
      throw new Error(`不支持的端口数: ${numPorts}`);
    }

    return numPorts;
  }

  /**
   * 解析选项行
   */
  parseOptions(lines) {
    let optionLine = '';
    let dataStartIndex = 0;

    // 查找选项行（以#开头）
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 跳过注释行
      if (line.startsWith('!')) {
        continue;
      }

      // 找到选项行
      if (line.startsWith('#')) {
        optionLine = line;
        dataStartIndex = i + 1;
        break;
      }
    }

    // 解析选项
    const options = this.parseOptionLine(optionLine);

    return { optionLine, options, dataStartIndex };
  }

  /**
   * 解析选项行内容
   */
  parseOptionLine(optionLine) {
    const defaults = {
      freqUnit: 'GHz',
      paramType: 'S',
      format: 'MA',
      resistance: 50
    };

    if (!optionLine) {
      return defaults;
    }

    const parts = optionLine.replace('#', '').trim().split(/\s+/);
    const options = { ...defaults };

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].toUpperCase();

      // 频率单位
      if (this.supportedUnits.includes(part)) {
        options.freqUnit = part;
      }
      // 参数类型
      else if (this.supportedParams.includes(part)) {
        options.paramType = part;
      }
      // 数据格式
      else if (this.supportedFormats.includes(part)) {
        options.format = part;
      }
      // 参考阻抗
      else if (part === 'R' && i < parts.length - 1) {
        const resistance = parseFloat(parts[i + 1]);
        if (!isNaN(resistance) && resistance > 0) {
          options.resistance = resistance;
        }
      }
    }

    return options;
  }

  /**
   * 解析数据行（支持多行续行，Touchstone 格式允许每个频率点的数据跨多行）
   */
  parseData(lines, startIndex, numPorts, options) {
    const frequencies = [];
    const sParams = {};

    // 初始化S参数矩阵
    for (let i = 1; i <= numPorts; i++) {
      for (let j = 1; j <= numPorts; j++) {
        sParams[`S${i}${j}`] = [];
      }
    }

    // 每个频率点期望的数值总数: 1频率 + N*N*2(实部+虚部)
    const valuesPerFreq = 1 + numPorts * numPorts * 2;

    // 累积值缓冲区
    let pendingValues = [];

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];

      // 跳过注释行
      if (line.startsWith('!')) {
        continue;
      }

      // 跳过选项行（如果有多个）
      if (line.startsWith('#')) {
        continue;
      }

      // 解析当前行的数值
      const values = this.parseLineValues(line);
      if (values.length === 0) continue;

      pendingValues.push(...values);

      // 检查是否累积够一个完整的频率点
      while (pendingValues.length >= valuesPerFreq) {
        const freq = pendingValues[0];
        frequencies.push(freq);

        let idx = 1;
        for (let p1 = 1; p1 <= numPorts; p1++) {
          for (let p2 = 1; p2 <= numPorts; p2++) {
            const real = pendingValues[idx++];
            const imag = pendingValues[idx++];
            const key = `S${p1}${p2}`;
            if (sParams[key]) {
              sParams[key].push({ real, imag });
            }
          }
        }

        // 移除已处理的值
        pendingValues = pendingValues.slice(valuesPerFreq);
      }
    }

    return { frequencies, sParams };
  }

  /**
   * 解析行中的数值
   */
  parseLineValues(line) {
    // 处理可能的分隔符（空格、制表符、逗号）
    const parts = line.split(/[\s,]+/);

    // 转换为数值并过滤NaN
    return parts
      .map(part => parseFloat(part))
      .filter(value => !isNaN(value));
  }

  /**
   * 验证数据完整性
   */
  validateData(frequencies, sParams, numPorts) {
    if (frequencies.length === 0) {
      throw new Error('没有找到有效的频率数据');
    }

    // 检查每个S参数的数据点数是否一致
    const expectedCount = frequencies.length;
    for (const [key, values] of Object.entries(sParams)) {
      if (values.length !== expectedCount) {
        throw new Error(`${key}参数数据点数不一致：期望${expectedCount}，实际${values.length}`);
      }
    }

    // 检查频率是否单调递增
    for (let i = 1; i < frequencies.length; i++) {
      if (frequencies[i] <= frequencies[i - 1]) {
        console.warn('频率数据不是单调递增的');
        break;
      }
    }
  }

  /**
   * 归一化频率（转换为Hz）
   */
  normalizeFrequencies(frequencies, freqUnit) {
    const multiplier = this.getFrequencyMultiplier(freqUnit);
    return frequencies.map(f => f * multiplier);
  }

  /**
   * 获取频率单位乘数
   */
  getFrequencyMultiplier(unit) {
    const multipliers = {
      'HZ': 1,
      'KHZ': 1e3,
      'MHZ': 1e6,
      'GHZ': 1e9
    };

    return multipliers[unit.toUpperCase()] || 1e9;
  }

  /**
   * 归一化S参数（转换为RI格式）
   */
  normalizeSParams(sParams, format) {
    if (format === 'RI') {
      return sParams;
    }

    const normalized = {};

    for (const [key, values] of Object.entries(sParams)) {
      normalized[key] = values.map(v => this.convertToRI(v, format));
    }

    return normalized;
  }

  /**
   * 将S参数转换为RI格式
   */
  convertToRI(value, fromFormat) {
    switch (fromFormat) {
      case 'MA':
        // 幅度/相位 -> 实部/虚部
        return {
          real: value.real * Math.cos(value.imag * Math.PI / 180),
          imag: value.real * Math.sin(value.imag * Math.PI / 180)
        };

      case 'DB':
        // dB/相位 -> 实部/虚部
        const magnitude = Math.pow(10, value.real / 20);
        return {
          real: magnitude * Math.cos(value.imag * Math.PI / 180),
          imag: magnitude * Math.sin(value.imag * Math.PI / 180)
        };

      case 'RI':
      default:
        return value;
    }
  }

  /**
   * 计算S参数的幅度（线性）
   */
  static magnitude(sParam) {
    return Math.sqrt(sParam.real ** 2 + sParam.imag ** 2);
  }

  /**
   * 计算S参数的幅度（dB）
   */
  static magnitudeDB(sParam) {
    return 20 * Math.log10(TouchstoneParser.magnitude(sParam));
  }

  /**
   * 计算S参数的相位（度）
   */
  static phase(sParam) {
    return Math.atan2(sParam.imag, sParam.real) * 180 / Math.PI;
  }

  /**
   * 计算VSWR
   */
  static vswr(sParam) {
    const mag = TouchstoneParser.magnitude(sParam);
    return (1 + mag) / (1 - mag);
  }

  /**
   * 计算回波损耗
   */
  static returnLoss(sParam) {
    return -TouchstoneParser.magnitudeDB(sParam);
  }

  /**
   * 计算阻抗
   */
  static impedance(sParam, z0 = 50) {
    const { real, imag } = sParam;
    const denom = (1 - real) ** 2 + imag ** 2;
    const zReal = z0 * ((1 - real ** 2 - imag ** 2) / denom);
    const zImag = z0 * ((2 * imag) / denom);
    return { real: zReal, imag: zImag };
  }
}

// 导出解析器
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TouchstoneParser;
} else {
  window.TouchstoneParser = TouchstoneParser;
}
