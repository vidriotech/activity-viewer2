const axios = require('axios');

import { ISettingsRequest, IPenetrationRequest } from './models/apiModels';


export class APIClient {
    private endpoint: string;

    constructor(endpoint: string) {
        this.endpoint = endpoint;
    }

    async addPenetrations(dataPaths: string[]) {
        let penReqData: IPenetrationRequest = {
            data_paths: dataPaths,
        };

        let penetrations = await axios({
            'method': 'post',
            'url': `${this.endpoint}/penetrations`,
            'data': penReqData,
            'timeout': 5000
        })
        .catch((error: any) => {
            console.error(error);
        });

        return penetrations;
    }

    async fetchAllTimeseries(penetrationId: string) {
        return await axios.get(`${this.endpoint}/penetrations/${penetrationId}/timeseries`);
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

    async fetchTimeseries(penetrationId: string, timeseriesId: string) {
        return await axios.get(`${this.endpoint}/penetrations/${penetrationId}/timeseries/${timeseriesId}`);
    }

    async fetchSettings() {
        return await axios.get(`${this.endpoint}/settings`);
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