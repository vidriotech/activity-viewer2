import * as THREEM from 'three';
import { Object3D, AnimationClip, AnimationMixer, BufferGeometry, Float32BufferAttribute } from 'three';

const THREE = require('three');
require("three-obj-loader")(THREE);
const OrbitControls = require("ndb-three-orbit-controls")(THREE);

import * as _ from 'underscore';

import { AVConstants } from './constants';
import { CompartmentTree } from './models/compartmentTree';
import { IPenetrationData } from './models/apiModels';
import { IAesthetics } from './viewmodels/aestheticMapping';
import { PenetrationViewModel } from './viewmodels/penetrationViewModel';
import { isNaN, times } from 'underscore';

export class BrainViewer {
    private compartmentTree: CompartmentTree;
    private constants: AVConstants;

    private loadedCompartments: string[] = [];
    private _visibleCompartments: string[] = [];
    private backgroundColor = 0xffffff;
    private fov = 45;

    private renderer: THREE.WebGLRenderer = null;
    private scene: THREE.Scene = null;
    private camera: THREE.PerspectiveCamera = null;
    private trackControls: any = null;

    private lastTimestamp: number = null;

    private pointsMaterial: THREE.PointsMaterial;

    public HEIGHT = 0.5 * window.innerHeight;
    public WIDTH = 0.5 * window.innerWidth;
    public container = 'container';
    public flip = true; // flip y axis

    private penetrationPointsMap: Map<string, THREE.Points>;
    private penetrationViewModelsMap: Map<string, PenetrationViewModel>;
    private timeIdx: number = NaN;
    private animTimes: number[] = [];

    constructor(constants: AVConstants, compartmentTree: CompartmentTree) {
        this.constants = constants;
        this.compartmentTree = compartmentTree;

        this.pointsMaterial = new THREE.ShaderMaterial({
            uniforms: {
                pointTexture: { value: new THREE.TextureLoader().load(this.constants.ballTexture) }
            },
            vertexShader: this.constants.pointVertexShader,
            fragmentShader: this.constants.pointFragmentShader,
            depthTest: false,
            transparent: true,
            vertexColors: true
        });

        this.penetrationPointsMap = new Map<string, THREE.Points>();
        this.penetrationViewModelsMap = new Map<string, PenetrationViewModel>();
    }

    private advanceAnimation() {
        if (this.animTimes.length === 0) {
            return;
        }

        if (!isNaN(this.timeIdx)) {
            this.timeIdx = (this.timeIdx + 1) % this.animTimes.length;
        } else {
            this.timeIdx = 0;
        }

        const t = this.animTimes[this.timeIdx];
        this.penetrationPointsMap.forEach((pointObj, penetrationId, _map) => {
            const viewModel = this.penetrationViewModelsMap.get(penetrationId);
            const colors = viewModel.getColor(t);
            const opacities = viewModel.getOpacity(t);
            const sizes = viewModel.getRadius(t);

            const geom = pointObj.geometry as BufferGeometry;
            geom.attributes.color = new Float32BufferAttribute(colors, 3);
            geom.attributes.color.needsUpdate = true;

            geom.attributes.opacity = new Float32BufferAttribute(opacities, 1);
            geom.attributes.opacity.needsUpdate = true;

            geom.attributes.size = new Float32BufferAttribute(sizes, 1).setUsage(THREE.DynamicDrawUsage);
            geom.attributes.size.needsUpdate = true;
        });

        let timestepElem = document.getElementById('timestep');
        timestepElem.innerText = `t = ${t.toFixed(2)}`;
    }

    private loadCompartment(name: string) {
        if (this.loadedCompartments.includes(name)) {
            return;
        }

        let compartmentNode = this.compartmentTree.getCompartmentByName(name);
        if (compartmentNode === null) {
            return;
        }

        let compartmentId = compartmentNode.id;
        let compartmentColor = '#' + this.rgb2Hex(compartmentNode.rgb_triplet);

        const loader = new THREE.OBJLoader();    
        const path = `${this.constants.apiEndpoint}/mesh/${compartmentId}`;
        const that = this;
    
        loader.load(path, (obj: Object3D) => {
            obj.traverse(function (child: any) {
                child.material = new THREE.ShaderMaterial({
                    uniforms: {
                        color: {type: 'c', value: new THREE.Color(compartmentColor)},
                    },
                    vertexShader: that.constants.compartmentVertexShader,
                    fragmentShader: that.constants.compartmentFragmentShader,
                    transparent: true,
                    depthTest: true,
                    depthWrite: false,
                    side: THREE.DoubleSide,
                });
            });
    
            obj.name = name;
            let x, y, z;
            [x, y, z] = this.constants.centerPoint.map((t: number) => -t);
            obj.position.set(x, y, z);

            this.loadedCompartments.push(name);
            this._visibleCompartments.push(name);
            this.scene.add(obj);
        });
    }

    private mergeSorted(arr1: number[], arr2: number[]): number[] {
        let pos1 = 0, pos2 = 0, k = 0;

        let merged = new Array(arr1.length + arr2.length);
        while (k < merged.length) {
            if (pos1 < arr1.length && pos2 < arr2.length) {
                if (arr2[pos2] < arr1[pos1]) {
                    merged[k] = arr2[pos2++];
                } else {
                    merged[k] = arr1[pos1++];
                }
            } else if (pos1 < arr1.length) {
                merged[k] = arr1[pos1++];
            } else {
                merged[k] = arr2[pos2++];
            }

            k++;
        }

        return merged;
    }

