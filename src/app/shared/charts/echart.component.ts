import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { echarts } from './echarts-setup';
import { ChartTheme, readChartTheme } from './chart-theme';

export interface ChartSize {
  width: number;
  /** True below ~460px: charts should drop side legends and long labels. */
  narrow: boolean;
}

const NARROW_BELOW = 460;

/**
 * One reusable ECharts host for every chart in the app. It owns the boring parts:
 * init/dispose, resizing with its container, re-rendering when the light/dark theme changes,
 * reduced-motion, and an accessible label.
 *
 *   <app-echart [build]="build" label="Attendance for the last 7 days" />
 *
 * `build` receives the current theme colours and returns the ECharts option. Pass a new function
 * (e.g. from a `computed`) whenever the data changes.
 */
@Component({
  selector: 'app-echart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div #host class="echart" role="img" [attr.aria-label]="label()" [style.height]="height()"></div>`,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
      .echart {
        width: 100%;
      }
    `,
  ],
})
export class EchartComponent implements AfterViewInit, OnDestroy {
  /** Receives the theme colours and whether the container is narrow (phone-width panels). */
  readonly build = input.required<(theme: ChartTheme, size: ChartSize) => echarts.EChartsCoreOption>();
  readonly label = input('Chart');
  readonly height = input('16.5rem');

  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('host');
  private chart: echarts.ECharts | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private themeObserver: MutationObserver | null = null;
  private colorScheme: MediaQueryList | null = null;
  private readonly onSchemeChange = () => this.themeTick.update((n) => n + 1);
  private readonly themeTick = signal(0);
  private wasNarrow = false;

  constructor() {
    effect(() => {
      const build = this.build();
      this.themeTick();
      this.render(build);
    });
  }

  ngAfterViewInit(): void {
    const el = this.host().nativeElement;
    this.chart = echarts.init(el);
    this.render(this.build());

    this.resizeObserver = new ResizeObserver(() => {
      this.chart?.resize();
      const narrow = el.clientWidth < NARROW_BELOW;
      if (narrow !== this.wasNarrow) {
        this.wasNarrow = narrow;
        this.render(this.build());
      }
    });
    this.resizeObserver.observe(el);

    // Follow the theme switcher (html[data-theme]) and the OS setting.
    this.themeObserver = new MutationObserver(() => this.themeTick.update((n) => n + 1));
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
    });
    this.colorScheme = window.matchMedia('(prefers-color-scheme: dark)');
    this.colorScheme.addEventListener('change', this.onSchemeChange);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.themeObserver?.disconnect();
    this.colorScheme?.removeEventListener('change', this.onSchemeChange);
    this.chart?.dispose();
    this.chart = null;
  }

  private render(build: (theme: ChartTheme, size: ChartSize) => echarts.EChartsCoreOption): void {
    if (!this.chart) {
      return;
    }
    const width = this.host().nativeElement.clientWidth;
    const size: ChartSize = { width, narrow: width > 0 && width < NARROW_BELOW };
    this.wasNarrow = size.narrow;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.chart.setOption(
      { animation: !reduceMotion, aria: { enabled: true }, ...build(readChartTheme(), size) },
      true,
    );
  }
}
