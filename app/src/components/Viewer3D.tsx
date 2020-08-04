import React from 'react';

const axios = require('axios');

import { BrainViewer } from '../brainViewer';
import { AVConstants } from '../constants';
import { ICompartmentNode, IPenetrationData, ISettingsResponse } from '../models/api';
import { ICompartment } from '../models/compartmentModel';
import { IPenetration } from '../models/penetrationModel';
import { PointViewModel } from '../viewmodels/pointViewModel';
import { ICompartmentView } from '../viewmodels/compartmentViewModel';
import { APIClient } from '../apiClient';


interface IViewer3DProps {
    availablePenetrations: string[],
    constants: AVConstants,
    compartmentTree: ICompartmentNode,
    settings: ISettingsResponse,
    updateCompartments(compartments: string[]): void,
}

interface IViewer3DState {
    displayCompartments: ICompartmentView[],
    loadedCompartments: Set<number>,
}

export class Viewer3D extends React.Component<IViewer3DProps, IViewer3DState> {
    constructor(props: IViewer3DProps) {
        super(props);

        this.apiClient = new APIClient(this.props.constants.apiEndpoint);

        this.state = {
            displayCompartments: [],
            loadedCompartments: new Set<number>(),
        };
    }

    private apiClient: APIClient;
    private viewer: BrainViewer = null;

    private async createViewer() {
        if (this.viewer !== null)
            return;

        const v = new BrainViewer();
        v.container = 'viewer-container'; // create this div in render()
        v.initialize();
        this.viewer = v;
    }

    private createPoint(point: PointViewModel) {

    }

    private populateCompartments() {
        let cSettings = this.props.settings.compartment;
        let compartmentMap = new Map<number, ICompartment>();
        let compartmentList: ICompartmentView[] = [];
        let compartmentNames = new Set<string>();

        // add root compartment
        const rootCompartment = {
            id: this.props.constants.rootId,
            acronym: 'root',
            name: 'root',
            rgb_triplet: this.props.constants.rootColor
        };

        compartmentMap.set(
            this.props.constants.rootId,
            rootCompartment
        );

        compartmentList.push({
            compartment: rootCompartment,
            isVisible: true
        });

        compartmentNames.add('root');

        // add compartments by maxDepth
        let currentQueue = [this.props.compartmentTree];
        let nextQueue: ICompartmentNode[] = [];
        let node;

        for (let depth=0; depth<cSettings.maxDepth; depth++) {
            while (currentQueue.length > 0) {
                node = currentQueue.splice(0, 1)[0];

                compartmentNames.add(node.name);
                compartmentMap.set(
                    node.id,
                    {
                        id: node.id,
                        acronym: node.acronym,
                        name: node.name,
                        rgb_triplet: node.rgb_triplet
                    }
                );
                nextQueue = nextQueue.concat(node.children);
            }

            nextQueue = currentQueue;
        }

        // remove compartments in `exclude`
        cSettings.exclude.forEach((el: string) => {
            let comp = this.searchCompartmentsByString(el);
            if (el !== null) {
                compartmentNames.delete(comp.name);
                compartmentMap.delete(comp.id);
            }
        });

        // add compartments in `include`
        cSettings.include.forEach((el: string) => {
            let comp = this.searchCompartmentsByString(el);
            if (el !== null) {
                compartmentNames.add(comp.name);

                compartmentMap.set(comp.id, {
                    id: comp.id,
                    name: comp.name,
                    acronym: comp.acronym,
                    rgb_triplet: comp.rgb_triplet
                });
            }
        });
        compartmentMap.forEach((val, key) => {
            if (key === this.props.constants.rootId)
                return;

            compartmentList.push({
                compartment: val,
                isVisible: false
            });
        });

        // this.props.updateCompartments(compartmentNames);
        this.setState({displayCompartments: compartmentList}, () => {
            this.createViewer();
            this.renderCompartments();
            this.renderPenetrations();
        });
    }

    private renderPenetrations() {
        if (this.viewer === null)
            return;

        this.props.availablePenetrations.forEach((penetrationId: string) => {
            this.viewer.loadPenetration(penetrationId);
        });
    }

    private renderCompartments() {
        if (this.viewer === null){
            return;
        }

        this.state.displayCompartments.forEach((comp: ICompartmentView) => {
            if (!comp.isVisible)
                return;

            let compName = comp.compartment.name;
            let compId = comp.compartment.id;

            // load if necessary
            if (!this.state.loadedCompartments.has(compId)) {
                let rgb = comp.compartment.rgb_triplet;
                let color = `${rgb[0].toString(16)}${rgb[1].toString(16)}${rgb[2].toString(16)}`;
                this.viewer.loadCompartment(compName, compId, color);
                this.state.loadedCompartments.add(compId);
            }

            this.viewer.setCompartmentVisible(compName, true);
        });
    }

    private searchCompartmentsByString(cName: string): ICompartmentNode {
        let root = this.props.compartmentTree;
        let queue = [root];
        let node = null;

        while (queue.length > 0) {
            node = queue.splice(0, 1)[0]; // pop from queue
            if (node.name === cName || node.acronym === cName) {
                return node;
            }

            queue = queue.concat(node.children);
        }

        return null;
    }

    public componentDidMount() {
        this.populateCompartments();
    }

    public render() {
        return <div id='viewer-container'/>
    }
}