    private rgb2Hex(val: number[]): string {
        return `${val[0].toString(16)}${val[1].toString(16)}${val[2].toString(16)}`;
    }

    public animate(timestamp: number = null) {
        if (!this.lastTimestamp) {
            this.lastTimestamp = timestamp;
            this.render();
        } else if (timestamp - this.lastTimestamp > 100) {
            this.lastTimestamp = timestamp;
            this.trackControls.update();
            this.advanceAnimation();
            this.render();
        }

        window.requestAnimationFrame(this.animate.bind(this));
    }

    public hasPenetration(penetrationId: string) {
        return this.penetrationPointsMap.has(penetrationId);
    }

    public initialize() {
        // create a new renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true, // to get smoother output
        });

        this.renderer.setClearColor(this.backgroundColor, 1);
        this.renderer.setSize(this.WIDTH, this.HEIGHT);

        // create a new scene
        this.scene = new THREE.Scene();

        // put a camera in scene
        const cameraPosition = -20000;
        this.camera = new THREE.PerspectiveCamera(this.fov, this.WIDTH / this.HEIGHT, 1, cameraPosition * 5);
        this.scene.add(this.camera);
        this.camera.position.z = cameraPosition;

        if (this.flip) {
            this.camera.up.setY(-1);
        }

        // add lights
        let light = new THREE.DirectionalLight(0xffffff);
        light.position.set(0, 0, 10000);
        this.scene.add(light);

        light = new THREE.DirectionalLight(0xffffff);
        light.position.set(0, 0, -10000);
        this.scene.add(light);

        document.getElementById(this.container).appendChild(this.renderer.domElement);

        // add controls
        this.trackControls = new OrbitControls(this.camera, document.getElementById(this.container));
        this.trackControls.addEventListener('change', this.render.bind(this));
    }

    public loadPenetration(penetrationData: IPenetrationData) {
        const centerPoint = this.constants.centerPoint.map((t: number) => -t);
        const defaultAesthetics: IAesthetics = {
            penetrationId: penetrationData.penetrationId,
            color: null,
            opacity: null,
            radius: null,
        };

        const viewModel = new PenetrationViewModel(defaultAesthetics, penetrationData.ids.length);

        let positions = new Float32Array(penetrationData.coordinates.map(t => t + 10 * (Math.random() - 0.5)));
        let colors = viewModel.getColor(0);
        let opacities = viewModel.getOpacity(0);
        let sizes = viewModel.getRadius(0);

        let geometry: THREE.BufferGeometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setAttribute('opacity', new THREE.Float32BufferAttribute(opacities, 1));
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1).setUsage(THREE.DynamicDrawUsage));

        let penetration: THREE.Points = new THREE.Points(geometry, this.pointsMaterial);
        penetration.position.set(centerPoint[0], centerPoint[1], centerPoint[2]);

        this.penetrationPointsMap.set(penetrationData.penetrationId, penetration);
        this.penetrationViewModelsMap.set(penetrationData.penetrationId, viewModel);

        this.scene.add(penetration);
    }

    public render() {
        this.renderer.render(this.scene, this.camera);
    }

    public setAesthetics(aesthetics: IAesthetics[]) {
        let times: number[] = [];

        aesthetics.forEach(aes => {
            const penetrationId = aes.penetrationId;

            if (!this.hasPenetration(penetrationId)) {
                return;
            }

            // first get all times
            if (aes.radius !== null) {
                times = this.mergeSorted(times, aes.radius.times);
            }

            if (aes.color !== null) {
                times = this.mergeSorted(times, aes.color.times);
            }

            if (aes.opacity !== null) {
                times = this.mergeSorted(times, aes.opacity.times);
            }

            times = _.uniq(times, true); // dedupe

            const penetrationGeom = this.penetrationPointsMap.get(penetrationId).geometry as BufferGeometry;
            const nPoints = penetrationGeom.attributes.position.count;

            this.penetrationViewModelsMap.set(
                penetrationId, new PenetrationViewModel(aes, nPoints)
            );
        });

        if (times.length === 0) {
            return;
        }

        this.animTimes = [];

        let dt = Infinity;
        for (let i = 0; i < times.length - 1; i++) {
            const diff = times[i+1] - times[i]
            dt = Math.min(dt, diff);
        }

        let t = times[0];
        while (t < times[times.length - 1] + dt/2) {
            this.animTimes.push(t);
            t += dt;
        }
    }

    public setCompartmentVisible(name: string, visible: boolean) {
        // loading sets visible as a side effect
        if (visible && !this.loadedCompartments.includes(name)) {
            this.loadCompartment(name);
        } else { // if not visible, don't bother loading, otherwise update an already-loaded compartment
            const compartmentObj = this.scene.getObjectByName(name);

            if (compartmentObj) {
                compartmentObj.visible = visible;

                if (visible) {
                    this._visibleCompartments.push(name);
                } else {
                    const idx = this._visibleCompartments.indexOf(name);
                    if (idx !== -1) {
                        this._visibleCompartments.splice(idx, 1);
                    }
                }
            }
        }
    }

    public setPenetrationVisible(name: string, visible: boolean) {
        if (!this.penetrationPointsMap.has(name)) {
            return;
        }

        const pen = this.penetrationPointsMap.get(name);
        pen.visible = visible;
    }

    public setSize(width: number, height: number) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);

        this.HEIGHT = height;
        this.WIDTH = width;

        this.render();
    }

    public get visibleCompartments() {
        return this._visibleCompartments;
    }
}
