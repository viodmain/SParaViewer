# S参数三大物理性质：因果性、互异性、无源性

> 参考文献：Doshi et al., "Fast and Optimal Algorithms for Enforcing Reciprocity, Passivity and Causality in S-parameters", DesignCon 2012

---

## 1. 无源性（Passivity）

### 1.1 定义

对于 n 端口无源器件，其 S 参数矩阵在每个采样频率 ωₖ 处必须满足：

$$\|S\|_2 \leq 1$$

其中 $\|S\|_2$ 为矩阵的**诱导 2-范数**（induced 2-norm），等于矩阵的最大奇异值 σ₁。

### 1.2 物理意义

由 $Sa = b$（a 为入射功率波向量，b 为出射功率波向量）可知：
- $\|a\|_2^2$ 表示系统总输入功率
- $\|b\|_2^2$ 表示系统总输出功率
- 无源系统不能产生能量，因此 $\|b\|_2 \leq \|a\|_2$，即 $\|S\|_2 \leq 1$

### 1.3 判断方法

1. 对 S 参数矩阵进行**奇异值分解（SVD）**：$S = U\Sigma V^H$
2. 检查所有奇异值是否 ≤ 1
3. 若存在任一奇异值 > 1，则该频率点违反无源性

> **重要提醒**：即使 S 参数矩阵中每个元素的绝对值都小于 1，矩阵仍可能违反无源性。例如：
> $$S = \begin{pmatrix} 0.5 & 0.9 \\ 0.7 & 0.011 \end{pmatrix}, \quad \|S\|_2 = 1.1109$$

### 1.4 修正算法（最优）

**目标**：找到最小扰动矩阵 ΔS，使得 $S_{passive} = S - \Delta S$ 满足 $\|S_{passive}\|_2 \leq 1$

**步骤**：

1. 对 S 做 SVD 分解：$S = U\Sigma V^H$
2. 找出违反无源性的奇异值：若 $\sigma_j = 1 + |\delta_j|$（j = 1, 2, ..., k），则这些奇异值需要修正
3. 构造对角扰动矩阵 ΔΣ：

$$\Delta\Sigma_{j,j} = \begin{cases} |\delta_j|, & j \in \{1, 2, \ldots, k\} \\ 0, & j > k \end{cases}$$

4. 构造扰动矩阵：$\Delta S = U \Delta\Sigma V^H$
5. 修正后的无源矩阵：$S_{passive} = S - \Delta S$

**最优性**：该解在 Frobenius 范数和诱导 2-范数意义下均是最小扰动（即对原数据的修改最小）。

---

## 2. 因果性（Causality）

### 2.1 定义

因果系统的冲激响应 h(t) 必须满足：

$$h(t) = 0, \quad \forall t < 0$$

即系统在激励施加之前不能有响应。

### 2.2 物理意义

因果性是物理可实现系统的基本要求。非因果的 S 参数在时域仿真中会导致错误的结果（如眼图生成、均衡器设计等）。

### 2.3 违反原因

在离散频率域中，因果性违反主要来源于：
- **分数延迟**：当 DUT 的延迟不是采样周期 Tₛ 的整数倍时，IFFT 后的冲激响应在 t < 0 处会出现 sinc 函数型振铃（pre-ring），表现为非因果
- **测量/仿真误差**：校准不完善或数值误差

### 2.4 判断方法

1. 对 S 参数做**逆傅里叶变换（IFFT）**得到时域冲激响应
2. 检查冲激响应在 t < 0 区域是否有显著非零值
3. 若 t < 0 区域存在明显能量，则说明因果性被违反

### 2.5 修正方法（分数采样延迟校正）

**步骤**：

1. 设定要尝试的分数采样数 I，令 i 从 0 到 I-1
2. 对每个候选分数采样计算：

$$\text{Fractional Sample} = \frac{i}{I}$$

3. 对 S₂₁ 频率响应施加相位旋转：

$$H_{new}(n) = H(n) \cdot e^{j \cdot 2\pi \cdot n \cdot \text{FractionalSample} / N}$$

其中 N 为总频率点数，n 从 0 到 N-1

4. 对旋转后的频率响应做 IFFT
5. 选择使冲激响应在 t < 0 处最接近零的最优分数延迟
6. 以该最优分数延迟校正后的 S 参数作为因果性修正结果

