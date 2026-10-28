// Deterministic weather data (no network) so screenshots and reviews are reproducible.
export interface HourRow { Hour: string; Temperature: number; Precipitation: number; Wind: number; Condition: string; }
export interface DayRow { Date: Date; Condition: string; Min: number; Max: number; Precipitation: number; UVIndex: number; Hours: HourRow[]; }
export interface CityRow {
  ID: number; City: string; Country: string; Climate: string; Population: number;
  AvgTemp: number; Humidity: number; Alert: boolean; Days: DayRow[];
}
export interface FlatDay { City: string; Country: string; Date: Date; Condition: string; Min: number; Max: number; Precipitation: number; }

const CONDITIONS = ['Clear', 'Partly cloudy', 'Overcast', 'Rain', 'Showers', 'Snow', 'Thunderstorm', 'Fog'];
const CITIES: [string, string, string, number, number][] = [
  ['Sofia', 'Bulgaria', 'Continental', 1_286_000, 11],
  ['New York', 'USA', 'Humid subtropical', 8_336_000, 13],
  ['Tokyo', 'Japan', 'Humid subtropical', 13_960_000, 16],
  ['Reykjavík', 'Iceland', 'Subpolar oceanic', 139_000, 5],
  ['Cape Town', 'South Africa', 'Mediterranean', 4_710_000, 17],
  ['Mumbai', 'India', 'Tropical', 12_478_000, 27],
  ['Oslo', 'Norway', 'Humid continental', 709_000, 6],
  ['Lima', 'Peru', 'Desert', 10_092_000, 19],
  ['Cairo', 'Egypt', 'Hot desert', 10_100_000, 22],
  ['Sydney', 'Australia', 'Humid subtropical', 5_312_000, 18],
  ['Toronto', 'Canada', 'Humid continental', 2_794_000, 9],
  ['Berlin', 'Germany', 'Oceanic', 3_645_000, 10],
];

let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

const start = new Date(2026, 9, 26);

export const CITY_DATA: CityRow[] = CITIES.map(([City, Country, Climate, Population, base], ID) => ({
  ID, City, Country, Climate, Population,
  AvgTemp: base,
  Humidity: Math.round(40 + rnd() * 55),
  Alert: rnd() > 0.7,
  Days: Array.from({ length: 7 }, (_, d) => {
    const min = Math.round(base - 4 + rnd() * 4);
    return {
      Date: new Date(start.getTime() + d * 864e5),
      Condition: CONDITIONS[Math.floor(rnd() * CONDITIONS.length)],
      Min: min,
      Max: min + Math.round(4 + rnd() * 8),
      Precipitation: Math.round(rnd() * 100),
      UVIndex: Math.round(rnd() * 10),
      Hours: Array.from({ length: 8 }, (_, h) => ({
        Hour: `${String(h * 3).padStart(2, '0')}:00`,
        Temperature: Math.round(min + rnd() * 10),
        Precipitation: Math.round(rnd() * 100),
        Wind: Math.round(5 + rnd() * 40),
        Condition: CONDITIONS[Math.floor(rnd() * CONDITIONS.length)],
      })),
    };
  }),
}));

export const FLAT_DAYS: FlatDay[] = CITY_DATA.flatMap((c) =>
  c.Days.map(({ Date, Condition, Min, Max, Precipitation }) => ({ City: c.City, Country: c.Country, Date, Condition, Min, Max, Precipitation })),
);
