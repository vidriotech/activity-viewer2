import React from 'react';
import { APIClient } from '../apiClient';
import { AVConstants } from '../constants';
import { ISettingsResponse } from '../models/api';
import { MainView } from './MainView';
import { CompartmentTree } from '../models/compartmentTree';
import { ICompartmentView } from '../viewmodels/compartmentViewModel';


export interface IAppProps {
    compartmentTree: CompartmentTree,
    constants: AVConstants,
    initialPenetrations: string[],
    settings: ISettingsResponse,
}

export interface IAppState {
    availablePenetrations: string[],
    visibleCompartments: ICompartmentView[],
}

export class App extends React.Component<IAppProps, IAppState> {
    private apiClient: APIClient;

    constructor(props: IAppProps) {
        super(props)
        this.state = {
            availablePenetrations: this.props.initialPenetrations,
            visibleCompartments: [{
                compartment: this.props.compartmentTree.getCompartmentNodeByName('root'),
                isVisible: true,
            }],
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

    private onUpdateSelectedCompartments(added: string[], removed: string[]) {
        let compartmentViews = this.state.visibleCompartments.slice();
        const compartmentNames = compartmentViews.map((c: ICompartmentView) => c.compartment.name);

        // add and make visible new compartments
        added.forEach((name: string) => {
            const idx = compartmentNames.indexOf(name);
            console.log(name);
            console.log(idx);
            if (idx === -1) {
                const compartment = this.props.compartmentTree.getCompartmentByName(name);
                console.log(compartment);
                compartmentViews.push({
                    compartment: compartment,
                    isVisible: true
                });
            } else {
                compartmentViews[idx].isVisible = true;
                console.log(compartmentViews[idx]);
            }
        });

        removed.forEach((name: string) => {
            const idx = compartmentNames.indexOf(name);
            console.log(name);
            console.log(idx);
            if (idx === -1) {
                const compartment = this.props.compartmentTree.getCompartmentByName(name);
                console.log(compartment);
                compartmentViews.push({
                    compartment: this.props.compartmentTree.getCompartmentByName(name),
                    isVisible: false
                });
            } else {
                compartmentViews[idx].isVisible = false;
                console.log(compartmentViews[idx]);
            }
        });

        this.updateCompartments(compartmentViews);
    }

    public updateCompartments(compartmentViews: ICompartmentView[]) {
        this.setState({visibleCompartments: compartmentViews});
    }

    public updatePenetrations(penetrations: string[]) {
        this.setState({availablePenetrations: penetrations});
    }

    public render() {
        let mainViewProps = {
            availablePenetrations: this.state.availablePenetrations,
            compartmentTree: this.props.compartmentTree,
            visibleCompartments: this.state.visibleCompartments,
            constants: this.props.constants,
            settings: this.props.settings,
            onUpdateSelectedCompartments: this.onUpdateSelectedCompartments.bind(this),
            updateCompartments: this.updateCompartments.bind(this),
            updatePenetrations: this.updatePenetrations.bind(this),
        }

        const penList = this.state.availablePenetrations.map((pen: string) => {
            return <li key={pen}>{pen}</li>
        });
        
        return (<div>
            <h1>Mesoscale Activity Viewer</h1>
            <h2>Loaded penetrations:</h2>
            <ul>{penList}</ul>
            <MainView {...mainViewProps} />
        </div>);
    }
}
