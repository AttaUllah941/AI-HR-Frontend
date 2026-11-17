import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { SkeletonComponent } from './skeleton.component';

function create(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(SkeletonComponent);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('SkeletonComponent', () => {
  it('is hidden from assistive technology', () => {
    expect(create().getAttribute('aria-hidden')).toBe('true');
  });

  it('defaults to a full-width rect', () => {
    const el = create();
    expect(el.style.width).toBe('100%');
    expect(el.style.height).toBe('1rem');
    expect(el.getAttribute('data-shape')).toBe('rect');
  });

  it('applies width, height and shape inputs', () => {
    const el = create({ width: '12rem', height: '2rem', shape: 'circle' });
    expect(el.style.width).toBe('12rem');
    expect(el.style.height).toBe('2rem');
    expect(el.getAttribute('data-shape')).toBe('circle');
  });

  it('treats bare numbers as pixels', () => {
    const el = create({ width: 40, height: 40 });
    expect(el.style.width).toBe('40px');
    expect(el.style.height).toBe('40px');
  });
});
