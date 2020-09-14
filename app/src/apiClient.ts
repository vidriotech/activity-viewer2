import axios from "axios";
// eslint-disable-next-line import/no-unresolved
import { PenetrationRequest, ExportingUnit, SettingsRequest, } from "./models/apiModels";


export class APIClient {
    private readonly endpoint: string;

    constructor(endpoint: string) {
        this.endpoint = endpoint;
    }

    async fetchColorMapping(mapping: string) {
        return await axios.get(`${this.endpoint}/color-map/${mapping}`);
    }

    async fetchCoronalSlice(apCoordinate: number) {
        return await axios.get(`${this.endpoint}/slices/coronal/${apCoordinate}`);
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

    async fetchHorizontalSlice(dvCoordinate: number) {
        return await axios.get(`${this.endpoint}/slices/horizontal/${dvCoordinate}`);
    }

    async fetchPenetrations() {
        return await axios.get(`${this.endpoint}/penetrations`);
    }

    async fetchPenetrationVitals(penetrationId: string) {
        return await axios.get(`${this.endpoint}/penetrations/${penetrationId}`);
    }

    async fetchSagittalSlice(lrCoordinate: number) {
        return await axios.get(`${this.endpoint}/slices/sagittal/${lrCoordinate}`);
    }

    async fetchSettings() {
        return await axios.get(`${this.endpoint}/settings`);
    }

    async fetchTimeseries(penetrationId: string, timeseriesId: string) {
        return await axios.get(`${this.endpoint}/penetrations/${penetrationId}/timeseries/${timeseriesId}`);
    }

    async fetchTimeseriesList(penetrationId: string) {
        return await axios.get(`${this.endpoint}/penetrations/${penetrationId}/timeseries`);
    }

    async fetchTimeseriesById(timeseriesId: string) {
        return await axios.get(`${this.endpoint}/timeseries/${timeseriesId}`);
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