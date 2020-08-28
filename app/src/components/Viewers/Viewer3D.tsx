import React from 'react';
import * as _ from 'underscore';

import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';

import { APIClient } from '../../apiClient';
import { BrainViewer } from '../../brainViewer';
import { AVConstants } from '../../constants';

import { ISettingsResponse, IPenetrationData, ICompartmentNode, ICompartment } from '../../models/apiModels';
import { CompartmentTree } from '../../models/compartmentTree';

import { IAesthetics } from '../../viewmodels/aestheticMapping';
import { ICompartmentView } from '../../viewmodels/compartmentViewModel';
import { PenetrationViewModel } from '../../viewmodels/penetrationViewModel';


export interface IViewer3DProps {
    aestheticMappings: IAesthetics[],
    availablePenetrations: IPenetrationData[],
    constants: AVConstants,
    compartmentTree: CompartmentTree,
    frameRate: number,
    isPlaying: boolean,
    loopAnimation: 'once' | 'repeat',
    settings: ISettingsResponse,
    timeMin: number,
    timeMax: number,
    timeStep: number,
    timeVal: number,
    visibleCompartments: ICompartmentView[],
    onUpdateCompartmentViews(compartments: ICompartmentView[]): void,
}

interface IViewer3DState {
    renderWidth: number,
    renderHeight: number,
}

export class Viewer3D extends React.Component<IViewer3DProps, IViewer3DState> {
    private apiClient: APIClient;
    private containerId = 'viewer-container';
    private viewer: BrainViewer;

    constructor(props: IViewer3DProps) {
        super(props);

        this.state = {
            renderWidth: 0,
            renderHeight: 0,
        };

        this.apiClient = new APIClient(this.props.constants.apiEndpoint);
        this.viewer = null;
    }

    private computeDims() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            return { width: 0, height: 0 };
        }

        let width = container.clientWidth;
        let height = width / 1.85; // 1.85:1 aspect ratio

        return { width, height };
    }

    private async createViewer() {
        if (this.viewer !== null) {
            return;
        }

        const { width, height } = this.computeDims();
        const v = new BrainViewer(this.props.constants, this.props.compartmentTree);

        v.container = this.containerId; // div is created in render()
        v.WIDTH = width;
        v.HEIGHT = height;

        v.initialize();
        v.animate();

        this.viewer = v;
    }

    private populateCompartments() {
        const compartmentNodes = this.props.compartmentTree
            .getCompartmentSubset(this.props.settings);

        // create views for all compartments
        let visibleCompartments: ICompartmentView[] = [];
        compartmentNodes.forEach((node: ICompartmentNode) => {
            visibleCompartments.push(
                _.extend(
                    _.pick(node, _.without(_.keys(node), 'children')) as ICompartment,
                    {isVisible: node.id === this.props.constants.rootId}
                )
            );
        });

        this.props.onUpdateCompartmentViews(visibleCompartments);
    }

    private renderPenetrations() {
        this.props.availablePenetrations.forEach((penetration: IPenetrationData) => {
            if (penetration.ids.length == 0) {
                return;
            }

            if (!this.viewer.hasPenetration(penetration.penetrationId)) {
                this.viewer.loadPenetration(penetration);
            }

            // find aesthetics for this penetration
            let aesthetics: IAesthetics = null;
            for (let i = 0; i < this.props.aestheticMappings.length; i++) {
                const mapping = this.props.aestheticMappings[i];
                if (mapping.penetrationId == penetration.penetrationId) {
                    aesthetics = mapping;
                }
            }

            if (aesthetics === null) {
                return;
            }

            // create a view model for this penetration
            const viewModel = new PenetrationViewModel(aesthetics, penetration.ids.length);
            this.viewer.setAesthetics(penetration.penetrationId, viewModel);
        });

        this.viewer.updatePenetrationAesthetics();
    }

    private renderCompartments() {
        if (this.viewer === null) {
            return;
        }

        this.props.visibleCompartments.forEach((compartmentView: ICompartmentView) => {
            this.viewer.setCompartmentVisible(compartmentView.name, compartmentView.isVisible);
        });
    }

    private updateDims() {
        const { width, height } = this.computeDims();
        this.setState({ renderWidth: width, renderHeight: height });

        if (this.viewer !== null) {
            this.viewer.setSize(width, height);
        }
    }

    public componentDidMount() {
        window.addEventListener('resize', () => this.updateDims());

        this.createViewer()
            .then(() => {
                this.populateCompartments();
                this.renderPenetrations();
            });
    }

    public componentDidUpdate(prevProps: Readonly<IViewer3DProps>) {
        if (this.props.timeVal !== prevProps.timeVal) {
            this.viewer.timeVal = this.props.timeVal;
        }
        this.renderCompartments();
        this.renderPenetrations();
    }

    public render() {
        return (
            <Grid container
                  direction='column'
                  spacing={3}
                  style={{ padding: 40 }}
                  id='container-container'>
                <Grid item id={this.containerId} xs />
            </Grid>
        )
    }
}
