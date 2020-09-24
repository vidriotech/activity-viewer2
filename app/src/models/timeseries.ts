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
    timeMin: number;
    timeMax: number;
    timeStep: number;
    minVal: number;
    maxVal: number;
}

export interface TimeseriesSummary {
    timeseriesId: string;
    timeMin: number;
    timeMax: number;
    timeStep: number;
    minVal: number;
    maxVal: number;
}

