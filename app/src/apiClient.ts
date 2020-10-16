import axios, {AxiosResponse} from "axios";

import {
    AVSettings, CompartmentNodeInterface,
    ExportingUnit,
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
// eslint-disable-next-line import/no-unresolved
import {PenetrationInterface} from "./models/penetration";


export interface AestheticRequest {
    penetrationIds: string[];
    params: AestheticParams;
}

export interface PenetrationIdsResponse {
    penetrationIds: string[];
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

    async fetchCompartmentTree(): Promise<CompartmentNodeInterface> {
        return axios.get(`${this.endpoint}/compartments`)
            .then((res) => res.data); // errors caught by caller
    }

    async fetchExportedData(exportData: ExportingUnit[]): Promise<Blob> {
        const data = {
            data: exportData,
        };

        return axios({
            method: "POST",
            url: `${this.endpoint}/data-file`,
            data: data,
            timeout: 5000,
            responseType: "blob",
        }).then((res: AxiosResponse<Blob>) => res.data);
    }

    async fetchPenetrationIds(): Promise<PenetrationIdsResponse> {
        return await axios.get(`${this.endpoint}/penetrations`)
            .then((res: AxiosResponse<PenetrationIdsResponse>) => res.data);
    }

    async fetchPenetrations(limit: number, page: number): Promise<AxiosResponse<PenetrationResponse>> {
        return await axios.get(`${this.endpoint}/penetrations?page=${page}&limit=${limit}`);
    }

    async fetchPenetrationVitals(penetrationId: string): Promise<PenetrationInterface> {
        return await axios.get(`${this.endpoint}/penetrations/${penetrationId}`)
            .then((res: AxiosResponse<PenetrationInterface>) => res.data);
    }

    async fetchSettings(): Promise<AxiosResponse<AVSettings>> {
        return await axios.get(`${this.endpoint}/settings`);
    }

    async fetchSliceData(sliceType: SliceType, coordinate: number): Promise<AxiosResponse<SliceData>> {
        return await axios.get(`${this.endpoint}/slices?sliceType=${sliceType}&coordinate=${coordinate}`);
    }

    async fetchTimeseriesSummary(timeseriesId: string): Promise<AxiosResponse<TimeseriesSummary>> {
        return await axios.get(`${this.endpoint}/timeseries/${timeseriesId}/summary`);
    }

    async setSettings(settingsPath: string): Promise<AVSettings> {
        const settingsReqData: SettingsRequest = {
            settingsPath: settingsPath,
        }

        return await axios({
            "method": "post",
            "url": `${this.endpoint}/settings`,
            "data": settingsReqData,
            "timeout": 5000
        }).then((res: AxiosResponse<AVSettings>) => res.data);
    }

    async setPenetrationPaths(dataPaths: string[]): Promise<PenetrationIdsResponse> {
        return await axios({
            method: "POST",
            url: `${this.endpoint}/penetrations`,
            data: {dataPaths: dataPaths},
            timeout: 5000
        }).then((res: AxiosResponse<PenetrationIdsResponse>) => res.data);
    }
}