**论文示例**：2.26 ns 电缆（Tₛ = 12.5 ps），最优分数采样为 0.9625，修正后冲激响应变为因果。

---

## 3. 互异性（Reciprocity）

### 3.1 定义

互易 DUT（不含铁磁材料等非互易介质）的 S 参数矩阵满足：

$$S = S^T$$

即 S 参数矩阵为对称矩阵，$S_{i,j} = S_{j,i}$。

### 3.2 物理意义

互异性意味着信号从端口 i 到端口 j 的传输特性与从端口 j 到端口 i 完全相同。大多数无源器件（电缆、连接器、PCB 走线等）都是互易的。

### 3.3 判断方法

检查 S 参数矩阵是否为对称矩阵：
- 对所有 i ≠ j，验证 $|S_{i,j} - S_{j,i}|$ 是否在容许误差范围内
- 若偏差超出容许范围，则互异性被违反

### 3.4 修正方法

#### 场景一：仅已知 S 参数矩阵

取非对角元素的算术平均值：

$$R_{i,j} = R_{j,i} = \frac{S_{i,j} + S_{j,i}}{2}$$

对角元素保持不变：$R_{i,i} = S_{i,i}$

#### 场景二：已知校准测量数据

利用网络分析仪校准过程中得到的误差模型系数：

1. 由未校准测量数据建立方程：$SA = B$（A、B 为从校准得到的 n×n 矩阵）
2. 利用互异性约束 $S = S^T$，将未知数从 n² 减少到 n(n+1)/2
3. 构造超定方程组 $Mx = c$，其中：
   - x 为包含独立 S 参数元素的向量（大小 n(n+1)/2 × 1）
   - M 为系数矩阵（大小 n² × n(n+1)/2）
   - c 为右端向量（大小 n² × 1）
4. 用**最小二乘法**求解：$x = M^+ c$（M⁺ 为 M 的伪逆）

---

## 4. 三者关系与修正顺序

### 4.1 相互关系

- 无源性、因果性、互异性是 S 参数的三个独立物理约束
- 违反任一性质都会导致时域仿真出现错误结果
- 测量误差、校准不完善、数值误差都可能导致违反这些性质

### 4.2 建议修正顺序

1. **因果性**：先校正分数延迟问题（截断/延迟修正）
2. **无源性**：再通过 SVD 扰动校正无源性
3. **互异性**：可在计算阶段直接约束（场景二），也可后处理修正（场景一）

> **注意**：若无源性修正量很大，可能意味着测量数据存在较大误差，建议重新测量或检查 DUT 已知特性（如物理长度）来辅助修正。

---

## 5. 实现参考

### 5.1 判定阈值与容许误差

在实际工程中，完美的物理性质几乎不可能达到，需要设定合理的容许阈值：

| 性质 | 判定指标 | 建议阈值 | 说明 |
|------|----------|----------|------|
| 无源性 | max(σ) - 1 | > 1e-6 即视为违反 | σ 为 S 矩阵奇异值 |
| 因果性 | t<0 区域能量 / 总能量 | > 1e-4 即视为违反 | 能量比判据 |
| 互异性 | max(\|S_{i,j} - S_{j,i}\|) | > 1e-6 即视为违反 | 最大非对角偏差 |

> 实际阈值应根据测量精度和应用需求调整。高精度场景可收紧至 1e-8，一般仿真 1e-6 即可。

### 5.2 无源性——实现要点

#### 5.2.1 完整判断流程

```
输入：S_params[N_freq][n][n]  （N_freq 个频率点，每个为 n×n 复矩阵）
输出：passive_flags[N_freq], max_singular_values[N_freq]

for each frequency point k:
    S = S_params[k]
    σ = svd_singular_values(S)          # 返回所有奇异值（降序）
    max_singular_values[k] = σ[0]       # 最大奇异值
    if σ[0] > 1 + threshold:
        passive_flags[k] = VIOLATED
    else:
        passive_flags[k] = PASS
```

#### 5.2.2 完整修正流程

