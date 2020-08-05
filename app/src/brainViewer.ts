import * as THREEM from 'three';
import { Object3D } from 'three';
const THREE = require('three');
require("three-obj-loader")(THREE);
const OrbitControls = require("ndb-three-orbit-controls")(THREE);

const axios = require('axios');

import { AVConstants } from './constants';
import { IPoint } from './models/pointModel';
import { IPenetration } from './models/penetrationModel';
import { IPenetrationData } from './models/api';
import { APIClient } from './apiClient';
import { CompartmentTree } from './models/compartmentTree';

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
    private visibleCompartments: string[] = [];

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

    private rgb2Hex(val: number[]): string {
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

    loadCompartment = function (id: string, cid: number, color: string) {
        const loader = new THREE.OBJLoader();    
        const path = `${this.constants.apiEndpoint}/mesh/${cid}`;
        const that = this;
    
        loader.load(path, (obj: Object3D) => {
            obj.traverse(function (child: any) {
                child.material = new THREE.ShaderMaterial({
                    uniforms: {
                        color: {type: 'c', value: new THREE.Color('#' + color)},
                    },
                    vertexShader: that.constants.compartmentVertexShader,
                    fragmentShader: that.constants.compartmentFragmentShader,
                    transparent: true,
                    depthTest: true,
                    depthWrite: false,
                    side: THREE.DoubleSide,
                });
            });
    
            obj.name = id;
            let x, y, z;
            [x, y, z] = this.constants.centerPoint.map((t: number) => -t);
            obj.position.set(x, y, z);
    
            this.scene.add(obj);
        });
    };

    loadPenetration = function(penetrationId: string) {
        this.apiClient.fetchPenetrationVitals(penetrationId)
            .then((res: any) => {
                // load penetration coordinates
                let response: IPenetrationData = res.data;
                if (response.stride == 0) // errored out, abort
                    return;

                let x, y, z;
                [x, y, z] = this.constants.centerPoint.map((t: number) => -t);

                // populate penetration with loaded points
                let penetration: IPenetration = {
                    id: penetrationId,
                    points: []
                };
        
                for (let i=0; i<response.coordinates.length; i += response.stride) {
                    const point: IPoint = {
                        id: response.ids[i/response.stride],
                        penetrationId: penetrationId,
                        x: response.coordinates[i],
                        y: response.coordinates[i+1],
                        z: response.coordinates[i+2],
                        compartment: response.compartments[i/response.stride]
                    };

                    // load compartment if not already loaded
                    const compartmentName = point.compartment.name;
                    const compartment = this.scene.getObjectByName(compartmentName);
                    if (!compartment) {
                        console.log(`loading compartment (was ${compartment})`);
                        const compartmentId = point.compartment.id;
                        const rgb_triplet = this.compartmentTree.getCompartmentById(compartmentId).rgb_triplet;
                        const color = this.rgb2Hex(rgb_triplet);
                        this.loadCompartment(compartmentName, compartmentId, color);
                    }

                    // add point to scene
                    let pointObj = this.createPoint(point);
                    this.scene.add(pointObj);
        
                    pointObj.position.set(x, y, z);
                    penetration.points.push(point);
                }
            }).
            catch((err: any) => { console.error(err) });
    };

    setCompartmentVisible = function (id: string, visible: boolean) {
        const compartment = this.scene.getObjectByName(id);

        if (compartment) {
            compartment.visible = visible;
        }
    };
}
