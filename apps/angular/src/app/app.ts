import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  EntityType,
  FilteringExpressionsTree,
  IgxChipTypeVariant,
  IgxOverlayOutletDirective,
  FilteringLogic,
  IExpressionTree,
  IGX_BUTTON_GROUP_DIRECTIVES,
  IGX_CARD_DIRECTIVES,
  IGX_DIALOG_DIRECTIVES,
  IGX_EXPANSION_PANEL_DIRECTIVES,
  IGX_GRID_DIRECTIVES,
  IGX_HIERARCHICAL_GRID_DIRECTIVES,
  IGX_INPUT_GROUP_DIRECTIVES,
  IGX_LIST_DIRECTIVES,
  IGX_NAVBAR_DIRECTIVES,
  IGX_QUERY_BUILDER_DIRECTIVES,
  IGX_SELECT_DIRECTIVES,
  IGX_TABS_DIRECTIVES,
  IGX_TOOLTIP_DIRECTIVES,
  IgxActionStripComponent,
  IgxAvatarComponent,
  IgxBadgeComponent,
  IgxButtonDirective,
  IgxCalendarComponent,
  IgxCheckboxComponent,
  IgxChipComponent,
  IgxCircularProgressBarComponent,
  IgxComboComponent,
  IgxDatePickerComponent,
  IgxDialogComponent,
  IgxIconButtonDirective,
  IgxIconComponent,
  IgxLinearProgressBarComponent,
  IgxNumberFilteringOperand,
  IgxRadioComponent,
  IgxRippleDirective,
  IgxSliderComponent,
  IgxSnackbarComponent,
  IgxStringFilteringOperand,
  IgxSwitchComponent,
  SortingDirection,
} from 'igniteui-angular';
import { CITY_DATA, FLAT_DAYS } from './data';
import { ThemeService } from './theme.service';

@Component({
  selector: 'app-root',
  imports: [
    FormsModule,
    IGX_HIERARCHICAL_GRID_DIRECTIVES, IGX_GRID_DIRECTIVES, IGX_QUERY_BUILDER_DIRECTIVES,
    IGX_NAVBAR_DIRECTIVES, IGX_SELECT_DIRECTIVES, IGX_BUTTON_GROUP_DIRECTIVES, IGX_CARD_DIRECTIVES,
    IGX_TABS_DIRECTIVES, IGX_LIST_DIRECTIVES, IGX_EXPANSION_PANEL_DIRECTIVES, IGX_INPUT_GROUP_DIRECTIVES,
    IGX_DIALOG_DIRECTIVES, IGX_TOOLTIP_DIRECTIVES,
    IgxActionStripComponent, IgxAvatarComponent, IgxBadgeComponent, IgxButtonDirective, IgxCalendarComponent,
    IgxCheckboxComponent, IgxChipComponent, IgxCircularProgressBarComponent, IgxComboComponent,
    IgxDatePickerComponent, IgxIconButtonDirective, IgxIconComponent, IgxLinearProgressBarComponent,
    IgxOverlayOutletDirective, IgxRadioComponent, IgxRippleDirective, IgxSliderComponent, IgxSnackbarComponent, IgxSwitchComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected readonly theme = inject(ThemeService);
  protected readonly cities = CITY_DATA;
  protected readonly days = FLAT_DAYS;
  protected readonly cityNames = CITY_DATA.map((c) => c.City);
  protected readonly grouping = [{ fieldName: 'Country', dir: SortingDirection.Asc, ignoreCase: true }];
  protected selectedCities = ['Sofia', 'Tokyo'];
  protected date = new Date(2026, 9, 28);
  protected entities: EntityType[] = [
    {
      name: 'Cities',
      fields: [
        { field: 'City', dataType: 'string' },
        { field: 'Country', dataType: 'string' },
        { field: 'Population', dataType: 'number' },
        { field: 'AvgTemp', dataType: 'number' },
        { field: 'Alert', dataType: 'boolean' },
      ],
    },
    {
      name: 'Days',
      fields: [
        { field: 'City', dataType: 'string' },
        { field: 'Date', dataType: 'date' },
        { field: 'Max', dataType: 'number' },
        { field: 'Precipitation', dataType: 'number' },
      ],
    },
  ];
  protected expressionTree!: IExpressionTree;

  @ViewChild('dialog', { static: true }) protected dialog!: IgxDialogComponent;

  public ngOnInit(): void {
    const tree = new FilteringExpressionsTree(FilteringLogic.And, undefined, 'Cities', ['City', 'Country', 'AvgTemp']);
    tree.filteringOperands.push({
      fieldName: 'AvgTemp',
      condition: IgxNumberFilteringOperand.instance().condition('greaterThan'),
      conditionName: 'greaterThan',
      searchVal: 10,
    });
    const or = new FilteringExpressionsTree(FilteringLogic.Or, undefined, 'Cities', ['City']);
    or.filteringOperands.push({
      fieldName: 'Country',
      condition: IgxStringFilteringOperand.instance().condition('contains'),
      conditionName: 'contains',
      searchVal: 'a',
    });
    or.filteringOperands.push({
      fieldName: 'City',
      condition: IgxStringFilteringOperand.instance().condition('startsWith'),
      conditionName: 'startsWith',
      searchVal: 'S',
    });
    tree.filteringOperands.push(or);
    this.expressionTree = tree;
  }

  protected conditionChip(condition: string): IgxChipTypeVariant {
    return /Rain|Showers|Thunder/.test(condition) ? 'warning' : /Clear/.test(condition) ? 'success' : 'primary';
  }
}
