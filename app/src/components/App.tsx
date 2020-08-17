import React from 'react';
import * as _ from 'underscore';

import { AVConstants } from '../constants';
import { ISettingsResponse, IPenetrationData } from '../models/apiModels';
import { MainView, IMainViewProps } from './MainView';
import { CompartmentTree } from '../models/compartmentTree';
import { ICompartmentView } from '../viewmodels/compartmentViewModel';


export interface IAppProps {
    compartmentTree: CompartmentTree,
    constants: AVConstants,
    initialPenetrations: IPenetrationData[],
    settings: ISettingsResponse,
}

export interface IAppState {
    availablePenetrations: IPenetrationData[],
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
            if (idx === -1) {
                const compartment = this.props.compartmentTree.getCompartmentByName(name);
                compartmentViews.push(_.extend(compartment, {isVisible: false}));
            } else {
                compartmentViews[idx].isVisible = false;
            }
        });

        this.updateCompartmentViews(compartmentViews);
    }

    public updateCompartmentViews(compartmentViews: ICompartmentView[]) {
        this.setState({visibleCompartments: compartmentViews});
    }

    public render() {
        let mainViewProps: IMainViewProps = {
            availablePenetrations: this.state.availablePenetrations,
            compartmentTree: this.props.compartmentTree,
            visibleCompartments: this.state.visibleCompartments,
            constants: this.props.constants,
            settings: this.props.settings,
            onUpdateSelectedCompartments: this.onUpdateSelectedCompartments.bind(this),
            updateCompartments: this.updateCompartmentViews.bind(this),
        }
        
        return (<div>
            <h1>MAP Viewer</h1>
            <MainView {...mainViewProps} />
        </div>);
    }
}
