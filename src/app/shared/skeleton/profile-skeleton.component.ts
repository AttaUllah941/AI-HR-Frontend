import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SkeletonComponent } from './skeleton.component';

/** Placeholder for a profile / detail page: avatar header plus two detail cards. */
@Component({
  selector: 'app-profile-skeleton',
  standalone: true,
  imports: [SkeletonComponent],
  template: `
    <div class="profile">
      <div class="profile__head">
        <app-skeleton shape="circle" width="4.5rem" height="4.5rem" />
        <div class="profile__identity">
          <app-skeleton width="14rem" height="1.4rem" />
          <app-skeleton width="9rem" height="0.9rem" />
        </div>
      </div>
      <div class="profile__grid">
        @for (card of cards; track card) {
          <div class="profile__card">
            <app-skeleton width="35%" height="1rem" />
            @for (line of lines; track line) {
              <div class="profile__line">
                <app-skeleton width="30%" height="0.8rem" />
                <app-skeleton width="45%" height="0.8rem" />
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .profile {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .profile__head {
      display: flex;
      align-items: center;
      gap: 1.1rem;
    }
    .profile__identity {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }
    .profile__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
      gap: 1rem;
    }
    .profile__card {
      display: flex;
      flex-direction: column;
      gap: 0.9rem;
      padding: 1.1rem 1.2rem;
      border: 1px solid var(--mat-sys-outline-variant, var(--zh-border, #e5e7eb));
      border-radius: var(--zh-radius, 0.875rem);
      background: var(--mat-sys-surface-container-lowest, var(--zh-card, #fff));
    }
    .profile__line {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
    }
  `,
  host: { 'aria-hidden': 'true' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileSkeletonComponent {
  protected readonly cards = [0, 1];
  protected readonly lines = [0, 1, 2, 3];
}
