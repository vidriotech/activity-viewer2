import React from 'react';
import { Grid } from "semantic-ui-react";

import { AVConstants } from '../constants';
import { ISettingsResponse, IPenetrationData } from '../models/apiModels';
import { CompartmentTree } from '../models/compartmentTree';
import { ICompartmentView } from '../viewmodels/compartmentViewModel';
import { IAesthetics } from '../viewmodels/aestheticMapping';

import { CompartmentListContainer, ICompartmentListContainerProps } from './Viewer3D/CompartmentListContainer';
import { CompartmentNode } from './Viewer3D/CompartmentNode';
import { Viewer3D, IViewer3DProps } from './Viewer3D/Viewer3D';
import { PenetrationControlPanel, IPenetrationControlPanelProps } from './PenetrationControlPanel';

export interface IMainViewProps {
    availablePenetrations: IPenetrationData[],
    compartmentTree: CompartmentTree,
    visibleCompartments: ICompartmentView[],
    constants: AVConstants,
    settings: ISettingsResponse,
    onUpdateSelectedCompartments(added: string[], removed: string[]): void,
    updateCompartments(compartments: ICompartmentView[]): void,
}

interface IMainViewState {
    aestheticMappings: IAesthetics[],
    rootNode: CompartmentNode,
    subsetOnly: boolean,
}

export class MainView extends React.Component<IMainViewProps, IMainViewState> {
    constructor(props: IMainViewProps) {
        super(props);

        // const rootNode = this.props.compartmentTree.getCompartmentNodeByName('root');
        const rootNode = this.props.compartmentTree.getCompartmentSubsetTree(this.props.settings);
        this.state = {
            aestheticMappings: [],
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

    private handleTimeseriesAestheticChange(mapping: IAesthetics) {
        console.log(mapping);
        let mappings = this.state.aestheticMappings.slice();

        let idx = -1;
        for (let i = 0; i < mappings.length; i++) {
            let m = mappings[i];
            if (m.penetrationId === mapping.penetrationId) {
                idx = i;
                break;
            }
        }

        if (idx === -1) {
            mappings.push(mapping);
        } else {
            mappings[idx] = mapping;
        }

        this.setState({aestheticMappings: mappings});
    }

    public render() {
        const viewer3DProps: IViewer3DProps = {
            aestheticMappings: this.state.aestheticMappings,
            availablePenetrations: this.props.availablePenetrations,
            constants: this.props.constants,
            compartmentTree: this.props.compartmentTree,
            settings: this.props.settings,
            visibleCompartments: this.props.visibleCompartments,
            updateCompartments: this.props.updateCompartments,
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
            onUpdateTimeseriesAesthetic: this.handleTimeseriesAestheticChange.bind(this),
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