/*
 * Endpoint: /compartments
 * Allows to query the compartment tree.
 */
// eslint-disable-next-line import/no-unresolved
import {SliceType} from "./enums";

export interface CompartmentNode extends Compartment {
    children: CompartmentNode[];
}

export interface ExportingUnit {
    penetrationId: string;
    unitIds: number[];
}

export interface UnitExportRequest {
    data: ExportingUnit[];
}

/*
 * Endpoint: /penetrations
 * Penetrations may be added and queried from this endpoint.
 */
export interface PenetrationData {
    penetrationId: string;
    ids: number[];
    compartments: Compartment[];
    coordinates: number[];
    timeseries: string[];
    unitStats: string[];
    selected: boolean[];
}

export interface PenetrationRequest {
    data_paths: string[];
}

export interface PenetrationResponse {
    penetrations: PenetrationData[];
    info: {
        totalCount: number;
    };
    link?: string;
}

/*
 * Endpoint: /penetrations/<penetrationId>
 * Data pertinent to a given penetration may be queried from here.
 */
export interface Compartment {
    acronym: string;
    rgb_triplet: [number, number, number];
    graph_id: number;
    graph_order: number;
    id: number;
    name: string;
    structure_id_path: number[];
    structure_set_ids: number[];
}

/*
 * Endpoint: /penetrations/<penetrationId>/timeseries
 * Query the list of timeseries specified in a penetration.
 */
export interface PenetrationTimeseriesResponse {
    penetrationId: string;
    timeseries: string[];
}

/*
 * Endpoint: /penetrations/<penetration_id>/unit-stats/<stat_id>
 * Retrieve a specific timeseries' values for a specific penetration.
 */
export interface UnitStatsValuesResponse {
    penetrationId: string;
    data: number[];
}

/*
 * Endpoint: /settings
 * Settings may be queried and updated from this endpoint.
 */
export interface SettingsRequest {
    settings_path: string;
}

export interface Epoch {
    label: string;
    bounds: [number, number];
}

export interface AVSettings {
    compartment: {
        include: string[];
        exclude: string[];
        maxDepth: number;
    };
    system: {
        atlasVersion: string;
        cacheDirectory: string;
        dataFiles: string[];
        resolution: number;
    };
    epochs: Epoch[];
}

/*
 * Endpoint: /slices/<slice_type>/<coordinate>
 * Allows to query slice data from the Allen volumes.
 */

export interface SliceData {
    annotationImage: string;
    templateImage: string;
    annotationSlice: number[];
    sliceType: SliceType;
    stride: number;
    coordinate: number;
}

/*
 * Endpoint: /unit-stats/<stat_id>
 * Allows to query all penetrations for a given unit statistic id.
 */
export interface UnitStatsListResponse {
    unitStats: UnitStatsValuesResponse[];
}
