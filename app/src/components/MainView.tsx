import React from 'react';

import { ICompartmentView } from '../viewmodels/compartmentViewModel';
import { AVConstants } from '../constants';
import { IPenetration } from '../models/penetrationModel';
import { Viewer3D } from './Viewer3D';
import { ISettingsResponse, ICompartmentNode } from '../models/api';

interface IMainViewProps {
    availablePenetrations: string[],
    compartmentTree: ICompartmentNode,
    constants: AVConstants,
    settings: ISettingsResponse,
    updateCompartments(compartments: string[]): void,
}

interface IMainViewState {
}

export class MainView extends React.Component<IMainViewProps, IMainViewState> {

    public render() {
        const viewer3DProps = {
            availablePenetrations: this.props.availablePenetrations,
            constants: this.props.constants,
            compartmentTree: this.props.compartmentTree,
            settings: this.props.settings,
            updateCompartments: this.props.updateCompartments,
        }

        const style = {width: "100%", height: "100%"};
        return (
            <div style={style}>
                <Viewer3D {...viewer3DProps}/>
            </div>
        )
    }
}