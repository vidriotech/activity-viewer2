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
    constructor(constants: AVConstants, compartmentTree: CompartmentTree) {
        this.constants = constants;
        this.compartmentTree = compartmentTree;
        this.apiClient = new APIClient(this.constants.apiEndpoint);
    }

    private apiClient: APIClient;
    private compartmentTree: CompartmentTree;
    private constants: AVConstants;

    private loadedCompartments: string[] = [];
    private _visibleCompartments: string[] = [];

    public HEIGHT = window.innerHeight; // height of canvas
    public WIDTH = window.innerWidth; // width of canvas
    public container = 'container';
    public flip = true; // flip y axis
    public radiusScaleFactor = 1;
    private backgroundColor = 0xffffff;
    private fov = 45;

    private renderer: THREE.WebGLRenderer = null;
    private scene: THREE.Scene = null;
    private camera: THREE.PerspectiveCamera = null;

    private trackControls: any = null;

    private sphereMaterial = new THREE.MeshBasicMaterial({
        color: 0x0080ff
    });
    private sphereGeometry = new THREE.SphereGeometry(40);

    public rgb2Hex(val: number[]): string {
        return `${val[0].toString(16)}${val[1].toString(16)}${val[2].toString(16)}`;
    }

    render = function () {
        this.renderer.render(this.scene, this.camera);
    };

    initialize = function() {
        // create a new renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true, // to get smoother output
        });

        this.renderer.setClearColor(this.backgroundColor, 1);
        this.renderer.setSize(this.WIDTH, this.HEIGHT);

        document.getElementById(this.container).appendChild(this.renderer.domElement);

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

        // add controls
        this.trackControls = new OrbitControls(this.camera, document.getElementById(this.container));
        this.trackControls.addEventListener('change', this.render.bind(this));
    };

    createPoint = function(point: IPoint) {
        const pointObj = new THREE.Object3D();

        let mesh = new THREE.Mesh(
            this.sphereGeometry,
            this.sphereMaterial
        );
        mesh.position.x = point.x;
        mesh.position.y = point.y;
        mesh.position.z = point.z;

        pointObj.add(mesh);
        return pointObj;
    };

    loadCompartment = function (name: string) {
        // console.log(`loading ${name}`);
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
    };

    loadPenetration = function(penetration: IPenetration) {
        const centerPoint = this.constants.centerPoint.map((t: number) => -t);

        for (let i = 0; i < penetration.points.length; i++) {
            const pointObj = this.createPoint(penetration.points[i]);
            pointObj.position.set(...centerPoint);
            this.scene.add(pointObj);
        }
    };

    setCompartmentVisible = function (name: string, visible: boolean) {
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
    };

    public get visibleCompartments() {
        return this._visibleCompartments;
    }
}
