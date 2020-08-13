import React from 'react';
import { Container } from 'semantic-ui-react';

import { APIClient } from '../apiClient';
import { AVConstants } from '../constants';
import { IPenetrationTimeseriesValuesResponse } from '../models/apiModels';

export interface ITimeseriesSelectorProps {
    constants: AVConstants,
    penetrationId: string,
    timeseriesId: string,
}

interface ITimeseriesSelectorState {
    aesthetic: string,
    data: number[],
    stride: number,
    transformMin: number,
    transformMinAllowable: number,
    transformMax: number,
    transformMaxAllowable: number,
}

export class TimeseriesSelector extends React.Component<ITimeseriesSelectorProps, ITimeseriesSelectorState> {
    private apiClient: APIClient;

    constructor(props: ITimeseriesSelectorProps) {
        super(props);

        this.state = {
            aesthetic: 'Radius',
            data: [],
            stride: 0,
            transformMin: 0,
            transformMinAllowable: 0,
            transformMax: 0,
            transformMaxAllowable: 0,
        };

        this.apiClient = new APIClient(this.props.constants.apiEndpoint);
    }

    private fetchData() {
        this.apiClient.fetchTimeseries(this.props.penetrationId, this.props.timeseriesId)
        .then((res: any) => res.data)
        .then((res: IPenetrationTimeseriesValuesResponse) => {
            const times = res.data.slice(0, res.stride);
            const values = res.data.slice(res.stride);
            const valueMin = Math.min(...values);
            const valueMax = Math.max(...values);

            console.log(`${valueMin}, ${valueMax}`);

            this.setState({ data: res.data, stride: res.stride }, () => {
                console.log(this.state);
            });
        })
        .catch((err: Error) => {
            console.error(err);
        });
    }

    public componentDidMount() {
        this.fetchData();
    }

    public componentDidUpdate(prevProps: Readonly<ITimeseriesSelectorProps>) {
        if (prevProps.penetrationId !== this.props.penetrationId) {     
            this.fetchData();
        }
    }

    public render() {
        let control = <Container></Container>;

        switch (this.state.aesthetic) {
            case 'Radius':

            case 'Color':
            case 'Opacity':
                
            default:
                console.log('default');
        }

        return control;
    }
}
