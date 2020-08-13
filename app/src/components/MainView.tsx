import React from 'react';
import {Container, Grid, Input, List} from "semantic-ui-react";

import { AVConstants } from '../constants';
import { ISettingsResponse } from '../models/apiModels';
import { CompartmentTree } from '../models/compartmentTree';
import { ICompartmentView } from '../viewmodels/compartmentViewModel';

import { CompartmentListContainer, ICompartmentListContainerProps } from './Viewer3D/CompartmentListContainer';
import { CompartmentNode } from './Viewer3D/CompartmentNode';
import { Viewer3D, IViewer3DProps } from './Viewer3D/Viewer3D';
import { PenetrationControlPanel, IPenetrationControlPanelProps } from './PenetrationControlPanel';

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
    rootNode: CompartmentNode,
    subsetOnly: boolean
}

export class MainView extends React.Component<IMainViewProps, IMainViewState> {
    constructor(props: IMainViewProps) {
        super(props);

        // const rootNode = this.props.compartmentTree.getCompartmentNodeByName('root');
        const rootNode = this.props.compartmentTree.getCompartmentSubsetTree(this.props.settings);
        this.state = {
            rootNode: new CompartmentNode(rootNode, true),
            subsetOnly: true,
        }
    }

    private onToggleSubsetOnly() {
        const subsetOnly = !this.state.subsetOnly;
        let rootNode;
        if (subsetOnly) {
            rootNode = new CompartmentNode(this.props.compartmentTree.getCompartmentSubsetTree(this.props.settings), true);
        } else {
            rootNode = new CompartmentNode(this.props.compartmentTree.getCompartmentNodeByName('root'), true);;
        }

        this.setState({subsetOnly: subsetOnly, rootNode: rootNode});
    }

    public render() {
        const viewer3DProps: IViewer3DProps = {
            availablePenetrations: this.props.availablePenetrations,
            constants: this.props.constants,
            compartmentTree: this.props.compartmentTree,
            settings: this.props.settings,
            visibleCompartments: this.props.visibleCompartments,
            updateCompartments: this.props.updateCompartments,
            updatePenetrations: this.props.updatePenetrations,
        };

        const compartmentListContainerProps: ICompartmentListContainerProps = {
            compartmentTree: this.props.compartmentTree,
            rootNode: this.state.rootNode,
            visibleCompartments: this.props.visibleCompartments,
            onToggleSubsetOnly: this.onToggleSubsetOnly.bind(this),
            onUpdateSelectedCompartments: this.props.onUpdateSelectedCompartments,
        };

        const penetrationControlPanelProps: IPenetrationControlPanelProps = {
            availablePenetrations: this.props.availablePenetrations,
            constants: this.props.constants,
        }

        const style = {width: "100%", height: "100%"};
        return (
            <div style={style}>
                <Grid>
                    <Grid.Row>
                        <Grid.Column width={16}>
                            <PenetrationControlPanel {...penetrationControlPanelProps}/>
                        </Grid.Column>
                    </Grid.Row>
                    <Grid.Row>
                        <Grid.Column width={8}>
                            <Grid.Row>
                                <Viewer3D {...viewer3DProps} />
                                <Grid.Column width={4}>
                                    <CompartmentListContainer {...compartmentListContainerProps}/>
                                </Grid.Column>
                            </Grid.Row>
                        </Grid.Column>
                    </Grid.Row>
                </Grid>
            </div>
        );
    }
}