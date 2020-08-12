import React from 'react';
import * as _ from 'underscore';

import { APIClient } from '../apiClient';
import { BrainViewer } from '../brainViewer';
import { AVConstants } from '../constants';

import { ISettingsResponse, IPenetrationData, ICompartmentNode, ICompartment } from '../models/apiModels';
import { CompartmentTree } from '../models/compartmentTree';
import { IPoint } from '../models/pointModel';
import { IPenetration } from '../models/penetrationModel';

import { ICompartmentView } from '../viewmodels/compartmentViewModel';


interface IViewer3DProps {
    availablePenetrations: string[],
    constants: AVConstants,
    compartmentTree: CompartmentTree,
    settings: ISettingsResponse,
    visibleCompartments: ICompartmentView[],
    updateCompartments(compartments: ICompartmentView[]): void,
    updatePenetrations(penetrations: string[]): void,
}

interface IViewer3DState {}

export class Viewer3D extends React.Component<IViewer3DProps, IViewer3DState> {
    private apiClient: APIClient;
    private viewer: BrainViewer;

    constructor(props: IViewer3DProps) {
        super(props);

        this.apiClient = new APIClient(this.props.constants.apiEndpoint);
        this.viewer = null;
    }

    private async createViewer() {
        if (this.viewer !== null) {
            return;
        }

        const v = new BrainViewer(this.props.constants, this.props.compartmentTree);
        v.container = 'viewer-container'; // create this div in render()
        v.initialize();
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

        this.props.updateCompartments(visibleCompartments);
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
                let vcNames = visibleCompartments.map(c => c.name);

                // populate penetration with loaded points
                let penetration: IPenetration ={
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

                    // make the compartment this point resides in visible
                    const compartmentName = compartment.name;
                    const vcIdx = vcNames.indexOf(compartmentName);
                    if (vcIdx === -1) {
                        visibleCompartments.push(_.extend(compartment, {isVisible: true}));
                    } else {
                        visibleCompartments[idx].isVisible = true;
                    }

                    penetration.points.push(point);
                }

                this.viewer.loadPenetration(penetration);
                this.props.updateCompartments(visibleCompartments);
            });
        });
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

    public componentDidMount() {
        this.createViewer();
        this.populateCompartments();
        this.loadPenetrations();
    }

    public componentDidUpdate() {
        this.renderCompartments();
        this.renderPenetrations();
    }

    public render() {
        return <div id='viewer-container' />
    }
}
