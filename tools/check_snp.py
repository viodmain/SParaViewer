#!/usr/bin/env python3
"""
S-Parameter Quality Checker
Checks causality, passivity, and reciprocity for Touchstone files.
"""

import sys
import numpy as np


def parse_touchstone(filepath):
    """Parse a Touchstone .sNp file (RI format, Hz unit)."""
    with open(filepath, 'r') as f:
        lines = f.readlines()

    num_ports = int(filepath.rsplit('.s', 1)[1].replace('p', ''))

    # Parse option line
    option_line = ''
    data_lines = []
    for line in lines:
        stripped = line.strip()
        if stripped.startswith('!'):
            continue
        if stripped.startswith('#'):
            option_line = stripped
            continue
        if stripped:
            data_lines.append(stripped)

    # Option parsing
    opts = option_line.upper().split()
    freq_unit = 'HZ'
    fmt = 'RI'
    for o in opts:
        if o in ('HZ', 'KHZ', 'MHZ', 'GHZ'):
            freq_unit = o
        if o in ('MA', 'DB', 'RI'):
            fmt = o

    freq_mult = {'HZ': 1, 'KHZ': 1e3, 'MHZ': 1e6, 'GHZ': 1e9}[freq_unit]

    # Parse data (multi-line per frequency)
    values_per_freq = 1 + num_ports * num_ports * 2
    all_values = []
    for line in data_lines:
        all_values.extend([float(x) for x in line.split()])

    num_freqs = len(all_values) // values_per_freq
    frequencies = np.zeros(num_freqs)
    # S[freq][port_i][port_j] as complex
    S = np.zeros((num_freqs, num_ports, num_ports), dtype=complex)

    for k in range(num_freqs):
        offset = k * values_per_freq
        frequencies[k] = all_values[offset] * freq_mult
        idx = offset + 1
        for i in range(num_ports):
            for j in range(num_ports):
                re = all_values[idx]
                im = all_values[idx + 1]
                if fmt == 'RI':
                    S[k, i, j] = complex(re, im)
                elif fmt == 'MA':
                    S[k, i, j] = complex(re * np.cos(np.radians(im)),
                                          re * np.sin(np.radians(im)))
                elif fmt == 'DB':
                    mag = 10 ** (re / 20)
                    S[k, i, j] = complex(mag * np.cos(np.radians(im)),
                                          mag * np.sin(np.radians(im)))
                idx += 2

    return frequencies, S, num_ports


def check_passivity(S, num_ports, num_freqs):
    """Check passivity: max singular value of S matrix should be <= 1."""
    violations = []
    max_sv_all = 0.0
    worst_freq_idx = 0

    for k in range(num_freqs):
        sv = np.linalg.svd(S[k], compute_uv=False)
        max_sv = np.max(sv)
        if max_sv > max_sv_all:
            max_sv_all = max_sv
            worst_freq_idx = k
        if max_sv > 1.0:
            violations.append((k, max_sv))

    total = len(violations)
    pct = 100.0 * total / num_freqs if num_freqs > 0 else 0
    return {
        'pass': total == 0,
        'max_singular_value': max_sv_all,
        'worst_freq_idx': worst_freq_idx,
        'violation_count': total,
        'violation_pct': pct,
    }


def check_reciprocity(S, num_ports, num_freqs, tol=1e-6):
    """Check reciprocity: S_ij should equal S_ji."""
    max_diff = 0.0
    max_diff_loc = (0, 0, 0)  # (freq_idx, i, j)
    violations = 0

    for k in range(num_freqs):
        for i in range(num_ports):
            for j in range(i + 1, num_ports):
                diff = abs(S[k, i, j] - S[k, j, i])
                if diff > max_diff:
                    max_diff = diff
                    max_diff_loc = (k, i, j)
                if diff > tol:
                    violations += 1

    return {
        'pass': violations == 0,
        'max_diff': max_diff,
        'max_diff_location': max_diff_loc,
        'violation_count': violations,
        'tolerance': tol,
    }


