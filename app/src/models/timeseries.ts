/*
 * Endpoint: /timeseries/<timeseries_id>
 * Allows to query all penetrations for a given timeseries id.
 */

/*
 * Endpoint: /penetrations/<penetration_id>/timeseries/<timeseries_id>
 * Retrieve a specific timeseries' values for a specific penetration.
 */
export interface TimeseriesEntry {
    penetrationId: string;
    timeseriesId: string;
    times: number[];
    values: number[];
    stride: number;
    minTime: number;
    maxTime: number;
    minStep: number;
    minVal: number;
    maxVal: number;
}

export interface TimeseriesSummary {
    minTime: number;
    maxTime: number;
    minStep: number;
    minVal: number;
    maxVal: number;
}

export interface TimeseriesEntries extends TimeseriesSummary {
    timeseries: TimeseriesEntry[];
}
