import {Mesh, Object3D} from 'three';
import * as _ from 'underscore';

// eslint-disable-next-line import/no-unresolved
import {AVConstants} from "../constants";

// eslint-disable-next-line import/no-unresolved
import {Epoch} from "../models/apiModels";

// eslint-disable-next-line import/no-unresolved
// eslint-disable-next-line import/no-unresolved
import {ICompartmentNodeView} from "../viewmodels/compartmentViewModel";
// eslint-disable-next-line import/no-unresolved
// eslint-disable-next-line import/no-unresolved
import {BaseViewer} from "./baseViewer";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const THREE = require("three");

// eslint-disable-next-line @typescript-eslint/no-var-requires
require("three-obj-loader")(THREE);

export class BrainViewer extends BaseViewer {
    private loadedCompartments: string[] = [];
    private _visibleCompartments: string[] = [];

    constructor(constants: AVConstants, epochs: Epoch[]) {
        super(constants, epochs);

        this.cameraPosition = [0, 0, -20000];
    }

    private loadCompartment(compartmentNodeView: ICompartmentNodeView) {
        const name = compartmentNodeView.name;

        if (this.loadedCompartments.includes(name)) {
            return;
        }

        const compartmentId = compartmentNodeView.id;
        const compartmentColor = '#' + this.rgb2Hex(compartmentNodeView.rgbTriplet);

        const loader = new THREE.OBJLoader();
        const path = `${this.constants.apiEndpoint}/mesh/${compartmentId}`;

        loader.load(path, (obj: Object3D) => {
            const makeMaterial = (child: Mesh) => {
                child.material = new THREE.ShaderMaterial({
                    uniforms: {
                        color: {type: 'c', value: new THREE.Color(compartmentColor)},
                    },
                    vertexShader: this.constants.compartmentVertexShader,
                    fragmentShader: this.constants.compartmentFragmentShader,
                    transparent: true,
                    depthTest: true,
                    depthWrite: false,
                    side: THREE.DoubleSide,
                });
            };

            obj.traverse(makeMaterial.bind(this))

            obj.name = name;
            const [x, y, z] = this.constants.centerPoint.map((t: number) => -t);
            obj.position.set(x, y, z);

            this.loadedCompartments.push(name);
            this._visibleCompartments.push(name);
            this.scene.add(obj);
        });
    }

    public initialize() {
        // create a new renderer
        super.initialize();
    }

    public setCompartmentVisible(compartmentNodeView: ICompartmentNodeView): void {
        // loading sets visible as a side effect
        const name = compartmentNodeView.name;
        const visible = compartmentNodeView.isVisible;

        if (visible && !this.loadedCompartments.includes(name)) {
            this.loadCompartment(compartmentNodeView);
        } else { // if not visible, don't bother loading, otherwise update an already-loaded compartment
            const compartmentObj = this.scene.getObjectByName(name);

            if (compartmentObj) {
                compartmentObj.visible = compartmentNodeView.isVisible;

                if (compartmentNodeView.isVisible) {
                    this._visibleCompartments.push(name);
                } else {
                    this._visibleCompartments = _.without(this._visibleCompartments, name);
                }
            }
        }
    }

    public get visibleCompartments() {
        return this._visibleCompartments;
    }
}
