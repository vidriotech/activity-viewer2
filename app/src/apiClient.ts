import axios, {AxiosResponse} from "axios";

import {
    ExportingUnit,
    PenetrationData,
    PenetrationResponse,
    SettingsRequest,
    SliceData,
    UnitStatsListResponse,
// eslint-disable-next-line import/no-unresolved
} from "./models/apiModels";
// eslint-disable-next-line import/no-unresolved
import {ColorLUT} from "./models/colorMap";
// eslint-disable-next-line import/no-unresolved
import {TimeseriesData, TimeseriesSummary} from "./models/timeseries";
// eslint-disable-next-line import/no-unresolved
import {AestheticMapping, AestheticParams} from "./models/aestheticMapping";
// eslint-disable-next-line import/no-unresolved
import {SliceType} from "./models/enums";


export interface AestheticRequest {
    penetrationIds: string[];
    params: AestheticParams;
}

export interface PenetrationTimeseriesResponse {
    timeseries: {
        summary: TimeseriesSummary;
        penetrations: TimeseriesData[];
    }[];
    info: {
        totalCount: number;
    };
    link: string;
}

export interface TimeseriesResponse extends TimeseriesSummary {
    timeseries: TimeseriesData[];
}

export class APIClient {
    private readonly endpoint: string;

    constructor(endpoint: string) {
        this.endpoint = endpoint;
    }

    public async GET(uri: string): Promise<any> {
        return axios.get(uri);
    }

    async fetchAestheticMappings(params: AestheticRequest): Promise<AxiosResponse<{mappings: AestheticMapping[]}>> {
        return axios({
            method: "POST",
            url: `${this.endpoint}/aesthetics`,
            data: params,
        });
    }

    async fetchColorMapping(mapping: string): Promise<AxiosResponse<ColorLUT>> {
        return await axios.get(`${this.endpoint}/color-map/${mapping}`);
    }

    async fetchCompartmentTree() {
        return await axios.get(`${this.endpoint}/compartments`);
    }

    async fetchExportedData(exportData: ExportingUnit[]) {
        const data = {
            data: exportData,
        };

        return axios({
            "method": "post",
            "url": `${this.endpoint}/data-file`,
            "data": data,
            "timeout": 5000
        });
    }

    async fetchPenetrations(limit: number, page: number): Promise<AxiosResponse<PenetrationResponse>> {
        return await axios.get(`${this.endpoint}/penetrations?page=${page}&limit=${limit}`);
    }

    async fetchPenetrationVitals(penetrationId: string): Promise<AxiosResponse<PenetrationData>> {
        return await axios.get(`${this.endpoint}/penetrations/${penetrationId}`);
    }

    async fetchSettings() {
        return await axios.get(`${this.endpoint}/settings`);
    }

    async fetchSliceData(sliceType: SliceType, coordinate: number): Promise<AxiosResponse<SliceData>> {
        return await axios.get(`${this.endpoint}/slices/${sliceType}/${coordinate}`);
    }

    async fetchTimeseries(penetrationId: string, timeseriesId: string): Promise<AxiosResponse<TimeseriesData>> {
        return await axios.get(`${this.endpoint}/penetrations/${penetrationId}/timeseries/${timeseriesId}`);
    }

    async fetchPenetationTimeseries(timeseriesIds: string[], penetrationIds: string[] = [], page = 1, limit = 5): Promise<AxiosResponse<PenetrationTimeseriesResponse>> {
        let uri = `${this.endpoint}/timeseries?timeseriesIds=${timeseriesIds.join(",")}&page=${page}&limit=${limit}`;

        if (penetrationIds.length > 0) {
            uri += `&penetrationIds=${penetrationIds.join(",")}`;
        }

        return await axios.get(uri);
    }

    async fetchTimeseriesList(penetrationId: string) {
        return await axios.get(`${this.endpoint}/penetrations/${penetrationId}/timeseries`);
    }

    async fetchTimeseriesById(timeseriesId: string): Promise<AxiosResponse<TimeseriesResponse>> {
        return await axios.get(`${this.endpoint}/timeseries/${timeseriesId}`);
    }

    async fetchTimeseriesSummary(timeseriesId: string): Promise<AxiosResponse<TimeseriesSummary>> {
        return await axios.get(`${this.endpoint}/timeseries/${timeseriesId}/summary`);
    }

    async fetchUnitStatsById(statId: string): Promise<AxiosResponse<UnitStatsListResponse>> {
        return await axios.get(`${this.endpoint}/unit-stats/${statId}`);
    }

    async setSettings(settingsPath: string) {
        const settingsReqData: SettingsRequest = {
            // eslint-disable-next-line @typescript-eslint/camelcase
            settings_path: settingsPath,
        }

        const settings = await axios({
            "method": "post",
            "url": `${this.endpoint}/settings`,
            "data": settingsReqData,
            "timeout": 5000
        })
        .catch((error: any) => {
            console.error(error);
        });

        return settings;
    }
}