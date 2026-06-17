/**
 * S-Parameter Validator
 * Checks causality, passivity, and reciprocity for S-parameter data.
 * Pure JS implementation — no external dependencies.
 */

class SNPValidator {

  // ─────────────────────────────────────────────
  //  FFT / IFFT (radix-2 Cooley-Tukey)
  // ─────────────────────────────────────────────

  /**
   * In-place radix-2 Cooley-Tukey FFT.
   * @param {number[]} re - real parts (length must be power of 2)
   * @param {number[]} im - imaginary parts
   * @param {boolean} inverse - true for IFFT
   */
  static fft(re, im, inverse = false) {
    const n = re.length;
    if (n <= 1) return;

    // Bit-reversal permutation
    let j = 0;
    for (let i = 1; i < n; i++) {
      let bit = n >> 1;
      while (j & bit) { j ^= bit; bit >>= 1; }
      j ^= bit;
      if (i < j) {
        [re[i], re[j]] = [re[j], re[i]];
        [im[i], im[j]] = [im[j], im[i]];
      }
    }

    // Butterfly stages
    for (let len = 2; len <= n; len <<= 1) {
      const halfLen = len >> 1;
      const angle = (inverse ? 2 : -2) * Math.PI / len;
      const wRe = Math.cos(angle);
      const wIm = Math.sin(angle);

      for (let i = 0; i < n; i += len) {
        let curRe = 1, curIm = 0;
        for (let k = 0; k < halfLen; k++) {
          const tRe = curRe * re[i + k + halfLen] - curIm * im[i + k + halfLen];
          const tIm = curRe * im[i + k + halfLen] + curIm * re[i + k + halfLen];
          re[i + k + halfLen] = re[i + k] - tRe;
          im[i + k + halfLen] = im[i + k] - tIm;
          re[i + k] += tRe;
          im[i + k] += tIm;
          const newCurRe = curRe * wRe - curIm * wIm;
          curIm = curRe * wIm + curIm * wRe;
          curRe = newCurRe;
        }
      }
    }

    // Scale for IFFT
    if (inverse) {
      for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
    }
  }

  /**
   * Next power of 2 >= n
   */
  static nextPow2(n) {
    let p = 1;
    while (p < n) p <<= 1;
    return p;
  }

  // ─────────────────────────────────────────────
  //  Max singular value (power iteration)
  // ─────────────────────────────────────────────

