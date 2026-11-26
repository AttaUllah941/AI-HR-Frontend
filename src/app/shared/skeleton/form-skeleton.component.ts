import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { SkeletonComponent } from './skeleton.component';

/** Placeholder for a form or detail block: `fields` label + input pairs, two per row on wide screens. */
@Component({
  selector: 'app-form-skeleton',
  standalone: true,
  imports: [SkeletonComponent],
  template: `
    <div class="form">
      @for (f of fieldIndexes(); track f) {
        <div class="form__field">
          <app-skeleton width="30%" height="0.7rem" />
          <app-skeleton width="100%" height="2.75rem" />
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .form {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(14rem, 100%), 1fr));
      gap: 1.1rem 1rem;
    }
    .form__field {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
  `,
  host: { 'aria-hidden': 'true' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormSkeletonComponent {
  readonly fields = input(6);
  readonly fieldIndexes = computed(() =>
    Array.from({ length: Math.max(0, Math.floor(this.fields())) }, (_, i) => i),
  );
}
