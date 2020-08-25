const axios = require('axios');

import { ISettingsRequest, IPenetrationRequest } from './models/apiModels';


export class APIClient {
    private endpoint: string;

    constructor(endpoint: string) {
        this.endpoint = endpoint;
    }

    async setPenetrations(dataPaths: string[]) {
        let penReqData: IPenetrationRequest = {
            data_paths: dataPaths,
        };

        return await axios({
            'method': 'post',
            'url': `${this.endpoint}/penetrations`,
            'data': penReqData,
            'timeout': 5000
        });
    }

    async fetchCompartmentTree() {
        return await axios.get(`${this.endpoint}/compartments`);
    }

    async fetchPenetrations() {
        return await axios.get(`${this.endpoint}/penetrations`);
    }

    async fetchPenetrationVitals(penetrationId: string) {
        return await axios.get(`${this.endpoint}/penetrations/${penetrationId}`);
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

    async setSettings(settingsPath: string) {
        let settingsReqData: ISettingsRequest = {
            settings_path: settingsPath,
        }

        let settings = await axios({
            'method': 'post',
            'url': `${this.endpoint}/settings`,
            'data': settingsReqData,
            'timeout': 5000
        })
        .catch((error: any) => {
            console.error(error);
        });

        return settings;
    }
}