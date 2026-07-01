// apps/mobile/src/components/charts/MiniLineChart.tsx
// Gráfico de linha simples usando react-native-svg (disponível via Expo SDK)
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Line, Rect, Text as SvgText } from 'react-native-svg';

export interface LineDataset {
  values: number[];
  color:  string;
  label?: string;
}

interface Props {
  datasets:   LineDataset[];
  width?:     number;
  height?:    number;
  /** Linhas de referência horizontais { value, color, label } */
  refLines?:  { value: number; color: string; label?: string }[];
  /** Se true, exibe rótulos de data no eixo X */
  xLabels?:   string[];
  yMin?:      number;
  yMax?:      number;
}

const PAD = { top: 10, right: 12, bottom: 24, left: 30 };

export default function MiniLineChart({
  datasets, width = 280, height = 130, refLines = [], xLabels, yMin, yMax,
}: Props) {
  if (!datasets.length || !datasets[0].values.length) return null;

  const allVals = datasets.flatMap(d => d.values);
  const mn = yMin ?? Math.min(...allVals) - 5;
  const mx = yMax ?? Math.max(...allVals) + 5;

  const W = width  - PAD.left - PAD.right;
  const H = height - PAD.top  - PAD.bottom;

  const xOf = (i: number, total: number) =>
    PAD.left + (total <= 1 ? W / 2 : (i / (total - 1)) * W);

  const yOf = (v: number) =>
    PAD.top + H - ((v - mn) / (mx - mn)) * H;

  const toPath = (values: number[]): string => {
    if (values.length === 0) return '';
    if (values.length === 1) {
      const x = xOf(0, 1);
      const y = yOf(values[0]);
      return `M ${x} ${y}`;
    }
    return values
      .map((v, i) => {
        const x = xOf(i, values.length);
        const y = yOf(v);
        if (i === 0) return `M ${x} ${y}`;
        // Bezier suave
        const px = xOf(i - 1, values.length);
        const py = yOf(values[i - 1]);
        const cx = (px + x) / 2;
        return `C ${cx} ${py} ${cx} ${y} ${x} ${y}`;
      })
      .join(' ');
  };

  // Eixo Y: 4 ticks
  const ticks = Array.from({ length: 4 }, (_, i) =>
    Math.round(mn + (i / 3) * (mx - mn))
  );

  return (
    <Svg width={width} height={height}>
      {/* Fundo */}
      <Rect x={PAD.left} y={PAD.top} width={W} height={H} fill="#F8FAFC" rx={4} />

      {/* Ticks Y */}
      {ticks.map(t => {
        const y = yOf(t);
        return (
          <React.Fragment key={t}>
            <Line x1={PAD.left} y1={y} x2={PAD.left + W} y2={y}
              stroke="#E2E8F0" strokeWidth={0.8} strokeDasharray="3,3" />
            <SvgText x={PAD.left - 4} y={y + 4} fontSize={8} fill="#94A3B8"
              textAnchor="end">{t}</SvgText>
          </React.Fragment>
        );
      })}

      {/* Linhas de referência */}
      {refLines.map(r => {
        if (r.value < mn || r.value > mx) return null;
        const y = yOf(r.value);
        return (
          <React.Fragment key={r.label ?? r.value}>
            <Line x1={PAD.left} y1={y} x2={PAD.left + W} y2={y}
              stroke={r.color} strokeWidth={1} strokeDasharray="4,4" opacity={0.7} />
            {r.label && (
              <SvgText x={PAD.left + W - 2} y={y - 2} fontSize={7} fill={r.color}
                textAnchor="end">{r.label}</SvgText>
            )}
          </React.Fragment>
        );
      })}

      {/* Linhas dos datasets */}
      {datasets.map(d => (
        <React.Fragment key={d.color + d.label}>
          <Path d={toPath(d.values)} stroke={d.color} strokeWidth={2}
            fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {/* Último ponto destacado */}
          {d.values.length > 0 && (() => {
            const li = d.values.length - 1;
            return (
              <Circle
                cx={xOf(li, d.values.length)}
                cy={yOf(d.values[li])}
                r={3} fill={d.color} />
            );
          })()}
        </React.Fragment>
      ))}

      {/* Rótulos X (máx 5) */}
      {xLabels && (() => {
        const total = xLabels.length;
        const step  = Math.ceil(total / 5);
        return xLabels.filter((_, i) => i % step === 0 || i === total - 1).map((lbl, ii, arr) => {
          const origIdx = ii * step < total ? ii * step : total - 1;
          const x = xOf(origIdx, total);
          return (
            <SvgText key={lbl + ii} x={x} y={height - 4} fontSize={8}
              fill="#94A3B8" textAnchor="middle">{lbl}</SvgText>
          );
        });
      })()}
    </Svg>
  );
}
