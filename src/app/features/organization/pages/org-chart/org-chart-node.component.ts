import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { OrgChartNode } from '../../../../core/services/organization.service';

@Component({
  selector: 'app-org-chart-node',
  standalone: true,
  imports: [MatIconModule, OrgChartNodeComponent],
  templateUrl: './org-chart-node.component.html',
  styleUrl: './org-chart-node.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrgChartNodeComponent {
  readonly node = input.required<OrgChartNode>();
}
