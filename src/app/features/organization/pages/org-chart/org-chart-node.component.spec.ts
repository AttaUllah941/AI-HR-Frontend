import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import type { OrgChartNode } from '../../../../core/services/organization.service';
import { OrgChartNodeComponent } from './org-chart-node.component';

const TREE = {
  id: 'root',
  name: 'Engineering',
  code: 'ENG',
  branch: null,
  teams: [],
  children: [
    { id: 'child', name: 'Platform', code: 'PLT', branch: null, teams: [], children: [] },
  ],
} as unknown as OrgChartNode;

function render() {
  const fixture = TestBed.createComponent(OrgChartNodeComponent);
  fixture.componentRef.setInput('node', TREE);
  fixture.componentRef.setInput('first', true);
  document.body.appendChild(fixture.nativeElement);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const items = () => Array.from(el.querySelectorAll<HTMLElement>('[role="treeitem"]'));
  const key = (target: HTMLElement, k: string) => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
    fixture.detectChanges();
  };
  return { fixture, el, items, key };
}

describe('OrgChartNodeComponent (tree keyboard support)', () => {
  it('exposes tree item semantics', () => {
    const { items } = render();
    const [root, child] = items();
    expect(root.getAttribute('aria-level')).toBe('1');
    expect(root.getAttribute('aria-expanded')).toBe('true');
    expect(child.getAttribute('aria-level')).toBe('2');
    expect(child.hasAttribute('aria-expanded')).toBe(false);
  });

  it('makes only the first root a tab stop', () => {
    const { items } = render();
    const [root, child] = items();
    expect(root.getAttribute('tabindex')).toBe('0');
    expect(child.getAttribute('tabindex')).toBe('-1');
  });

  it('ArrowLeft collapses an expanded node, ArrowRight expands it again', () => {
    const { items, key } = render();
    const root = items()[0];
    key(root, 'ArrowLeft');
    expect(root.getAttribute('aria-expanded')).toBe('false');
    expect(items()).toHaveLength(1);

    key(root, 'ArrowRight');
    expect(root.getAttribute('aria-expanded')).toBe('true');
    expect(items()).toHaveLength(2);
  });

  it('ArrowRight on an expanded node moves focus to its first child, ArrowLeft back to the parent', () => {
    const { items, key } = render();
    const [root, child] = items();
    key(root, 'ArrowRight');
    expect(document.activeElement).toBe(child);

    key(child, 'ArrowLeft');
    expect(document.activeElement).toBe(root);
  });

  it('ignores keys that bubble up from nested items', () => {
    const { items, key } = render();
    const [root, child] = items();
    key(child, 'ArrowLeft'); // child has no children: moves focus to parent, must not also collapse root
    expect(root.getAttribute('aria-expanded')).toBe('true');
  });
});
