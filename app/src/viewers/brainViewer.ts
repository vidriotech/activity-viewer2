import * as THREEM from 'three';
import { Object3D, BufferGeometry, Float32BufferAttribute } from 'three';

const THREE = require('three');
require("three-obj-loader")(THREE);
const OrbitControls = require("ndb-three-orbit-controls")(THREE);

import * as _ from 'underscore';

// eslint-disable-next-line import/no-unresolved
import { AVConstants } from "../constants";

// eslint-disable-next-line import/no-unresolved
import { Epoch, PenetrationData } from "../models/apiModels";

// eslint-disable-next-line import/no-unresolved
import { AestheticMapping } from "../viewmodels/aestheticMapping";
// eslint-disable-next-line import/no-unresolved
import { ICompartmentNodeView } from "../viewmodels/compartmentViewModel";
// eslint-disable-next-line import/no-unresolved
import { PenetrationViewModel } from "../viewmodels/penetrationViewModel";
// eslint-disable-next-line import/no-unresolved
import {BaseViewer} from "./baseViewer";

export class BrainViewer extends BaseViewer {
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
    private epochSlider: THREE.Object3D = null;
    private epochMarker: THREE.Object3D = null;

    private penetrationPointsMap: Map<string, THREE.Points>;

    public flip = true; // flip y axis

    constructor(constants: AVConstants, epochs: Epoch[]) {
        super(constants, epochs);

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

    private makeEpochSlider(labelWidth: number, fontSize: number): THREE.Object3D {
        if (this.epochs.length === 0) {
            return null;
        }

        const epochs = this.epochs;

        const root = new THREE.Object3D();
        const labelBaseScale = 0.01;

        const canvas = this.makeLabelCanvas(labelWidth, fontSize, epochs);
        const texture = new THREE.CanvasTexture(canvas);

        texture.minFilter = THREE.LinearFilter;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;

        const labelMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
        });
        const labels = new THREE.Sprite(labelMaterial);
        root.add(labels);

        labels.scale.x = canvas.width * labelBaseScale;
        labels.scale.y = canvas.height * labelBaseScale;

        this.camera.add(root);
        root.position.set(0, -3.5, -10);

        // time slider
        const geometry: THREE.BufferGeometry = new THREE.BufferGeometry();