def check_causality(S, num_ports, num_freqs, frequencies):
    """
    Check causality via IFFT.
    For each S_ij, compute IFFT and check if negative-time energy is small.
    """
    results = {}
    overall_pass = True

    for i in range(num_ports):
        for j in range(num_ports):
            # Get frequency-domain response
            H = S[:, i, j]

            # IFFT to get impulse response
            h = np.fft.ifft(H)
            n = len(h)

            # Negative time = second half of the IFFT output
            neg_time = h[n // 2:]
            pos_time = h[:n // 2]

            neg_energy = np.sum(np.abs(neg_time) ** 2)
            total_energy = np.sum(np.abs(h) ** 2)

            if total_energy > 0:
                neg_ratio = neg_energy / total_energy
            else:
                neg_ratio = 0.0

            # Threshold: negative time energy should be < 1% of total
            is_causal = neg_ratio < 0.01
            if not is_causal:
                overall_pass = False

            param = f'S{i+1}{j+1}'
            results[param] = {
                'neg_energy_ratio': neg_ratio,
                'causal': is_causal,
            }

    return {
        'pass': overall_pass,
        'details': results,
    }


def main():
    if len(sys.argv) < 2:
        print("Usage: python check_snp.py <file.sNp>")
        sys.exit(1)

    filepath = sys.argv[1]
    print(f"Analyzing: {filepath}")
    print("=" * 60)

    freq, S, n = parse_touchstone(filepath)
    nf = len(freq)

    print(f"Ports: {n}")
    print(f"Frequency points: {nf}")
    print(f"Frequency range: {freq[0]/1e6:.2f} MHz ~ {freq[-1]/1e6:.2f} MHz")
    print()

    # --- Passivity ---
    print("[1] PASSIVITY (无源性)")
    print("-" * 40)
    p = check_passivity(S, n, nf)
    print(f"  Result: {'PASS ✓' if p['pass'] else 'FAIL ✗'}")
    print(f"  Max singular value: {p['max_singular_value']:.6f}")
    print(f"  Violations: {p['violation_count']} / {nf} freq points ({p['violation_pct']:.1f}%)")
    if not p['pass']:
        print(f"  Worst at freq index {p['worst_freq_idx']} = {freq[p['worst_freq_idx']]/1e6:.2f} MHz")
    print()

    # --- Reciprocity ---
    print("[2] RECIPROCITY (互易性)")
    print("-" * 40)
    r = check_reciprocity(S, n, nf)
    print(f"  Result: {'PASS ✓' if r['pass'] else 'FAIL ✗'}")
    print(f"  Max |S_ij - S_ji|: {r['max_diff']:.2e}")
    print(f"  Tolerance: {r['tolerance']:.0e}")
    print(f"  Violations: {r['violation_count']} pairs")
    if not r['pass']:
        fi, ii, ji = r['max_diff_location']
        print(f"  Worst: S{ii+1}{ji+1} vs S{ji+1}{ii+1} at {freq[fi]/1e6:.2f} MHz")
    print()

    # --- Causality ---
    print("[3] CAUSALITY (因果性)")
    print("-" * 40)
    c = check_causality(S, n, nf, freq)
    print(f"  Result: {'PASS ✓' if c['pass'] else 'FAIL ✗'}")
    # Show worst parameters
    sorted_params = sorted(c['details'].items(),
                           key=lambda x: x[1]['neg_energy_ratio'], reverse=True)
    print("  Top 5 worst parameters (negative-time energy ratio):")
    for param, d in sorted_params[:5]:
        status = "OK" if d['causal'] else "FAIL"
        print(f"    {param}: {d['neg_energy_ratio']:.4f} ({status})")
    print()

    # --- Summary ---
    print("=" * 60)
    all_pass = p['pass'] and r['pass'] and c['pass']
    print(f"OVERALL: {'ALL PASS ✓' if all_pass else 'HAS FAILURES ✗'}")


if __name__ == '__main__':
    main()