  /**
   * Compute the largest singular value of a complex matrix via power iteration
   * on A^H * A.  Works well for small matrices (≤10×10).
   * @param {Array<Array<{re:number, im:number}>>} mat - NxN complex matrix
   * @returns {number} σ_max
   */
  static maxSingularValue(mat) {
    const n = mat.length;
    if (n === 0) return 0;

    // A^H * A  (Hermitian → real eigenvalues = σ²)
    // Compute product on the fly in each iteration to avoid extra storage.
    // Power iteration: v_{k+1} = (A^H A) v_k  →  converges to eigenvector of max eigenvalue.

    // Initialize random vector
    let vRe = new Float64Array(n);
    let vIm = new Float64Array(n);
    for (let i = 0; i < n; i++) { vRe[i] = Math.random() - 0.5; vIm[i] = Math.random() - 0.5; }

    const AH_A = SNPValidator._ahTimesA(mat, n);

    // Power iteration (50 iterations is more than enough for convergence)
    for (let iter = 0; iter < 60; iter++) {
      const newRe = new Float64Array(n);
      const newIm = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          const aRe = AH_A[i][j].re;
          const aIm = AH_A[i][j].im;
          newRe[i] += aRe * vRe[j] - aIm * vIm[j];
          newIm[i] += aRe * vIm[j] + aIm * vRe[j];
        }
      }
      // Normalize
      let norm = 0;
      for (let i = 0; i < n; i++) norm += newRe[i] ** 2 + newIm[i] ** 2;
      norm = Math.sqrt(norm);
      if (norm < 1e-30) return 0;
      for (let i = 0; i < n; i++) { vRe[i] = newRe[i] / norm; vIm[i] = newIm[i] / norm; }
    }

    // Rayleigh quotient: λ = v^H (A^H A) v = ||A v||²
    // Compute A v first
    const avRe = new Float64Array(n);
    const avIm = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        avRe[i] += mat[i][j].re * vRe[j] - mat[i][j].im * vIm[j];
        avIm[i] += mat[i][j].re * vIm[j] + mat[i][j].im * vRe[j];
      }
    }
    let lambda = 0;
    for (let i = 0; i < n; i++) lambda += avRe[i] ** 2 + avIm[i] ** 2;
    return Math.sqrt(lambda);
  }

  /** Compute A^H * A */
  static _ahTimesA(A, n) {
    const result = Array.from({ length: n }, () =>
      Array.from({ length: n }, () => ({ re: 0, im: 0 }))
    );
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        let sRe = 0, sIm = 0;
        for (let k = 0; k < n; k++) {
          // A^H[i][k] = conj(A[k][i])
          const ahRe = A[k][i].re;
          const ahIm = -A[k][i].im;
          const aRe = A[k][j].re;
          const aIm = A[k][j].im;
          sRe += ahRe * aRe - ahIm * aIm;
          sIm += ahRe * aIm + ahIm * aRe;
        }
        result[i][j] = { re: sRe, im: sIm };
      }
    }
    return result;
  }

  // ─────────────────────────────────────────────
  //  Passivity check
  // ─────────────────────────────────────────────

  /**
   * Check passivity: σ_max(S) ≤ 1 at every frequency.
   * @param {Object} sParamData - parsed Touchstone data from TouchstoneParser
   * @returns {Object} { pass, maxSV, violations, violationPct, worstFreqIdx }
   */
  static checkPassivity(sParamData) {
    const { frequencies, sParams, numPorts } = sParamData;
    const nF = frequencies.length;
    const nP = numPorts;
    const keys = SNPValidator._paramKeys(nP);

    let maxSV = 0;
    let worstIdx = 0;
    let violations = 0;

    for (let k = 0; k < nF; k++) {
      // Build NxN complex matrix for this frequency
      const mat = Array.from({ length: nP }, (_, i) =>
        Array.from({ length: nP }, (_, j) => {
          const v = sParams[keys[i * nP + j]][k];
          return { re: v.real, im: v.imag };
        })
      );

      const sv = SNPValidator.maxSingularValue(mat);
      if (sv > maxSV) { maxSV = sv; worstIdx = k; }
      if (sv > 1.0 + 1e-10) violations++;  // small tolerance for float noise
    }

    return {
      pass: violations === 0,
      maxSV,
      violations,
      violationPct: (100 * violations / nF).toFixed(1),
      worstFreqIdx: worstIdx,
      worstFreq: (frequencies[worstIdx] / 1e6).toFixed(2) + ' MHz',
    };
  }

  // ─────────────────────────────────────────────
  //  Reciprocity check
  // ─────────────────────────────────────────────

  /**
   * Check reciprocity: S_ij == S_ji for all i != j.
   * @param {Object} sParamData
   * @param {number} tolerance - default 1e-3
   * @returns {Object} { pass, maxDiff, maxDiffLoc, violations }
   */
  static checkReciprocity(sParamData, tolerance = 1e-3) {
    const { frequencies, sParams, numPorts } = sParamData;
    const nF = frequencies.length;
    const nP = numPorts;

    let maxDiff = 0;
    let maxDiffLoc = { freqIdx: 0, i: 0, j: 0 };
    let violations = 0;

    for (let k = 0; k < nF; k++) {
      for (let i = 0; i < nP; i++) {
        for (let j = i + 1; j < nP; j++) {
          const a = sParams[`S${i + 1}${j + 1}`][k];
          const b = sParams[`S${j + 1}${i + 1}`][k];
          const diff = Math.sqrt((a.real - b.real) ** 2 + (a.imag - b.imag) ** 2);
          if (diff > maxDiff) {
            maxDiff = diff;
            maxDiffLoc = { freqIdx: k, i: i + 1, j: j + 1 };
          }
          if (diff > tolerance) violations++;
        }
      }
    }

    const loc = maxDiffLoc;
    return {
      pass: violations === 0,
      maxDiff,
      maxDiffLabel: `S${loc.i}${loc.j}/S${loc.j}${loc.i}`,
      maxDiffFreq: (frequencies[loc.freqIdx] / 1e6).toFixed(2) + ' MHz',
      violations,
      tolerance,
    };
  }

  // ─────────────────────────────────────────────
  //  Causality check
  // ─────────────────────────────────────────────

  /**
   * Direct DFT (IFFT) for arbitrary N. O(N²) — fast enough for N≤2000.
   * Computes h[n] = (1/N) Σ H[k] e^{j2πkn/N}
   */
  static _ifftDirect(reIn, imIn) {
    const n = reIn.length;
    const reOut = new Float64Array(n);
    const imOut = new Float64Array(n);
    for (let k = 0; k < n; k++) {
      for (let m = 0; m < n; m++) {
        const angle = 2 * Math.PI * k * m / n;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        reOut[k] += reIn[m] * cosA - imIn[m] * sinA;
        imOut[k] += reIn[m] * sinA + imIn[m] * cosA;
      }
      reOut[k] /= n;
      imOut[k] /= n;
    }
    return { re: reOut, im: imOut };
  }

  /**
   * Check causality: IFFT of each S_ij, negative-time energy < 1% of total.
   * @param {Object} sParamData
   * @returns {Object} { pass, details: {S11: {ratio, causal}, ...} }
   */
  static checkCausality(sParamData) {
    const { frequencies, sParams, numPorts } = sParamData;
    const nF = frequencies.length;
    const nP = numPorts;

    const details = {};
    let overallPass = true;

    for (let i = 0; i < nP; i++) {
      for (let j = 0; j < nP; j++) {
        const key = `S${i + 1}${j + 1}`;
        const vals = sParams[key];

        const re = new Float64Array(nF);
        const im = new Float64Array(nF);
        for (let k = 0; k < nF; k++) {
          re[k] = vals[k].real;
          im[k] = vals[k].imag;
        }

        // Direct IFFT (preserves original length, no zero-padding)
        const h = SNPValidator._ifftDirect(re, im);

        // Negative time = second half
        let negEnergy = 0, totalEnergy = 0;
        for (let k = 0; k < nF; k++) {
          const e = h.re[k] ** 2 + h.im[k] ** 2;
          totalEnergy += e;
          if (k >= Math.floor(nF / 2)) negEnergy += e;
        }

        const ratio = totalEnergy > 0 ? negEnergy / totalEnergy : 0;
        const causal = ratio < 0.01;
        if (!causal) overallPass = false;

        details[key] = { ratio, causal };
      }
    }

    return { pass: overallPass, details };
  }

  // ─────────────────────────────────────────────
  //  Run all checks
  // ─────────────────────────────────────────────

  /**
   * Run all three checks and return combined results.
   * @param {Object} sParamData
   * @returns {Object} { passivity, reciprocity, causality, overallPass }
   */
  static analyze(sParamData) {
    const passivity = SNPValidator.checkPassivity(sParamData);
    const reciprocity = SNPValidator.checkReciprocity(sParamData);
    const causality = SNPValidator.checkCausality(sParamData);

    return {
      passivity,
      reciprocity,
      causality,
      overallPass: passivity.pass && reciprocity.pass && causality.pass,
    };
  }

  // ─────────────────────────────────────────────
  //  Helpers
  // ─────────────────────────────────────────────

  /** Generate ordered S-parameter keys for an NxN matrix */
  static _paramKeys(n) {
    const keys = [];
    for (let i = 1; i <= n; i++)
      for (let j = 1; j <= n; j++)
        keys.push(`S${i}${j}`);
    return keys;
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SNPValidator;
} else {
  window.SNPValidator = SNPValidator;
}
