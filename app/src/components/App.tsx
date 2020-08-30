import React from 'react';
import * as _ from 'underscore';

import Typography from '@material-ui/core/Typography';

import { APIClient } from '../apiClient';
import { AVConstants } from '../constants';

import { CompartmentTree } from '../compartmentTree';
import { ISettingsResponse, IPenetrationData, IPenetrationResponse } from '../models/apiModels';

import { MainView, IMainViewProps } from './MainView';


export interface IAppProps {
    compartmentTree: CompartmentTree,
    constants: AVConstants,
    settings: ISettingsResponse,
}

export interface IAppState {
    availablePenetrations: IPenetrationData[],
}

export class App extends React.Component<IAppProps, IAppState> {
    private apiClient: APIClient;

    constructor(props: IAppProps) {
        super(props)
        this.state = {
            availablePenetrations: []
        };

        this.apiClient = new APIClient(this.props.constants.apiEndpoint);
    }

    public componentDidMount() {
        this.apiClient.fetchPenetrations()
            .then((res: any) => res.data)
            .then((data: IPenetrationResponse) => {
                this.setState({availablePenetrations: data.penetrations});
            })
            .catch((err: Error) => {
                console.error(err);
                window.alert(err.message);
            });
    }

    public render() {
        let mainViewProps: IMainViewProps = {
            availablePenetrations: this.state.availablePenetrations,
            compartmentTree: this.props.compartmentTree,
            constants: this.props.constants,
            settings: this.props.settings,
        }
        
        return (<div>
            <Typography variant='h3' component='h3'>
                Mesoscale Activity Viewer
            </Typography>
            <MainView {...mainViewProps} />
        </div>);
    }
}
