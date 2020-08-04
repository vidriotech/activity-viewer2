import { ICompartment } from "./compartmentModel";

/*
 * Endpoint: /compartments
 * Allows to query the compartment tree.
 */
export interface ICompartmentNode extends ICompartment {
    children: ICompartmentNode[],
}

/*
 * Endpoint: /penetrations/<penetrationId>
 * Data pertinent to a given penetration may be queried from here.
 */
export interface ICompartmentData {
    acronym: string,
    rgb_triplet: number[],
    graph_id: number,
    graph_order: number,
    id: number,
    name: string,
    structure_id_path: number[],
    structure_set_ids: number[],
}

export interface IPenetrationData {
    ids: number[],
    compartments: ICompartmentData[]
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
