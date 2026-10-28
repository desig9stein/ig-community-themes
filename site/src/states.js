import { configureTheme, defineAllComponents } from 'igniteui-webcomponents';
import { setupDesignControls } from './controls.js';

defineAllComponents();

// [id, label, html]. The first element in each row is the "live" one the review script interacts with.
const ROWS = [
  ['contained-button', 'Button · contained', `<igc-button data-live variant="contained">Contained</igc-button><igc-button variant="contained" disabled>Disabled</igc-button>`],
  ['outlined-button', 'Button · outlined', `<igc-button data-live variant="outlined">Outlined</igc-button><igc-button variant="outlined" disabled>Disabled</igc-button>`],
  ['flat-button', 'Button · flat', `<igc-button data-live variant="flat">Flat</igc-button><igc-button variant="flat" disabled>Disabled</igc-button>`],
  ['fab-button', 'Button · fab', `<igc-button data-live variant="fab">+</igc-button><igc-button variant="fab" disabled>+</igc-button>`],
  ['icon-button', 'Icon button', `<igc-icon-button data-live variant="contained" name="star" collection="internal">★</igc-icon-button><igc-icon-button variant="outlined">★</igc-icon-button><igc-icon-button variant="flat">★</igc-icon-button><igc-icon-button variant="contained" disabled>★</igc-icon-button>`],
  ['button-group', 'Button group', `<igc-button-group data-live selection="single"><igc-toggle-button value="d" selected>Day</igc-toggle-button><igc-toggle-button value="w">Week</igc-toggle-button><igc-toggle-button value="m">Month</igc-toggle-button></igc-button-group><igc-button-group disabled><igc-toggle-button value="a" selected>On</igc-toggle-button><igc-toggle-button value="b">Off</igc-toggle-button></igc-button-group>`],
  ['chip', 'Chip', `<igc-chip data-live selectable>Selectable</igc-chip><igc-chip selectable selected>Selected</igc-chip><igc-chip removable>Removable</igc-chip><igc-chip disabled>Disabled</igc-chip><igc-chip variant="primary">Primary</igc-chip><igc-chip variant="info">Info</igc-chip><igc-chip variant="success">Success</igc-chip><igc-chip variant="warning">Warning</igc-chip><igc-chip variant="danger">Danger</igc-chip>`],
  ['badge', 'Badge · avatar', `<igc-badge data-live>4</igc-badge><igc-badge variant="info">i</igc-badge><igc-badge variant="success">ok</igc-badge><igc-badge variant="warning">!</igc-badge><igc-badge variant="danger">x</igc-badge><igc-badge outlined>8</igc-badge><igc-avatar initials="AB"></igc-avatar><igc-avatar initials="IG" shape="rounded"></igc-avatar><igc-avatar initials="SQ" shape="square"></igc-avatar>`],
  ['input', 'Input', `<igc-input data-live label="Idle" placeholder="Type here"></igc-input><igc-input label="Filled" value="Sofia"></igc-input><igc-input label="Outlined" outlined value="Sofia"></igc-input><igc-input label="Invalid" required invalid value=""></igc-input><igc-input label="Disabled" disabled value="Sofia"></igc-input>`],
  ['select', 'Select · combo · date picker', `<igc-select data-live label="Select"><igc-select-item value="1" selected>Sofia</igc-select-item><igc-select-item value="2">Tokyo</igc-select-item></igc-select><igc-combo label="Combo" value-key="v" display-key="t"></igc-combo><igc-date-picker label="Date"></igc-date-picker><igc-select label="Disabled" disabled></igc-select>`],
  ['checkbox', 'Checkbox · radio', `<igc-checkbox data-live>Idle</igc-checkbox><igc-checkbox checked>Checked</igc-checkbox><igc-checkbox indeterminate>Mixed</igc-checkbox><igc-checkbox invalid>Invalid</igc-checkbox><igc-checkbox disabled checked>Disabled</igc-checkbox><igc-radio name="r">Idle</igc-radio><igc-radio name="r2" checked>Checked</igc-radio><igc-radio disabled>Disabled</igc-radio>`],
  ['switch', 'Switch', `<igc-switch data-live>Off</igc-switch><igc-switch checked>On</igc-switch><igc-switch disabled>Disabled</igc-switch><igc-switch disabled checked>Disabled on</igc-switch>`],
  ['slider', 'Slider · rating', `<igc-slider data-live value="40"></igc-slider><igc-slider value="60" disabled></igc-slider><igc-rating value="3.5" step="0.5"></igc-rating><igc-rating value="2" disabled></igc-rating>`],
  ['progress', 'Progress', `<igc-linear-progress data-live value="64"></igc-linear-progress><igc-linear-progress value="40" variant="success"></igc-linear-progress><igc-linear-progress value="80" variant="danger" striped></igc-linear-progress><igc-circular-progress value="72"></igc-circular-progress><igc-circular-progress indeterminate></igc-circular-progress>`],
  ['tabs', 'Tabs', `<igc-tabs data-live><igc-tab label="Today">Clear skies.</igc-tab><igc-tab label="Week" selected>Rain from Thursday.</igc-tab><igc-tab label="Month" disabled></igc-tab></igc-tabs>`],
  ['list', 'List', `<igc-list data-live><igc-list-header>Cities</igc-list-header><igc-list-item><igc-avatar slot="start" initials="SO"></igc-avatar><span slot="title">Sofia</span><span slot="subtitle">Bulgaria</span><span slot="end">11°</span></igc-list-item><igc-list-item selected><igc-avatar slot="start" initials="TO"></igc-avatar><span slot="title">Tokyo (selected)</span><span slot="subtitle">Japan</span><span slot="end">16°</span></igc-list-item></igc-list>`],
  ['calendar', 'Calendar', `<igc-calendar data-live selection="range" id="cal-range"></igc-calendar><igc-calendar selection="single" id="cal-single"></igc-calendar>`],
  ['expansion-panel', 'Expansion panel', `<igc-expansion-panel data-live><h4 slot="title">Collapsed</h4><p>Body</p></igc-expansion-panel><igc-expansion-panel open><h4 slot="title">Open</h4><p>Humidity 62%, wind 14 km/h.</p></igc-expansion-panel>`],
  ['card', 'Card · navbar', `<igc-card data-live elevated style="width:280px"><igc-card-header><h3 slot="title">Card title</h3><span slot="subtitle">Subtitle</span></igc-card-header><igc-card-content>Body copy for the card.</igc-card-content><igc-card-actions><igc-button slot="start" variant="flat">Action</igc-button></igc-card-actions></igc-card><igc-navbar style="width:360px"><h4>Navbar</h4></igc-navbar>`],
  ['tooltip', 'Tooltip', `<igc-button data-live id="tip-target" variant="outlined">Hover me</igc-button><igc-tooltip anchor="tip-target">Tooltip text</igc-tooltip>`],
];

const host = document.getElementById('states');
host.innerHTML = ROWS.map(
  ([id, label, html]) =>
    `<div class="name" data-row="${id}">${label}<small>${id}</small></div><div class="cells" data-row="${id}">${html}</div>`,
).join('');

// Fixed selections so selected / range / today states are visible.
customElements.whenDefined('igc-calendar').then(() => {
  const range = document.getElementById('cal-range');
  range.activeDate = new Date(2026, 9, 15);
  range.values = [new Date(2026, 9, 12), new Date(2026, 9, 16)];
  const single = document.getElementById('cal-single');
  single.activeDate = new Date(2026, 9, 15);
  single.value = new Date(2026, 9, 20);
});

setupDesignControls({ onApply: ({ base, variant }) => configureTheme(base, variant) });
