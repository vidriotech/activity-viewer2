import * as THREEM from 'three';
import { Object3D, AnimationClip, AnimationMixer, BufferGeometry, Float32BufferAttribute } from 'three';

const THREE = require('three');
require("three-obj-loader")(THREE);
const OrbitControls = require("ndb-three-orbit-controls")(THREE);

import * as _ from 'underscore';

import { AVConstants } from './constants';

import { IPenetrationData } from './models/apiModels';

import { IAesthetics } from './viewmodels/aestheticMapping';
import { ICompartmentNodeView } from './viewmodels/compartmentViewModel';
import { PenetrationViewModel } from './viewmodels/penetrationViewModel';

export class BrainViewer {
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

    public HEIGHT: number;
    public WIDTH: number;
    public container = 'container';
    public flip = true; // flip y axis

    private penetrationPointsMap: Map<string, THREE.Points>;
    private penetrationViewModelsMap: Map<string, PenetrationViewModel>;

    //animation
    private _timeVal: number = 0;

    constructor(constants: AVConstants) {
        this.constants = constants;

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

    private loadCompartment(compartmentNodeView: ICompartmentNodeView) {
        const name = compartmentNodeView.name;

        if (this.loadedCompartments.includes(name)) {
            return;
        }

        let compartmentId = compartmentNodeView.id;
        let compartmentColor = '#' + this.rgb2Hex(compartmentNodeView.rgbTriplet);

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

    private rgb2Hex(val: number[]): string {
        return `${val[0].toString(16)}${val[1].toString(16)}${val[2].toString(16)}`;
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
    }

    public loadPenetration(penetrationData: IPenetrationData) {
        const centerPoint = this.constants.centerPoint.map((t: number) => -t);
        const defaultAesthetics: IAesthetics = {
            penetrationId: penetrationData.penetrationId,
            color: null,
            opacity: null,
            radius: null,
            visible: null,
        };

        const viewModel = new PenetrationViewModel(defaultAesthetics, penetrationData.ids.length);

        let positions = new Float32Array(penetrationData.coordinates.map(t => t + 10 * (Math.random() - 0.5)));
        let colors = viewModel.getColor(0);
        let opacities = viewModel.getOpacity(0);
        let sizes = viewModel.getRadius(0);
        let visible = viewModel.getVisible();

        let geometry: THREE.BufferGeometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setAttribute('opacity', new THREE.Float32BufferAttribute(opacities, 1));
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1).setUsage(THREE.DynamicDrawUsage));
        geometry.setAttribute('visible', new THREE.Float32BufferAttribute(visible, 1));

        let penetration: THREE.Points = new THREE.Points(geometry, this.pointsMaterial);
        penetration.position.set(centerPoint[0], centerPoint[1], centerPoint[2]);

        this.penetrationPointsMap.set(penetrationData.penetrationId, penetration);
        this.penetrationViewModelsMap.set(penetrationData.penetrationId, viewModel);

        this.scene.add(penetration);
    }

    public render() {
        this.renderer.render(this.scene, this.camera);
    }

    public setAesthetics(penetrationId: string, aesthetics: PenetrationViewModel) {
        this.penetrationViewModelsMap.set(
            penetrationId, aesthetics // new PenetrationViewModel(aes, nPoints)
        );
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
                console.log(compartmentNodeView);
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
        this.updatePenetrationAesthetics();
    }

    public get visibleCompartments() {
        return this._visibleCompartments;
    }
}
