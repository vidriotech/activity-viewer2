import React from 'react';
import * as _ from 'underscore';

import { AVConstants } from '../constants';
import { ISettingsResponse } from '../models/apiModels';
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
    constructor(props: IAppProps) {
        super(props)
        this.state = {
            availablePenetrations: this.props.initialPenetrations,
            visibleCompartments: [
                _.extend(this.props.compartmentTree.getCompartmentNodeByName('root'), {isVisible: true})],
        };
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
        const compartmentNames = compartmentViews.map((c: ICompartmentView) => c.name);

        // add and make visible new compartments
        added.forEach((name: string) => {
            const idx = compartmentNames.indexOf(name);
            if (idx === -1) {
                const compartment = this.props.compartmentTree.getCompartmentByName(name);
                if (compartment !== null) {
                    compartmentViews.push(_.extend(compartment, {isVisible: true}));
                }
            } else {
                compartmentViews[idx].isVisible = true;
            }
        });

        removed.forEach((name: string) => {
            const idx = compartmentNames.indexOf(name);
            console.log(name);
            console.log(idx);
            if (idx === -1) {
                const compartment = this.props.compartmentTree.getCompartmentByName(name);
                compartmentViews.push(_.extend(compartment, {isVisible: false}));
            } else {
                compartmentViews[idx].isVisible = false;
                console.log(compartmentViews[idx]);
            }
        });

        this.updateCompartmentViews(compartmentViews);
    }

    public updateCompartmentViews(compartmentViews: ICompartmentView[]) {
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
            updateCompartments: this.updateCompartmentViews.bind(this),
            updatePenetrations: this.updatePenetrations.bind(this),
        }
        
        return (<div>
            <h1>MAP Viewer</h1>
            <MainView {...mainViewProps} />
        </div>);
    }
}