```
输入：S_params[N_freq][n][n]
输出：S_passive[N_freq][n][n], correction_norms[N_freq]

for each frequency point k:
    S = S_params[k]
    U, σ, Vh = svd(S)                   # S = U·diag(σ)·Vh

    if max(σ) <= 1 + threshold:
        S_passive[k] = S                 # 已满足，无需修正
        correction_norms[k] = 0
        continue

    # 构造扰动对角矩阵
    δ = max(σ) - 1                      # 超出量
    ΔΣ = zeros(n)
    ΔΣ[0, 0] = δ                        # 仅修正最大的奇异值

    # 计算扰动矩阵
    ΔS = U · ΔΣ · Vh
    S_passive[k] = S - ΔS
    correction_norms[k] = frobenius_norm(ΔS)
```

#### 5.2.3 数值示例

输入矩阵（2端口）：
$$S = \begin{pmatrix} 0.5000 & 0.9000 \\ 0.7000 & 0.0110 \end{pmatrix}$$

**步骤 1：SVD 分解**
$$U = \begin{pmatrix} 0.9002 & -0.4355 \\ 0.4355 & 0.9002 \end{pmatrix}, \quad \Sigma = \begin{pmatrix} 1.1109 & 0 \\ 0 & 0.5622 \end{pmatrix}$$
$$V^H = \begin{pmatrix} -0.6796 & -0.7336 \\ 0.7336 & -0.6796 \end{pmatrix}$$

**步骤 2：检查奇异值** → σ₁ = 1.1109 > 1，违反无源性，δ = 0.1109

**步骤 3：构造扰动**
$$\Delta S = \begin{pmatrix} 0.0678 & 0.0732 \\ 0.0328 & 0.0354 \end{pmatrix}$$

**步骤 4：修正结果**
$$S_{passive} = \begin{pmatrix} 0.4322 & 0.8268 \\ 0.6672 & -0.0244 \end{pmatrix}$$

验证：$\|S_{passive}\|_2 = 1.0000$ ✓

#### 5.2.4 已满足无源性的情况

当所有奇异值 ≤ 1 时，直接输出原矩阵，不做任何修改。扰动范数为 0。

### 5.3 因果性——实现要点

#### 5.3.1 关键参数确定

| 参数 | 确定方法 | 说明 |
|------|----------|------|
| N（频率点数） | 由输入数据确定 | Touchstone 文件中的频率采样点数 |
| Tₛ（采样周期） | Tₛ = 1 / (2 × f_max) | f_max 为最高频率 |
| I（分数采样搜索数） | 建议 I ≥ 100 | 越大精度越高，计算量线性增长 |
| t<0 能量判据 | Σ|h(t)|² (t<0) / Σ|h(t)|² (全部) | 能量比小于阈值则视为因果 |

#### 5.3.2 多端口处理

论文仅讨论了 S₂₁，实际实现需对所有传输参数（S_{i,j}, i≠j）分别做因果性校正：

```
for each port pair (i, j) where i ≠ j:
    H = S_params[:, i, j]              # 取出 S_{i,j} 的频率响应
    optimal_fractional = search_best_fractional_delay(H, N, I)
    H_corrected = apply_fractional_delay(H, optimal_fractional, N)
    S_corrected[:, i, j] = H_corrected
```

对角参数（S_{i,i}，反射系数）通常不需要因果性校正，因为反射本身就是因果的。

#### 5.3.3 分数延迟搜索算法

```
输入：H[N]（复数频率响应），N（频率点数），I（搜索分辨率）
输出：optimal_fractional（最优分数延迟）

best_metric = INF
optimal_fractional = 0

for i in range(I):
    frac = i / I

    # 对频率响应施加相位旋转
    for n in range(N):
        H_new[n] = H[n] * exp(j * 2π * n * frac / N)

    # IFFT 得到时域响应
    h = ifft(H_new)

    # 计算 t < 0 区域的能量（假设 h 长度为 N，后半部分对应 t < 0）
    energy_negative = sum(|h[N//2 : N]|²)
    energy_total = sum(|h|²)
    metric = energy_negative / energy_total

    if metric < best_metric:
        best_metric = metric
        optimal_fractional = frac

return optimal_fractional
```

#### 5.3.4 IFFT 的时域排列说明

离散频率数据做 IFFT 后，时域序列的排列为：
- 索引 0 ~ N/2-1：对应 t ≥ 0（正时间）
- 索引 N/2 ~ N-1：对应 t < 0（负时间，周期性折叠）