        return root;
    }

    private makeLabelCanvas(baseWidth: number, fontSize: number, epochs: Epoch[]) {
        const borderSize = 2;
        const ctx = document.createElement('canvas').getContext('2d');
        const font =  `${fontSize}px sans-serif`;
        ctx.font = font;
        // measure how long the name will be
        const textWidth = ctx.measureText(name).width;

        const doubleBorderSize = borderSize * 2;
        const width = baseWidth + doubleBorderSize;
        const height = fontSize + doubleBorderSize;
        ctx.canvas.width = width;
        ctx.canvas.height = height;

        // need to set font again after resizing canvas
        ctx.font = font;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';

        // fill in epochs
        const startTime = epochs[0].bounds[0];
        const totalTime = epochs[epochs.length-1].bounds[1] - startTime;

        epochs.forEach((epoch, idx) => {
            ctx.fillStyle = idx % 2 === 0 ? 'grey' : 'black';

            const startX = width * (epoch.bounds[0] - startTime) / totalTime;
            const epochWidth = width * (epoch.bounds[1] - epoch.bounds[0]) / totalTime;

            ctx.fillRect(startX, 0, epochWidth, height);

            ctx.fillStyle = 'white';
            ctx.fillText(epoch.label, (2*startX + epochWidth) / 2, height / 2);
        });

        // scale to fit but don't stretch
        const scaleFactor = Math.min(1, baseWidth / textWidth);
        ctx.translate(width / 2, height / 2);
        ctx.scale(scaleFactor, 1);

        return ctx.canvas;
    }

    private rgb2Hex(val: number[]): string {
        return `${val[0].toString(16)}${val[1].toString(16)}${val[2].toString(16)}`;
    }

    private updateSlider() {
        if (this.epochSlider === null) {
            return;
        }

        const startTime = this.epochs[0].bounds[0];
        if (this.timeVal === startTime) {
            this.camera.remove(this.epochSlider);
            this.epochSlider = this.makeEpochSlider(1200, 28);
        } else {
            const timeRange = this.epochs[this.epochs.length - 1].bounds[1] - startTime;

            const canvasTexture = (this.epochSlider.children[0] as THREE.Sprite).material.map;
            const ctx = canvasTexture.image.getContext('2d');
            ctx.fillStyle = 'red';
            ctx.fillRect(0, 3 * canvasTexture.image.height / 4, ctx.canvas.width * (this.timeVal - startTime)/timeRange, canvasTexture.image.height / 4);

            (this.epochSlider.children[0] as THREE.Sprite).material.needsUpdate = true;
        }
    }

    public animate(timestamp: number = null) {
        if (!this.lastTimestamp) {
            this.lastTimestamp = timestamp;
            this.render();
        } else if (timestamp - this.lastTimestamp > 75) {
            this.lastTimestamp = timestamp;
            this.trackControls.update();
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

        // add slider
        this.epochSlider = this.makeEpochSlider(1200, 28);
    }

    public loadPenetration(penetrationData: PenetrationData) {
        const centerPoint = this.constants.centerPoint.map((t: number) => -t);
        const defaultAesthetics: AestheticMapping = {
            penetrationId: penetrationData.penetrationId,
            color: null,
            opacity: null,
            radius: null,
            visible: null,
        };

        const viewModel = new PenetrationViewModel(defaultAesthetics, penetrationData.ids.length);

        const positions = new Float32Array(penetrationData.coordinates.map(t => t + 10 * (Math.random() - 0.5)));
        const colors = viewModel.getColor(0);
        const opacities = viewModel.getOpacity(0);
        const sizes = viewModel.getRadius(0);
        const visible = viewModel.getVisible();

        const geometry: THREE.BufferGeometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setAttribute('opacity', new THREE.Float32BufferAttribute(opacities, 1));
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1).setUsage(THREE.DynamicDrawUsage));
        geometry.setAttribute('visible', new THREE.Float32BufferAttribute(visible, 1));

        const penetration: THREE.Points = new THREE.Points(geometry, this.pointsMaterial);
        penetration.position.set(centerPoint[0], centerPoint[1], centerPoint[2]);

        this.penetrationPointsMap.set(penetrationData.penetrationId, penetration);
        this.setAesthetics(penetrationData.penetrationId, viewModel);

        this.scene.add(penetration);
    }

    public render() {
        this.renderer.render(this.scene, this.camera);
    }

    public updatePenetrationAesthetics() {
        const t = this._timeVal;

        this.penetrationPointsMap.forEach((pointObj, penetrationId, _map) => {
            const viewModel = this.penetrationViewModelsMap.get(penetrationId);
            const colors = viewModel.getColor(t);
            const opacities = viewModel.getOpacity(t);
            const sizes = viewModel.getRadius(t);
            const visible = viewModel.getVisible();

            const geom = pointObj.geometry as BufferGeometry;
            geom.attributes.color = new Float32BufferAttribute(colors, 3);
            geom.attributes.color.needsUpdate = true;

            geom.attributes.opacity = new Float32BufferAttribute(opacities, 1);
            geom.attributes.opacity.needsUpdate = true;

            geom.attributes.size = new Float32BufferAttribute(sizes, 1).setUsage(THREE.DynamicDrawUsage);
            geom.attributes.size.needsUpdate = true;

            geom.attributes.visible = new Float32BufferAttribute(visible, 1);
            geom.attributes.visible.needsUpdate = true;
        });

        this.render();
    }

    public setCompartmentVisible(compartmentNodeView: ICompartmentNodeView) {
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

    public get timeVal() {
        return this._timeVal;
    }

    public set timeVal(t: number) {
        this._timeVal = t;
        this.updateSlider();
        this.updatePenetrationAesthetics();
    }

    public get visibleCompartments() {
        return this._visibleCompartments;
    }
}
