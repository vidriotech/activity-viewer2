import React from 'react';
import * as _ from 'underscore';

import { Grid, Slider } from '@material-ui/core';

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
    settings: ISettingsResponse,
    visibleCompartments: ICompartmentView[],
    updateCompartments(compartments: ICompartmentView[]): void,
}

interface IViewer3DState {
    renderWidth: number,
    renderHeight: number,
    timeMin: number,
    timeMax: number,
}

export class Viewer3D extends React.Component<IViewer3DProps, IViewer3DState> {
    private apiClient: APIClient;
    private containerId = 'viewer-container';
    private penetrationViewModelsMap: Map<string, PenetrationViewModel>;
    private viewer: BrainViewer;

    constructor(props: IViewer3DProps) {
        super(props);

        this.state = {
            renderWidth: 0,
            renderHeight: 0,
            timeMin: 0,
            timeMax: 0,
        };

        this.apiClient = new APIClient(this.props.constants.apiEndpoint);
        this.penetrationViewModelsMap = new Map<string, PenetrationViewModel>();
        this.viewer = null;
    }

    private computeDims() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            return { width: 0, height: 0 };
        }

        let width = container.clientWidth;
        let height = 0.75 * width; // 4:3 aspect ratio

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

    private handleSliderChange(_event: any, newValue: number) {
        this.viewer.timeVal = newValue;
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

        this.props.updateCompartments(visibleCompartments);
    }

    private renderPenetrations() {
        let timeMin = 0;
        let timeMax = 0;

        this.props.availablePenetrations.forEach((penetration: IPenetrationData) => {
            if (penetration.stride == 0) {
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

            if (aesthetics.radius !== null) {
                const rTimes = aesthetics.radius.times;
                timeMin = Math.min(timeMin, rTimes[0]);
                timeMax = Math.max(timeMax, rTimes[rTimes.length - 1]);
            }

            if (aesthetics.color !== null) {
                const cTimes = aesthetics.color.times;
                timeMin = Math.min(timeMin, cTimes[0]);
                timeMax = Math.max(timeMax, cTimes[cTimes.length - 1]);
            }

            if (aesthetics.opacity !== null) {
                const oTimes = aesthetics.opacity.times;
                timeMin = Math.min(timeMin, oTimes[0]);
                timeMax = Math.max(timeMax, oTimes[oTimes.length - 1]);
            }

            // create a view model for this penetration
            const viewModel = new PenetrationViewModel(aesthetics, penetration.ids.length);
            this.viewer.setAesthetics(penetration.penetrationId, viewModel);
        });

        if (timeMin !== this.state.timeMin || timeMax !== this.state.timeMax) {
            this.setState({ timeMin, timeMax });
        }
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

    public componentDidUpdate() {
        this.renderCompartments();
        this.renderPenetrations();
    }

    public render() {
        // return (<div id={this.containerId}>
        //     <div id="timestep">t = 0</div>
        //     </div>)
        let marks = [{
            label: '',
            value: this.state.timeMin
        }];

        if (this.state.timeMin < this.state.timeMax) {
            marks[0].label = this.state.timeMin.toFixed(2);
            marks.push({
                label: this.state.timeMax.toFixed(2),
                value: this.state.timeMax
            });

            if (this.state.timeMin < 0 && 0 < this.state.timeMax) {
                marks.push({
                    label: '0',
                    value: 0,
                });
            }
        }

        return (<Grid container
                      direction='column'
                      item xs={8}
                      spacing={3}
                      style={{ padding: 20 }}>
            <Grid item id={this.containerId} xs />
            <Grid item xs>
                <Slider min={this.state.timeMin}
                        max={this.state.timeMax}
                        step={(this.state.timeMax - this.state.timeMin) / 1000}
                        marks={marks}
                        onChange={this.handleSliderChange.bind(this)}
                />
            </Grid>
        </Grid>)
    }
}