因此因果性校正就是让后半段（索引 N/2 ~ N-1）的能量趋近于零。

### 5.4 互异性——实现要点

#### 5.4.1 判断流程

```
输入：S_params[N_freq][n][n]
输出：reciprocal_flags[N_freq], max_asymmetry[N_freq]

for each frequency point k:
    S = S_params[k]
    asymmetry = max(|S[i,j] - S[j,i]|) for all i ≠ j
    max_asymmetry[k] = asymmetry
    if asymmetry > threshold:
        reciprocal_flags[k] = VIOLATED
    else:
        reciprocal_flags[k] = PASS
```

#### 5.4.2 修正流程（场景一：仅知 S 矩阵）

```
for each frequency point k:
    S = S_params[k]
    R = copy(S)
    for i in range(n):
        for j in range(i+1, n):
            avg = (S[i,j] + S[j,i]) / 2
            R[i,j] = avg
            R[j,i] = avg
    S_reciprocal[k] = R
```

#### 5.4.3 修正流程（场景二：已知校准数据）

```
输入：A[N_freq][n][n], B[N_freq][n][n]  （校准误差模型矩阵）
输出：S_reciprocal[N_freq][n][n]

# 对每个频率点：
n_ports = A.shape[1]
n_vars = n_ports * (n_ports + 1) // 2   # 独立未知数个数

# 构造系数矩阵 M 和右端向量 c
M = zeros(n_ports², n_vars)
c = zeros(n_ports²)

# 按列填充 M 和 c（详见论文公式 [24]-[27]）
# ...（此处需要根据具体端口数构造）

# 最小二乘求解
x = pseudo_inverse(M) @ c

# 从向量 x 还原为对称矩阵 S
S = vector_to_symmetric_matrix(x, n_ports)
```

#### 5.4.4 数值示例（2端口）

输入（已不对称）：
$$S = \begin{pmatrix} 0.1+0.2j & 0.5+0.3j \\ 0.6+0.2j & 0.2+0.1j \end{pmatrix}$$

修正后：
$$R = \begin{pmatrix} 0.1+0.2j & 0.55+0.25j \\ 0.55+0.25j & 0.2+0.1j \end{pmatrix}$$

非对角元素取平均：$(0.5+0.3j + 0.6+0.2j)/2 = 0.55+0.25j$

### 5.5 修正后验证

每次修正后都应重新检查对应性质是否满足：

```
# 无源性验证
assert all(svd_singular_values(S_passive) <= 1 + threshold)

# 因果性验证
h = ifft(S_corrected[:, i, j])
energy_neg = sum(|h[N//2:]|²)
energy_total = sum(|h|²)
assert energy_neg / energy_total < threshold

# 互异性验证
assert all(|R[i,j] - R[j,i]| < threshold for i ≠ j)
```

### 5.6 修正对其他性质的影响

修正一个性质可能影响其他性质，需注意：

| 修正操作 | 可能影响 | 建议 |
|----------|----------|------|
| 无源性修正（SVD 扰动） | 破坏互异性（扰动矩阵一般不对称） | 无源性修正后再做互异性修正 |
| 因果性修正（相位旋转） | 不影响无源性（相位旋转是酉操作） | 可独立进行 |
| 互异性修正（取平均） | 不影响无源性（凸组合保持范数界） | 可独立进行 |

因此推荐顺序：**因果性 → 无源性 → 互异性**

### 5.7 输入输出格式参考

**输入**：Touchstone (.sNp) 文件或等效的复数 S 参数数组
- 维度：`[N_freq, n_ports, n_ports]`
- 数据类型：complex128
- 频率轴：单调递增，单位 Hz

**输出**：修正后的 S 参数数组 + 修正报告

```json
{
  "passivity": {
    "violated_points": [3, 7, 12],
    "max_singular_value_before": 1.1109,
    "correction_norm": 0.1523,
    "status": "corrected"
  },
  "causality": {
    "violated_port_pairs": [[0, 1]],
    "optimal_fractional_delay": 0.9625,
    "energy_ratio_before": 0.0234,
    "energy_ratio_after": 0.0001,
    "status": "corrected"
  },
  "reciprocity": {
    "violated_points": [5, 8],
    "max_asymmetry_before": 0.1000,
    "max_asymmetry_after": 0.0000,
    "status": "corrected"
  }
}
```
