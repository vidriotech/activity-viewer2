import {BufferGeometry, Float32BufferAttribute} from "three";
import * as _ from "lodash";

// eslint-disable-next-line import/no-unresolved
import {AestheticMapping} from "../models/aestheticMapping";
// eslint-disable-next-line import/no-unresolved
import {AVConstants} from "../constants";
// eslint-disable-next-line import/no-unresolved
import {Epoch, PenetrationData, SliceData} from "../models/apiModels";
// eslint-disable-next-line import/no-unresolved
import {PenetrationViewModel} from "../viewmodels/penetrationViewModel";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const THREE = require("three");

// eslint-disable-next-line @typescript-eslint/no-var-requires
const OrbitControls = require("ndb-three-orbit-controls")(THREE);

export abstract class BaseViewer {
    protected constants: AVConstants;
    protected epochs: Epoch[];
    protected penetrationViewModelsMap: Map<string, PenetrationViewModel>;

    // animation
    protected animFrameHandle: number = null;
    protected timeMax = 0;
    protected timeMin = 0;
    protected timeStep = 0.01;
    protected _timeVal = 0;

    public HEIGHT: number;
    public WIDTH: number;
    public container = 'container';

    protected backgroundColor = 0xffffff;
    protected cameraPosition: [number, number, number];
    protected fov = 45;

    protected renderer: THREE.WebGLRenderer = null;
    protected scene: THREE.Scene = null;
    protected camera: THREE.PerspectiveCamera = null;
    protected orbitControls: any = null;

    protected lastTimestamp: number = null;

    protected pointsMaterial: THREE.PointsMaterial;
    protected epochLabels: THREE.Object3D = null;
    protected epochSlider: THREE.Line = null;

    protected penetrationPointsMap: Map<string, THREE.Points<BufferGeometry>>;

    public flip = true; // flip y axis

    protected constructor(constants: AVConstants, epochs: Epoch[]) {
        this.constants = constants;
        this.epochs = epochs.sort((e1, e2) => e1.bounds[0] - e2.bounds[0]);
        this.cameraPosition = [0, 0, 0];

        this.penetrationPointsMap = new Map<string, THREE.Points<BufferGeometry>>();
        this.penetrationViewModelsMap = new Map<string, PenetrationViewModel>();
    }

    protected initCamera(): void {
        const cameraPosition = this.cameraPosition[2];
        this.camera = new THREE.PerspectiveCamera(this.fov, this.WIDTH / this.HEIGHT, 1, cameraPosition * 5);
        this.scene.add(this.camera);
        this.camera.position.set(...this.cameraPosition);

        if (this.flip) {
            this.camera.up.setY(-1);
        }
    }

    protected initEpochLabels(): void {
        if (this.epochs.length === 0) {
            return null;
        }

        const labelWidth = 1200;
        const fontSize = 28;

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

        this.epochLabels = root;
    }

