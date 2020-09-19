import axios, {AxiosResponse} from "axios";
import {
    PenetrationRequest,
    ExportingUnit,
    SettingsRequest,
    SliceType,
    SliceData, PenetrationResponse,
// eslint-disable-next-line import/no-unresolved
} from "./models/apiModels";
// eslint-disable-next-line import/no-unresolved
import {ColorLUT} from "./models/colorMap";
// eslint-disable-next-line import/no-unresolved
import {TimeseriesEntries, TimeseriesSummary} from "./models/timeseries";
// eslint-disable-next-line import/no-unresolved
import {AestheticMapping, AestheticParams} from "./models/aestheticMapping";


export class APIClient {
    private readonly endpoint: string;

    constructor(endpoint: string) {
        this.endpoint = endpoint;
    }

    async fetchAestheticMapping(penetrationId: string, params: AestheticParams): Promise<AxiosResponse<AestheticMapping>> {
        return axios({
            method: "POST",
            url: `${this.endpoint}/aesthetics/${penetrationId}`,
            data: params,
            timeout: 5000,
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

    async fetchPenetrations(): Promise<AxiosResponse<PenetrationResponse>> {
        return await axios.get(`${this.endpoint}/penetrations`);
    }

    async fetchPenetrationVitals(penetrationId: string) {
        return await axios.get(`${this.endpoint}/penetrations/${penetrationId}`);
    }

    async fetchSettings() {
        return await axios.get(`${this.endpoint}/settings`);
    }

    async fetchSliceData(sliceType: SliceType, coordinate: number): Promise<AxiosResponse<SliceData>> {
        return await axios.get(`${this.endpoint}/slices/${sliceType}/${coordinate}`);
    }

    async fetchTimeseries(penetrationId: string, timeseriesId: string) {
        return await axios.get(`${this.endpoint}/penetrations/${penetrationId}/timeseries/${timeseriesId}`);
    }

    async fetchTimeseriesList(penetrationId: string) {
        return await axios.get(`${this.endpoint}/penetrations/${penetrationId}/timeseries`);
    }

    async fetchTimeseriesById(timeseriesId: string): Promise<AxiosResponse<TimeseriesEntries>> {
        return await axios.get(`${this.endpoint}/timeseries/${timeseriesId}`);
    }

    async fetchTimeseriesSummary(timeseriesId: string): Promise<AxiosResponse<TimeseriesSummary>> {
        return await axios.get(`${this.endpoint}/timeseries/${timeseriesId}/summary`);
    }

    async fetchUnitStatsById(statId: string) {
        return await axios.get(`${this.endpoint}/unit-stats/${statId}`);
    }

    async setPenetrations(dataPaths: string[]) {
        const penReqData: PenetrationRequest = {
            // eslint-disable-next-line @typescript-eslint/camelcase
            data_paths: dataPaths,
        };

        return axios({
            "method": "post",
            "url": `${this.endpoint}/penetrations`,
            "data": penReqData,
            "timeout": 15000
        });
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