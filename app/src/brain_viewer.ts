import * as THREEM from 'three';
import { Object3D } from 'three';
const THREE = require('three');
require("three-obj-loader")(THREE);
const OrbitControls = require("ndb-three-orbit-controls")(THREE);

export const SagittalLimit = 11400;
export const HorizontalLimit = 8000;
export const CoronalLimit = 13200;

export class BrainViewer {
    public HEIGHT = window.innerHeight; // height of canvas
    public WIDTH = window.innerWidth; // width of canvas
    public container = 'container';
    public flip = true; // flip y axis
    public radius_scale_factor = 1;
    
    private centerpoint = [SagittalLimit / 2, HorizontalLimit / 2, CoronalLimit / 2];
    private backgroundColor = 0xffffff;
    private fov = 45;

    private renderer: THREE.WebGLRenderer = null;
    private scene: THREE.Scene = null;
    private camera: THREE.PerspectiveCamera = null;

    private trackControls: any = null;

    init = function() {
        // create a new renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,	// to get smoother output
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

    render = function () {
        this.renderer.render(this.scene, this.camera);
    };

    loadCompartment = function (id: string, cid: number, color: string) {
        const loader = new THREE.OBJLoader();    
        const path = `http://localhost:3030/mesh/${cid}`;
    
        loader.load(path, (obj: Object3D) => {
            obj.traverse(function (child: any) {
                child.material = new THREE.ShaderMaterial({
                    uniforms: {
                        color: {type: 'c', value: new THREE.Color('#' + color)},
                    },
                    vertexShader: `
                    #line 585
                    varying vec3 normal_in_camera;
                    varying vec3 view_direction;
    
                    void main() {
                        vec4 pos_in_camera = modelViewMatrix * vec4(position, 1.0);
                        gl_Position = projectionMatrix * pos_in_camera;
                        normal_in_camera = normalize(mat3(modelViewMatrix) * normal);
                        view_direction = normalize(pos_in_camera.xyz);
                    }
                `,
                    fragmentShader: `
                    #line 597
                    uniform vec3 color;
                    varying vec3 normal_in_camera;
                    varying vec3 view_direction;
    
                    void main() {
                        // Make edges more opaque than center
                        float edginess = 1.0 - abs(dot(normal_in_camera, view_direction));
                        float opacity = clamp(edginess - 0.30, 0.0, 0.5);
                        // Darken compartment at the very edge
                        float blackness = pow(edginess, 4.0) - 0.3;
                        vec3 c = mix(color, vec3(0,0,0), blackness);
                        gl_FragColor = vec4(c, opacity);
                    }
                `,
                    transparent: true,
                    depthTest: true,
                    depthWrite: false,
                    side: THREE.DoubleSide,
                });
            });
    
            obj.name = id;
            obj.position.set(-this.centerpoint[0], -this.centerpoint[1], -this.centerpoint[2]);
    
            this.scene.add(obj);
        });
    };

    setCompartmentVisible = function (id: string, visible: boolean) {
        const compartment = this.scene.getObjectByName(id);

        if (compartment) {
            compartment.visible = visible;
        }
    };
}


