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
import { CompartmentTree } from '../models/compartmentTree';


interface IViewer3DProps {
    availablePenetrations: string[],
    constants: AVConstants,
    compartmentTree: CompartmentTree,
    settings: ISettingsResponse,
    updateCompartments(compartments: string[]): void,
    updatePenetrations(penetrations: string[]): void,
}

interface IViewer3DState {
    displayCompartments: ICompartmentView[],
    loadedCompartments: Set<number>,
}

export class Viewer3D extends React.Component<IViewer3DProps, IViewer3DState> {
    constructor(props: IViewer3DProps) {
        super(props);

        this.state = {
            displayCompartments: [],
            loadedCompartments: new Set<number>(),
        };
    }

    private viewer: BrainViewer = null;

    private async createViewer() {
        if (this.viewer !== null)
            return;

        const v = new BrainViewer(this.props.constants, this.props.compartmentTree);
        v.container = 'viewer-container'; // create this div in render()
        v.initialize();
        this.viewer = v;
    }

    private populateCompartments() {
        let cSettings = this.props.settings.compartment;

        let compartments = this.props.compartmentTree.getCompartmentsByDepth(cSettings.maxDepth);
        let compartmentViews: ICompartmentView[] = [];

        // remove compartments in `exclude`
        cSettings.exclude.forEach((compId: string) => {
            let idx = compartments.map((comp) => comp.name).indexOf(compId); // search names
            if (idx === -1) {
                idx = compartments.map((comp) => comp.acronym).indexOf(compId); // search acronyms
            }

            if (idx !== -1) {
                compartments.splice(idx, 1);
            }
        });

        // add compartments in `include`
        cSettings.include.forEach((compId: string) => {
            let comp = this.props.compartmentTree.getCompartmentByName(compId);
            if (comp === null) {
                comp = this.props.compartmentTree.getCompartmentByAcronym(compId);
            }

            if (comp !== null) {
                compartments.push(comp);
            }
        });
        
        // create views for all compartments
        compartments.forEach((comp) => {
            compartmentViews.push({
                compartment: comp,
                isVisible: comp.id === this.props.constants.rootId
            });
        });

        this.setState({displayCompartments: compartmentViews}, () => {
            this.props.updateCompartments(compartments.map((comp) => comp.name));
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

    public componentDidMount() {
        this.populateCompartments();
    }

    public render() {
        return <div id='viewer-container'/>
    }
}
