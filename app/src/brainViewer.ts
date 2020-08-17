import * as THREEM from 'three';
import { Object3D } from 'three';

const THREE = require('three');
require("three-obj-loader")(THREE);
const OrbitControls = require("ndb-three-orbit-controls")(THREE);

import { APIClient } from './apiClient';
import { AVConstants } from './constants';
import { CompartmentTree } from './models/compartmentTree';
import { IPenetration } from './models/penetrationModel';
import { IPoint } from './models/pointModel';

export class BrainViewer {
    private apiClient: APIClient;
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

    private sphereMaterial: THREE.MeshBasicMaterial;
    private sphereGeometry: THREE.SphereGeometry;
    private pointsMaterial: THREE.PointsMaterial;

    public HEIGHT = 0.5 * window.innerHeight;
    public WIDTH = 0.5 * window.innerWidth;
    public container = 'container';
    public flip = true; // flip y axis

    private penetrations: Map<string, Object3D[]>;

    constructor(constants: AVConstants, compartmentTree: CompartmentTree) {
        this.constants = constants;
        this.compartmentTree = compartmentTree;
        this.apiClient = new APIClient(this.constants.apiEndpoint);

        this.sphereMaterial = new THREE.MeshBasicMaterial({
            color: constants.defaultColor
        });
        this.sphereGeometry = new THREE.SphereGeometry(40);
        this.pointsMaterial = new THREE.ShaderMaterial({
            uniforms: {
                // color: { value: new THREE.Color(this.constants.defaultColor), },
                pointTexture: { value: new THREE.TextureLoader().load(this.constants.ballTexture) }
            },
            vertexShader: this.constants.pointVertexShader,
            fragmentShader: this.constants.pointFragmentShader,
            depthTest: false,
            transparent: true,
            vertexColors: true
        });

        this.penetrations = new Map<string, Object3D[]>();
    }

    private rgb2Hex(val: number[]): string {
        return `${val[0].toString(16)}${val[1].toString(16)}${val[2].toString(16)}`;
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

    public animate(timestamp: number = null) {
        // if (!this.lastTimestamp) {
        //     this.lastTimestamp = timestamp;
        //     this.render();
        // } else if (timestamp - this.lastTimestamp > 50) {
        //     this.lastTimestamp = timestamp;
        //     this.trackControls.update();
        //     this.render();
        // }

        window.requestAnimationFrame(this.animate.bind(this));
        this.render();
    }

    public hasPenetration(penetrationId: string) {
        return this.penetrations.has(penetrationId);
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

    public loadPenetration(penetrationData: IPenetration) {
        const centerPoint = this.constants.centerPoint.map((t: number) => -t);

        let geometry: THREE.BufferGeometry = new THREE.BufferGeometry();
        let positions = [];
        let colors = [];
        let sizes = [];
        let color: THREE.Color = new THREE.Color();

        for (let i = 0; i < penetrationData.points.length; i++) {
            const pointObj = penetrationData.points[i];
            positions.push(pointObj.x + 10 * (Math.random() - 0.5),
                           pointObj.y + 10 * (Math.random() - 0.5),
                           pointObj.z + 10 * (Math.random() - 0.5));
            
            color.setRGB(0, 128/255, 1);
            colors.push(color.r, color.g, color.b);
            sizes.push(350);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1).setUsage(THREE.DynamicDrawUsage));

        let penetration: THREE.Points = new THREE.Points(geometry, this.pointsMaterial);
        penetration.position.set(centerPoint[0], centerPoint[1], centerPoint[2]);
        this.scene.add(penetration);
    }

    public render() {
        this.renderer.render(this.scene, this.camera);
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
