import React from 'react';
import { APIClient } from '../apiClient';
import { AVConstants } from '../constants';
import { IPenetrationResponse, ISettingsResponse, ICompartmentNode } from '../models/api';
import { Viewer3D } from './Viewer3D';
import { IPenetration } from '../models/penetrationModel';
import { MainView } from './MainView';


export interface IAppProps {
    compartmentTree: ICompartmentNode,
    constants: AVConstants,
    initialPenetrations: string[],
    settings: ISettingsResponse,
}

export interface IAppState {
    availablePenetrations: string[],
    displayCompartments: string[],
}

export class App extends React.Component<IAppProps, IAppState> {
    private apiClient: APIClient;

    constructor(props: IAppProps) {
        super(props)
        this.state = {
            availablePenetrations: this.props.initialPenetrations,
            displayCompartments: [],
        };

        this.apiClient = new APIClient(this.props.constants.apiEndpoint);
    }

    public addPenetration(pen: string) {
        let penetrations = this.state.availablePenetrations.slice();
        let idx = penetrations.indexOf(pen);

        if (idx === -1) {
            penetrations.push(pen);
            this.setState({availablePenetrations: penetrations})
        }
    }

    public removePenetration(pen: string) {
        let penetrations = this.state.availablePenetrations.slice();
        let idx = penetrations.indexOf(pen)

        if (idx !== -1) {
            penetrations.splice(idx, 1);
            this.setState({availablePenetrations: penetrations})
        }
    }

    public updateCompartments(compartments: string[]) {
        this.setState({displayCompartments: compartments});
    }

    public render() {
        let mainViewProps = {
            availablePenetrations: this.state.availablePenetrations,
            compartmentTree: this.props.compartmentTree,
            constants: this.props.constants,
            settings: this.props.settings,
            updateCompartments: this.updateCompartments,
        }

        const penList = Array.from(this.state.availablePenetrations).map((pen: string) => {
            <li>{pen}</li>
        })
        return <div>
            <h1>Mesoscale Activity Viewer</h1>
            <h2>Loaded penetrations:</h2>
            <ul>{penList}</ul>
            <MainView {...mainViewProps} />
        </div>;
    }
}