    protected initEpochSlider(): void {
        if (this.timeMax === this.timeMin || this.epochLabels === null) {
            return;
        }

        const sprite = this.epochLabels.children[0] as THREE.Sprite;

        const sliderWidth = sprite.scale.x;
        const nSteps = Math.round((this.timeMax - this.timeMin) / this.timeStep);
        const stepSize = sliderWidth / nSteps;

        let step = -(sliderWidth - 0.01) / 2;
        const positions = new Float32Array(nSteps * 3);
        for (let i = 0; i < positions.length; i += 3) {
            positions[i] = step;
            positions[i + 1] = 0;
            positions[i + 2] = 0;

            step += stepSize;
        }

        const geometry: THREE.BufferGeometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));

        const material = new THREE.LineBasicMaterial({
            color: 0xff0000,
            linewidth: 100,
        });

        const line = new THREE.Line(geometry, material);
        line.position.set(0, -sprite.scale.y / 2, 0.001);
        line.name = "slider";

        this.epochLabels.add(line);
        this.epochSlider = line;
    }

    protected initLights(): void {
        let light = new THREE.DirectionalLight(0xffffff);
        light.position.set(0, 0, this.cameraPosition[2] / 2);
        this.scene.add(light);

        light = new THREE.DirectionalLight(0xffffff);
        light.position.set(0, 0, -this.cameraPosition[2] / 2);
        this.scene.add(light);
    }

    protected initOrbitControls(): void {
        // add controls
        this.orbitControls = new OrbitControls(this.camera, document.getElementById(this.container));
        this.orbitControls.addEventListener("change", this.render.bind(this));
    }

    protected initRenderer(): void {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true, // to get smoother output
        });

        this.renderer.setClearColor(this.backgroundColor, 1);
        this.renderer.setSize(this.WIDTH, this.HEIGHT);
    }

    protected initScene(): void {
        this.scene = new THREE.Scene();
    }

    protected makeLabelCanvas(baseWidth: number, fontSize: number, epochs: Epoch[]): HTMLCanvasElement {
        const borderSize = 2;
        const ctx = document.createElement('canvas').getContext('2d');
        const font = `${fontSize}px sans-serif`;
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
        const startTime = Math.min(this.timeMin, epochs[0].bounds[0]);
        const totalTime = Math.max(this.timeMax, epochs[epochs.length - 1].bounds[1]) - startTime;

        epochs.forEach((epoch, idx) => {
            ctx.fillStyle = idx % 2 === 0 ? 'grey' : 'black';

            const startX = width * (epoch.bounds[0] - startTime) / totalTime;
            const epochWidth = width * (epoch.bounds[1] - epoch.bounds[0]) / totalTime;

            ctx.fillRect(startX, 0, epochWidth, height);

            ctx.fillStyle = 'white';
            ctx.fillText(epoch.label, (2 * startX + epochWidth) / 2, height / 2);
        });

        // scale to fit but don't stretch
        const scaleFactor = Math.min(1, baseWidth / textWidth);
        ctx.translate(width / 2, height / 2);
        ctx.scale(scaleFactor, 1);

        return ctx.canvas;
    }

    protected resetSlider(): void {
        this.camera.remove(this.epochLabels);

        this.initEpochLabels();
        this.initEpochSlider();
    }

    protected rgb2Hex(rgb: [number, number, number]): string {
        return `${rgb[0].toString(16)}${rgb[1].toString(16)}${rgb[2].toString(16)}`;
    }

    protected updateTimeSlider(): void {
        if (this.epochSlider === null) {
            return;
        }

        const step = (this._timeVal - this.timeMin) / this.timeStep;
        const geom = this.epochSlider.geometry as BufferGeometry;
        geom.setDrawRange(0, step);
    }

    public animate(timestamp: number = null): void {
        if (!this.lastTimestamp) {
            this.lastTimestamp = timestamp;
        } else if (timestamp - this.lastTimestamp > 75) {
            this.lastTimestamp = timestamp;
            this.orbitControls.update();
        }

        this.render();
        this.animFrameHandle = window.requestAnimationFrame(this.animate.bind(this));
    }

    public destroy(): void {
        if (this.animFrameHandle !== null) {
            window.cancelAnimationFrame(this.animFrameHandle);
        }

        document.getElementById(this.container).removeChild(this.renderer.domElement);
    }

    public hasPenetration(penetrationId: string): boolean {
        return this.penetrationPointsMap.has(penetrationId);
    }

    public initialize(): void {
        this.initRenderer();
        this.initScene();
        this.initCamera();
        this.initLights();
        this.initOrbitControls();
        this.initEpochLabels();
        this.initEpochSlider();

        document.getElementById(this.container).appendChild(this.renderer.domElement);
    }

    public loadPenetration(penetrationData: PenetrationData) {
        const centerPoint = this.constants.centerPoint.map((t: number) => -t) as [number, number, number];
        const defaultAesthetics: AestheticMapping = {
            penetrationId: penetrationData.penetrationId,
            color: null,
            opacity: null,
            radius: null,
            visibility: null,
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

        const penetration: THREE.Points<BufferGeometry> = new THREE.Points(geometry, this.pointsMaterial);
        penetration.position.set(...centerPoint);

        this.penetrationPointsMap.set(penetrationData.penetrationId, penetration);
        this.setAesthetics(penetrationData.penetrationId, viewModel);

        this.scene.add(penetration);
    }

    public render(): void {
        this.renderer.render(this.scene, this.camera);
    }

    public setAesthetics(penetrationId: string, viewModel: PenetrationViewModel): void {
        this.penetrationViewModelsMap.set(
            penetrationId, viewModel // new PenetrationViewModel(aes, nPoints)
        );
    }

    public setSize(width: number, height: number): void {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);

        this.HEIGHT = height;
        this.WIDTH = width;

        this.render();
    }

    public setTime(timeMin: number, timeMax: number, timeStep: number, timeVal: number): void {
        this.timeMin = timeMin;
        this.timeMax = timeMax;
        this.timeStep = timeStep;

        this.resetSlider();

        this.timeVal = timeVal;
    }

    public updatePenetrationAesthetics(): void {
        const t = this._timeVal;

        this.penetrationPointsMap.forEach((pointObj, penetrationId, _map) => {
            const viewModel = this.penetrationViewModelsMap.get(penetrationId);
            const colors = viewModel.getColor(t);
            const opacities = viewModel.getOpacity(t);
            const sizes = viewModel.getRadius(t);
            const visible = viewModel.getVisible();

            const geom = pointObj.geometry;
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

    public set timeVal(t: number) {
        this._timeVal = t;
        this.updatePenetrationAesthetics();
        this.updateTimeSlider();
    }

    // private orientPlane(plane: THREE.) {
//     // Assumes that "plane" is the source THREE.Plane object.
//     // Normalize the plane
//             var normPlane=new THREE.Plane().copy(plane).normalize();
//     // Rotate from (0,0,1) to the plane's normal
//             var quaternion=new THREE.Quaternion()
//                 .setFromUnitVectors(new THREE.Vector3(0,0,1),normPlane.normal);
//     // Calculate the translation
//             var position=new THREE.Vector3(
//                 -normPlane.constant*normPlane.normal.x,
//                 -normPlane.constant*normPlane.normal.y,
//                 -normPlane.constant*normPlane.normal.z);
//             // Create the matrix
//             var matrix=new THREE.Matrix4()
//                 .compose(position,quaternion,new THREE.Vector3(1,1,1));
//     // Transform the geometry (assumes that "geometry"
//     // is a THREE.PlaneGeometry or indeed any
//     // THREE.Geometry)
//             geometry.applyMatrix(matrix);
// }

    // public renderPlane(): void {
    //     if (this.sliceData !== null) {
    //         const loader = new THREE.TextureLoader();
    //         loader.load(this.sliceData.annotationImage, (texture: THREE.Texture) => {
    //             let width: number, height: number;
    //             let cameraPosition: [number, number, number];
    //             let x = 900, y = -45, z = -900;
    //
    //             const geometry = new THREE.PlaneBufferGeometry(width, height);
    //             const material = new THREE.MeshBasicMaterial({
    //                 map: texture,
    //                 side: THREE.DoubleSide
    //             });
    //             const mesh = new THREE.Mesh(geometry, material);
    //
    //             switch (this.sliceType) {
    //                 case "coronal":
    //                     width = this.constants.SagittalMax;
    //                     height = this.constants.HorizontalMax;
    //                     x = 900;
    //                     cameraPosition = [-20000, y, z];
    //                     mesh.rotateOnAxis()
    //                     break;
    //                 case "horizontal":
    //                     width = this.constants.CoronalMax;
    //                     height = this.constants.SagittalMax;
    //                     y = -45;
    //                     cameraPosition = [x, -20000, z];
    //                     break;
    //                 case "sagittal":
    //                     width = this.constants.CoronalMax;
    //                     height = this.constants.HorizontalMax;
    //                     z = -900;
    //                     cameraPosition = [x, y, -20000];
    //                     break;
    //             }
    //
    //             this.scene.add(mesh);
    //             mesh.position.set(x, y, z);
    //
    //             this.camera.position.set(...cameraPosition);
    //
    //             this.render();
    //         });
    //     }
    // }
    //
    // public setSlices(sliceData: SliceImageData, sliceType: SliceType) {
    //     this.sliceData = sliceData;
    //     this.sliceType = sliceType;
    //     this.renderPlane();
    // }
}
