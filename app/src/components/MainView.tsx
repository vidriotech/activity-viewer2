import React from 'react';
import {Container, Input, List} from "semantic-ui-react";

import { AVConstants } from '../constants';
import { ISettingsResponse } from '../models/apiModels';
import { CompartmentTree } from '../models/compartmentTree';
import { ICompartmentView } from '../viewmodels/compartmentViewModel';

import { CompartmentListContainer } from './CompartmentListContainer';
import { CompartmentNode } from './CompartmentNode';
import { Viewer3D } from './Viewer3D';

interface IMainViewProps {
    availablePenetrations: string[],
    compartmentTree: CompartmentTree,
    visibleCompartments: ICompartmentView[],
    constants: AVConstants,
    settings: ISettingsResponse,
    onUpdateSelectedCompartments(added: string[], removed: string[]): void,
    updateCompartments(compartments: ICompartmentView[]): void,
    updatePenetrations(penetrations: string[]): void,
}

interface IMainViewState {
    rootNode: CompartmentNode
}

export class MainView extends React.Component<IMainViewProps, IMainViewState> {
    constructor(props: IMainViewProps) {
        super(props);

        const rootNode = this.props.compartmentTree.getCompartmentNodeByName('root');
        this.state = {
            rootNode: new CompartmentNode(rootNode, true),
        }
    }

    public render() {
        const viewer3DProps = {
            availablePenetrations: this.props.availablePenetrations,
            constants: this.props.constants,
            compartmentTree: this.props.compartmentTree,
            settings: this.props.settings,
            visibleCompartments: this.props.visibleCompartments,
            updateCompartments: this.props.updateCompartments,
            updatePenetrations: this.props.updatePenetrations,
        };

        const compartmentListContainerProps = {
            compartmentTree: this.props.compartmentTree,
            rootNode: this.state.rootNode,
            visibleCompartments: this.props.visibleCompartments,
            onUpdateSelectedCompartments: this.props.onUpdateSelectedCompartments,
        };

        const style = {width: "100%", height: "100%"};
        return (
            <div style={style}>
                <Container>
                    <Viewer3D {...viewer3DProps}/>
                </Container>
                <Container>
                    <CompartmentListContainer {...compartmentListContainerProps} />
                </Container>
            </div>
        )
    }
}