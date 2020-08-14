import React from 'react';
import * as _ from 'underscore';

import { APIClient } from '../../apiClient';
import { BrainViewer } from '../../brainViewer';
import { AVConstants } from '../../constants';

import { ISettingsResponse, IPenetrationData, ICompartmentNode, ICompartment } from '../../models/apiModels';
import { CompartmentTree } from '../../models/compartmentTree';
import { IPoint } from '../../models/pointModel';
import { IPenetration } from '../../models/penetrationModel';

import { ICompartmentView } from '../../viewmodels/compartmentViewModel';


export interface IViewer3DProps {
    availablePenetrations: string[],
    constants: AVConstants,
    compartmentTree: CompartmentTree,
    settings: ISettingsResponse,
    visibleCompartments: ICompartmentView[],
    updateCompartments(compartments: ICompartmentView[]): void,
    updatePenetrations(penetrations: string[]): void,
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

    private loadPenetrations() {
        if (this.viewer === null) {
            return;
        }

        this.props.availablePenetrations.forEach((penetrationId: string) => {
            this.apiClient.fetchPenetrationVitals(penetrationId)
            .then((res: any) => res.data)
            .then((response: IPenetrationData) => {
                if (response.stride == 0) { // errored out, abort
                    return;
                }

                let visibleCompartments = this.props.visibleCompartments.slice();

                // populate penetration with loaded points
                let penetration: IPenetration = {
                    id: penetrationId,
                    points: []
                };

                // add each point to this penetration
                for (let i = 0; i < response.coordinates.length; i += response.stride) {
                    const idx = i / response.stride;
                    const compartment = response.compartments[idx];

                    if (!compartment) {
                        console.log(response);
                        continue;
                    }

                    const point: IPoint = {
                        id: response.ids[idx],
                        penetrationId: penetrationId,
                        x: response.coordinates[i],
                        y: response.coordinates[i+1],
                        z: response.coordinates[i+2],
                        compartment: compartment,
                    };

                    // make visible the compartment this point resides in
                    // const compartmentName = compartment.name;
                    // const vcIdx = vcNames.indexOf(compartmentName);
                    // if (vcIdx === -1) {
                    //     visibleCompartments.push(_.extend(compartment, {isVisible: true}));
                    // } else {
                    //     visibleCompartments[idx].isVisible = true;
                    // }

                    penetration.points.push(point);
                }

                this.viewer.loadPenetration(penetration);
                this.props.updateCompartments(visibleCompartments);
            });
        });
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
        ;
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
                this.loadPenetrations();
            });
    }

    public componentDidUpdate() {
        this.renderCompartments();
        this.renderPenetrations();
    }

    public render() {
        return <div id={this.containerId} />
                    // style={{border: '1px solid'}}/>
    }
}