"""Read-only checks against the local SQLite database and running MPMS API (Python standard library)."""
import argparse
import datetime as dt
import json
import sqlite3
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

PREFIX = "[SIMULATED MPMS-DEMO-20261110-v1:"


def get_json(base_url, endpoint, filters):
    query = urllib.parse.urlencode(filters)
    with urllib.request.urlopen(f"{base_url.rstrip('/')}/api/{endpoint}?{query}", timeout=20) as response:
        return json.load(response)


def matching_where(filters):
    clauses, parameters = [], []
    for key, clause in [("startDate", 'ProductionDate >= ?'), ("endDate", 'ProductionDate <= ?'), ("productionLine", 'ProductionLine = ?')]:
        if filters.get(key):
            clauses.append(clause)
            parameters.append(filters[key].strip())
    return (" WHERE " + " AND ".join(clauses) if clauses else ""), parameters


def assert_fields(actual, expected, context):
    for key, value in expected.items():
        if isinstance(value, float):
            assert abs(actual[key] - value) < 0.011, (context, key, actual[key], value)
        else:
            assert actual[key] == value, (context, key, actual[key], value)


def percent(numerator, denominator):
    return round(100.0 * numerator / denominator, 2) if denominator else None


def verify_selection(connection, base_url, filters):
    where, parameters = matching_where(filters)
    rows = list(connection.execute('SELECT * FROM ProductionLogs' + where, parameters))
    total = lambda column: sum(row[column] for row in rows)
    actual, target, defects, downtime = [total(column) for column in ['ActualUnits', 'TargetUnits', 'DefectUnits', 'DowntimeMinutes']]
    expected = dict(recordCount=len(rows), simulatedRecordCount=sum((row['Notes'] or '').startswith(PREFIX) for row in rows), totalProduction=actual, totalTarget=target, totalDefects=defects, totalDowntimeMinutes=downtime, targetAchievement=percent(actual, target) or 0, defectRate=percent(defects, actual))
    assert_fields(get_json(base_url, 'dashboard/summary', filters), expected, filters)

    trend = get_json(base_url, 'dashboard/trend', filters)
    days = list(connection.execute('SELECT ProductionDate, SUM(TargetUnits) target, SUM(ActualUnits) actual, SUM(DefectUnits) defects FROM ProductionLogs' + where + ' GROUP BY ProductionDate ORDER BY ProductionDate', parameters))
    assert len(trend) == len(days), filters
    for received, row in zip(trend, days):
        assert_fields(received, dict(date=row['ProductionDate'], target=row['target'], actual=row['actual'], defects=row['defects']), filters)

    lines = get_json(base_url, 'dashboard/lines', filters)
    grouped = list(connection.execute('SELECT ProductionLine, SUM(TargetUnits) target, SUM(ActualUnits) actual, SUM(DefectUnits) defects, SUM(DowntimeMinutes) downtime FROM ProductionLogs' + where + ' GROUP BY ProductionLine ORDER BY ProductionLine', parameters))
    assert len(lines) == len(grouped), filters
    for received, row in zip(lines, grouped):
        expected_line = dict(productionLine=row['ProductionLine'], target=row['target'], actual=row['actual'], defects=row['defects'], downtimeMinutes=row['downtime'], achievement=percent(row['actual'], row['target']) or 0, defectRate=percent(row['defects'], row['actual']))
        assert_fields(received, expected_line, filters)
    return len(rows)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--database', default='mpms.db')
    parser.add_argument('--base-url', default='http://localhost:5084')
    parser.add_argument('--baseline', help='Optional pre-seed JSON snapshot of original database rows')
    args = parser.parse_args()
    connection = sqlite3.connect(f'file:{Path(args.database).resolve().as_posix()}?mode=ro', uri=True)
    connection.row_factory = sqlite3.Row
    rows = list(connection.execute('SELECT * FROM ProductionLogs ORDER BY Id'))
    seeded = [row for row in rows if (row['Notes'] or '').startswith(PREFIX)]
    assert 0 < len(seeded) <= 84, f'Expected an initial demo dataset, found {len(seeded)} marked records'
    markers = [row['Notes'].split(']')[0] for row in seeded]
    assert len(set(markers)) == len(markers), 'Duplicate seed markers'
    slots = {(row['ProductionDate'], row['ProductionLine'], row['Shift']) for row in rows}
    for day in range(14):
        date = (dt.date(2026, 10, 28) + dt.timedelta(days=day)).isoformat()
        for line in ['Line A', 'Line B', 'Line C']:
            for shift in ['Morning', 'Afternoon']:
                assert (date, line, shift) in slots, (date, line, shift)
    for row in seeded:
        assert '2026-10-28' <= row['ProductionDate'] <= '2026-11-10'
        assert 1800 <= row['TargetUnits'] <= 2600
        assert 84.95 <= row['ActualUnits'] / row['TargetUnits'] * 100 <= 103.05
        assert 0.45 <= row['DefectUnits'] / row['ActualUnits'] * 100 <= 3.05
        assert 0 <= row['DowntimeMinutes'] <= 85
        assert len(row['Notes']) <= 500 and 'SIMULATED manufacturing data' in row['Notes']
    print(f'PASS: {len(seeded)} labeled demo records; all 84 date/line/shift slots covered; deterministic markers are unique; numeric bounds valid')

    if args.baseline:
        originals = json.loads(Path(args.baseline).read_text(encoding='utf-8'))
        current = {row['Id']: dict(row) for row in rows}
        assert all(current.get(original['Id']) == original for original in originals), 'An original record changed'
        print(f'PASS: {len(originals)} original records preserved field-for-field')

    selections = [{}, {'startDate': '2026-10-28', 'endDate': '2026-11-10'}]
    for line in ['', 'Line A', 'Line B', 'Line C']:
        selection = {'startDate': '2026-11-01', 'endDate': '2026-11-07'}
        if line:
            selection['productionLine'] = line
        selections.append(selection)
    selections += [
        {'startDate': '2026-11-05'}, {'endDate': '2026-10-31'},
        {'startDate': '2026-11-10', 'endDate': '2026-11-10', 'productionLine': 'Line A'},
        {'startDate': '2026-11-11', 'endDate': '2026-11-12'},
        {'productionLine': ' Line B '}, {'productionLine': 'Unknown line'}
    ]
    for selection in selections:
        verify_selection(connection, args.base_url, selection)
    print(f'PASS: all KPIs, daily trend, and line aggregates match SQLite for {len(selections)} date/line selections')

    for endpoint in ['summary', 'trend', 'lines']:
        for invalid in [{'startDate': '2026-11-11', 'endDate': '2026-11-10'}, {'startDate': 'invalid-date'}]:
            try:
                get_json(args.base_url, f'dashboard/{endpoint}', invalid)
            except urllib.error.HTTPError as error:
                assert error.code == 400, (endpoint, error.code)
            else:
                raise AssertionError(f'{endpoint} accepted invalid date input')
    print('PASS: all dashboard endpoints reject invalid and reversed date ranges with HTTP 400')
    records = get_json(args.base_url, 'productionlogs', {})
    assert len(records) == len(rows)
    assert {record['id'] for record in records} == {row['Id'] for row in rows}
    assert sum((record['notes'] or '').startswith(PREFIX) for record in records) == len(seeded)
    print(f'PASS: Production Logs returns all {len(rows)} stored records, including the same simulated dataset')
    summary = get_json(args.base_url, 'dashboard/summary', {})
    print('Dashboard summary:', json.dumps(summary))
    connection.close()


if __name__ == '__main__':
    main()
