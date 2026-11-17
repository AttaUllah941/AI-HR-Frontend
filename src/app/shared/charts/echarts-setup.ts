/**
 * Single place that registers the ECharts pieces the app uses.
 * Import `echarts` from here, never from 'echarts' / 'echarts/core' directly, so the
 * registration (and the bundle) stays in one shared lazy chunk.
 *
 * Add a chart/component/renderer to the `use([...])` list only when a new chart needs it.
 */
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  CanvasRenderer,
]);

export { echarts };
