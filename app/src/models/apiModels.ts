export interface IPenetrationData {
    penetrationId: string,
    ids: number[],
    compartments: ICompartment[]
    coordinates: number[],
    stride: number,
}

/*
 * Endpoint: /settings
 * Settings may be queried and updated from this endpoint.
 */
export interface ISettingsRequest {
    settings_path: string,
}

export interface ISettingsResponse {
    compartment: {
        include: string[],
        exclude: string[],
        maxDepth: number,
    },
    system: {
        atlasVersion: string,
        dataDirectory: string,
        resolution: number,
    }
}

/*
 * Endpoint: /penetrations
 * Penetrations may be added and queried from this endpoint.
 */
export interface IPenetrationRequest {
    data_paths: string[],
}

export interface IPenetrationResponse {
    penetrations: string[],
}

/*
 * Endpoint: /penetrations/<penetrationId>
 * Data pertinent to a given penetration may be queried from here.
 */
export interface ICompartment {
    acronym: string,
    rgb_triplet: number[],
    graph_id: number,
    graph_order: number,
    id: number,
    name: string,
    structure_id_path: number[],
    structure_set_ids: number[],
}

/*
 * Endpoint: /penetrations/<penetrationId>/timeseries
 * Query the list of timeseries specified in a penetration.
 */
export interface IPenetrationTimeseriesResponse {
    penetrationId: string,
    timeseries: string[],
}

/*
 * Endpoint: /penetrations/<penetration_id>/timeseries/<timeseries_id>
 * Retrieve a specific timeseries' values for a specific penetration.
 */
export interface IPenetrationTimeseriesValuesResponse {
    penetrationId: string,
    data: number[],
    stride: number,
}

/*
 * Endpoint: /compartments
 * Allows to query the compartment tree.
 */
export interface ICompartmentNode extends ICompartment {
    children: ICompartmentNode[],
}
